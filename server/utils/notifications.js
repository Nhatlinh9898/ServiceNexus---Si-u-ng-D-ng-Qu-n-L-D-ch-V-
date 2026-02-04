// Real-time Notification System
// Handles in-app notifications, email notifications, and push notifications

const { Pool } = require('pg');
const EventEmitter = require('events');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');

class NotificationSystem extends EventEmitter {
  constructor() {
    super();
    this.db = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'servicenexus',
      user: process.env.DB_USER || 'servicenexus_user',
      password: process.env.DB_PASSWORD || 'servicenexus123',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    this.wsClients = new Map(); // userId -> WebSocket[]
    this.emailTransporter = null;
    this.notificationQueue = [];
    this.isProcessingQueue = false;
    
    this.initialize();
  }

  async initialize() {
    // Initialize email transporter
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      
      console.log('📧 Email transporter initialized');
    }
    
    // Create notifications table if not exists
    await this.createNotificationsTable();
    
    // Start queue processor
    this.startQueueProcessor();
    
    console.log('🔔 Notification system initialized');
  }

  async createNotificationsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT FALSE,
        is_email_sent BOOLEAN DEFAULT FALSE,
        is_push_sent BOOLEAN DEFAULT FALSE,
        priority VARCHAR(20) DEFAULT 'normal',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
    `;
    
    try {
      await this.db.query(createTableQuery);
      console.log('✅ Notifications table created/verified');
    } catch (error) {
      console.error('❌ Failed to create notifications table:', error);
    }
  }

  // Register WebSocket client for real-time notifications
  registerClient(userId, ws) {
    if (!this.wsClients.has(userId)) {
      this.wsClients.set(userId, []);
    }
    
    this.wsClients.get(userId).push(ws);
    
    ws.on('close', () => {
      const clients = this.wsClients.get(userId) || [];
      const index = clients.indexOf(ws);
      if (index > -1) {
        clients.splice(index, 1);
      }
      
      if (clients.length === 0) {
        this.wsClients.delete(userId);
      }
    });
    
    console.log(`🔗 Client registered for user ${userId}. Total clients: ${this.wsClients.size}`);
  }

  // Create notification
  async createNotification(options) {
    const {
      userId,
      organizationId,
      type,
      title,
      message,
      data = {},
      priority = 'normal',
      sendEmail = false,
      sendPush = false,
      expiresIn = null
    } = options;

    try {
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn) : null;
      
      const insertQuery = `
        INSERT INTO notifications (user_id, organization_id, type, title, message, data, priority, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const result = await this.db.query(insertQuery, [
        userId, organizationId, type, title, message, data, priority, expiresAt
      ]);
      
      const notification = result.rows[0];
      
      // Add to queue for processing
      this.notificationQueue.push({
        notification,
        sendEmail,
        sendPush
      });
      
      // Emit event for real-time delivery
      this.emit('notification_created', notification);
      
      return notification;
      
    } catch (error) {
      console.error('❌ Failed to create notification:', error);
      throw error;
    }
  }

  // Send real-time notification to WebSocket clients
  async sendRealtimeNotification(notification) {
    const clients = this.wsClients.get(notification.user_id);
    
    if (clients && clients.length > 0) {
      const message = {
        type: 'notification',
        data: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          createdAt: notification.created_at
        }
      };
      
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
      
      console.log(`📨 Real-time notification sent to user ${notification.user_id}`);
    }
  }

  // Send email notification
  async sendEmailNotification(notification) {
    if (!this.emailTransporter) {
      console.warn('⚠️ Email transporter not configured');
      return false;
    }

    try {
      // Get user email
      const userQuery = 'SELECT email, first_name, last_name FROM users WHERE id = $1';
      const userResult = await this.db.query(userQuery, [notification.user_id]);
      const user = userResult.rows[0];
      
      if (!user || !user.email) {
        console.warn('⚠️ User email not found');
        return false;
      }
      
      const emailHtml = this.generateEmailTemplate(notification, user);
      const emailText = this.generateEmailText(notification, user);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@servicenexus.com',
        to: user.email,
        subject: notification.title,
        text: emailText,
        html: emailHtml,
      };
      
      await this.emailTransporter.sendMail(mailOptions);
      
      // Mark as email sent
      await this.db.query(
        'UPDATE notifications SET is_email_sent = TRUE WHERE id = $1',
        [notification.id]
      );
      
      console.log(`📧 Email notification sent to ${user.email}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      return false;
    }
  }

  // Generate email HTML template
  generateEmailTemplate(notification, user) {
    const baseUrl = process.env.FRONTEND_URL || 'https://servicenexus.com';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ServiceNexus</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>Hello ${user.first_name || 'User'},</p>
            <p>${notification.message}</p>
            <a href="${baseUrl}/notifications" class="button">View Notification</a>
            <p>Thank you for using ServiceNexus!</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2025 ServiceNexus. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate email text template
  generateEmailText(notification, user) {
    return `
      ServiceNexus - ${notification.title}
      
      Hello ${user.first_name || 'User'},
      
      ${notification.message}
      
      Visit your dashboard to view this notification:
      ${process.env.FRONTEND_URL || 'https://servicenexus.com'}/notifications
      
      Thank you for using ServiceNexus!
      
      This is an automated message. Please do not reply to this email.
      © 2025 ServiceNexus. All rights reserved.
    `;
  }

  // Get user notifications
  async getUserNotifications(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      unreadOnly = false,
      type = null,
      priority = null
    } = options;

    try {
      let query = `
        SELECT * FROM notifications 
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (unreadOnly) {
        query += ` AND is_read = FALSE`;
      }

      if (type) {
        query += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      if (priority) {
        query += ` AND priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.db.query(query, params);

      // Get unread count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = $1 AND is_read = FALSE
      `;
      const countResult = await this.db.query(countQuery, [userId]);

      return {
        notifications: result.rows,
        unreadCount: parseInt(countResult.rows[0].count),
        total: result.rows.length
      };

    } catch (error) {
      console.error('❌ Failed to get user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const query = `
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW() 
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      
      const result = await this.db.query(query, [notificationId, userId]);
      
      if (result.rows.length > 0) {
        this.emit('notification_read', result.rows[0]);
        return result.rows[0];
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId) {
    try {
      const query = `
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW() 
        WHERE user_id = $1 AND is_read = FALSE
        RETURNING *
      `;
      
      const result = await this.db.query(query, [userId]);
      
      this.emit('notifications_read_all', { userId, count: result.rows.length });
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      
      const result = await this.db.query(query, [notificationId, userId]);
      
      if (result.rows.length > 0) {
        this.emit('notification_deleted', result.rows[0]);
        return result.rows[0];
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(organizationId, userId = null) {
    try {
      let query = `
        SELECT 
          type,
          priority,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_read = FALSE) as unread,
          COUNT(*) FILTER (WHERE is_email_sent = TRUE) as email_sent,
          COUNT(*) FILTER (WHERE is_push_sent = TRUE) as push_sent
        FROM notifications 
        WHERE organization_id = $1
      `;
      
      const params = [organizationId];
      
      if (userId) {
        query += ` AND user_id = $2`;
        params.push(userId);
      }
      
      query += ` GROUP BY type, priority ORDER BY total DESC`;
      
      const result = await this.db.query(query, params);
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Failed to get notification stats:', error);
      throw error;
    }
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications() {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE expires_at < NOW()
        RETURNING COUNT(*) as deleted_count
      `;
      
      const result = await this.db.query(query);
      const deletedCount = parseInt(result.rows[0].deleted_count);
      
      if (deletedCount > 0) {
        console.log(`🗑️ Cleaned up ${deletedCount} expired notifications`);
      }
      
      return deletedCount;
      
    } catch (error) {
      console.error('❌ Failed to cleanup expired notifications:', error);
      return 0;
    }
  }

  // Start queue processor
  startQueueProcessor() {
    setInterval(async () => {
      if (this.isProcessingQueue || this.notificationQueue.length === 0) {
        return;
      }
      
      this.isProcessingQueue = true;
      
      try {
        const item = this.notificationQueue.shift();
        
        if (item) {
          const { notification, sendEmail, sendPush } = item;
          
          // Send real-time notification
          await this.sendRealtimeNotification(notification);
          
          // Send email if requested
          if (sendEmail) {
            await this.sendEmailNotification(notification);
          }
          
          // Send push notification if requested (future implementation)
          if (sendPush) {
            // TODO: Implement push notifications
            console.log('📱 Push notification not yet implemented');
          }
        }
        
      } catch (error) {
        console.error('❌ Queue processing error:', error);
      } finally {
        this.isProcessingQueue = false;
      }
      
    }, 1000); // Process every second
  }

  // Create system notification
  async createSystemNotification(options) {
    return this.createNotification({
      type: 'system',
      priority: 'high',
      ...options
    });
  }

  // Create service notification
  async createServiceNotification(options) {
    return this.createNotification({
      type: 'service',
      priority: 'normal',
      ...options
    });
  }

  // Create alert notification
  async createAlertNotification(options) {
    return this.createNotification({
      type: 'alert',
      priority: 'high',
      sendEmail: true,
      ...options
    });
  }

  // Create welcome notification
  async createWelcomeNotification(userId, organizationId, userName) {
    return this.createNotification({
      userId,
      organizationId,
      type: 'welcome',
      title: 'Welcome to ServiceNexus!',
      message: `Hello ${userName}! Welcome to ServiceNexus. We're excited to have you on board.`,
      priority: 'normal',
      sendEmail: true
    });
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down notification system...');
    
    // Close WebSocket connections
    this.wsClients.forEach(clients => {
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
    });
    
    // Close email transporter
    if (this.emailTransporter) {
      this.emailTransporter.close();
    }
    
    // Close database connection
    await this.db.end();
    
    console.log('✅ Notification system shut down');
  }
}

// Create singleton instance
const notificationSystem = new NotificationSystem();

module.exports = notificationSystem;
