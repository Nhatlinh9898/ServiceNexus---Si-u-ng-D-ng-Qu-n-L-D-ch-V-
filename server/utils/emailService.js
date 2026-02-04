// Advanced Email Notification System
// Handles email templates, queueing, delivery, and analytics

const nodemailer = require('nodemailer');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class EmailService extends EventEmitter {
  constructor() {
    super();
    this.transporter = null;
    this.queue = [];
    this.isProcessing = false;
    this.templates = new Map();
    this.analytics = {
      sent: 0,
      failed: 0,
      bounced: 0,
      opened: 0,
      clicked: 0
    };
    
    this.initialize();
  }

  async initialize() {
    // Initialize email transporter
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        // DKIM configuration
        dkim: {
          domainName: process.env.EMAIL_DOMAIN,
          keySelector: 'default',
          privateKey: process.env.DKIM_PRIVATE_KEY
        }
      });
      
      // Verify transporter
      await this.transporter.verify();
      console.log('📧 Email transporter initialized and verified');
    } else {
      console.warn('⚠️ Email configuration not found, email service disabled');
    }
    
    // Load email templates
    await this.loadTemplates();
    
    // Start queue processor
    this.startQueueProcessor();
    
    // Start analytics cleanup
    this.startAnalyticsCleanup();
  }

  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/email');
      
      // Load built-in templates
      const builtInTemplates = {
        welcome: {
          subject: 'Welcome to ServiceNexus!',
          html: this.getWelcomeTemplate(),
          text: this.getWelcomeTextTemplate()
        },
        passwordReset: {
          subject: 'Reset Your Password',
          html: this.getPasswordResetTemplate(),
          text: this.getPasswordResetTextTemplate()
        },
        serviceUpdate: {
          subject: 'Service Update',
          html: this.getServiceUpdateTemplate(),
          text: this.getServiceUpdateTextTemplate()
        },
        invoice: {
          subject: 'Invoice from ServiceNexus',
          html: this.getInvoiceTemplate(),
          text: this.getInvoiceTextTemplate()
        },
        alert: {
          subject: 'System Alert',
          html: this.getAlertTemplate(),
          text: this.getAlertTextTemplate()
        }
      };
      
      for (const [name, template] of Object.entries(builtInTemplates)) {
        this.templates.set(name, template);
      }
      
      // Load custom templates from files if they exist
      try {
        const files = await fs.readdir(templatesDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const templatePath = path.join(templatesDir, file);
            const templateData = await fs.readFile(templatePath, 'utf8');
            const template = JSON.parse(templateData);
            this.templates.set(template.name, template);
          }
        }
      } catch (error) {
        // Templates directory doesn't exist, that's okay
      }
      
      console.log(`📄 Loaded ${this.templates.size} email templates`);
      
    } catch (error) {
      console.error('❌ Failed to load email templates:', error);
    }
  }

  // Send email with template
  async sendEmail(options) {
    const {
      to,
      template,
      data = {},
      from = process.env.EMAIL_FROM || 'noreply@servicenexus.com',
      priority = 'normal',
      trackOpens = true,
      trackClicks = true,
      sendAt = null
    } = options;

    if (!this.transporter) {
      console.warn('⚠️ Email transporter not available');
      return { success: false, error: 'Email service not available' };
    }

    try {
      const emailTemplate = this.templates.get(template);
      if (!emailTemplate) {
        throw new Error(`Email template '${template}' not found`);
      }

      // Process template with data
      const processedSubject = this.processTemplate(emailTemplate.subject, data);
      const processedHtml = this.processTemplate(emailTemplate.html, data);
      const processedText = this.processTemplate(emailTemplate.text, data);

      // Add tracking pixels and links if enabled
      const trackedHtml = trackOpens ? this.addOpenTracking(processedHtml, options) : processedHtml;
      const trackedText = trackClicks ? this.addClickTracking(processedText, options) : processedText;

      const mailOptions = {
        from,
        to,
        subject: processedSubject,
        html: trackedHtml,
        text: processedText,
        priority,
        headers: {
          'X-Priority': priority === 'high' ? '1' : priority === 'low' ? '5' : '3',
          'X-Mailer': 'ServiceNexus Email Service',
          'X-Email-Template': template
        }
      };

      // Add to queue or send immediately
      if (sendAt) {
        return this.queueEmail(mailOptions, sendAt);
      } else {
        return this.sendImmediate(mailOptions);
      }

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      this.analytics.failed++;
      return { success: false, error: error.message };
    }
  }

  // Send email immediately
  async sendImmediate(mailOptions) {
    try {
      const result = await this.transporter.sendMail(mailOptions);
      
      this.analytics.sent++;
      
      // Log email sent
      await this.logEmailActivity({
        type: 'sent',
        messageId: result.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject,
        template: mailOptions.headers['X-Email-Template']
      });
      
      this.emit('email_sent', {
        messageId: result.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      this.analytics.failed++;
      
      this.emit('email_failed', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        error: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  // Queue email for later delivery
  async queueEmail(mailOptions, sendAt) {
    const queuedEmail = {
      id: this.generateId(),
      mailOptions,
      sendAt: new Date(sendAt),
      attempts: 0,
      maxAttempts: 3,
      status: 'queued',
      createdAt: new Date()
    };
    
    this.queue.push(queuedEmail);
    
    console.log(`📧 Email queued for delivery at ${sendAt}: ${mailOptions.to}`);
    
    return { success: true, queued: true, id: queuedEmail.id };
  }

  // Process email queue
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      const now = new Date();
      const readyEmails = this.queue.filter(email => 
        email.sendAt <= now && email.status === 'queued'
      );
      
      for (const email of readyEmails) {
        try {
          email.attempts++;
          email.status = 'sending';
          
          const result = await this.sendImmediate(email.mailOptions);
          
          if (result.success) {
            email.status = 'sent';
            email.sentAt = new Date();
            email.messageId = result.messageId;
          } else {
            if (email.attempts >= email.maxAttempts) {
              email.status = 'failed';
              email.failedAt = new Date();
              email.error = result.error;
            } else {
              email.status = 'retry';
              email.nextRetry = new Date(Date.now() + (Math.pow(2, email.attempts) * 60000)); // Exponential backoff
            }
          }
          
        } catch (error) {
          email.status = 'error';
          email.error = error.message;
          email.failedAt = new Date();
        }
      }
      
      // Clean up processed emails
      this.queue = this.queue.filter(email => 
        email.status === 'queued' || 
        email.status === 'retry' || 
        (email.status === 'sent' && Date.now() - email.sentAt.getTime() < 24 * 60 * 60 * 1000) ||
        (email.status === 'failed' && Date.now() - email.failedAt.getTime() < 7 * 24 * 60 * 60 * 1000)
      );
      
    } catch (error) {
      console.error('❌ Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Start queue processor
  startQueueProcessor() {
    setInterval(() => {
      this.processQueue();
    }, 30000); // Process every 30 seconds
  }

  // Process template with data
  processTemplate(template, data) {
    let processed = template;
    
    // Simple template processing (replace {{variable}} with data)
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value);
    }
    
    // Handle conditional blocks
    processed = processed.replace(/{{#if (\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
      return data[condition] ? content : '';
    });
    
    // Handle loops
    processed = processed.replace(/{{#each (\w+)}}(.*?){{\/each}}/gs, (match, arrayName, content) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        let itemContent = content;
        for (const [key, value] of Object.entries(item)) {
          const regex = new RegExp(`{{this\.${key}}}`, 'g');
          itemContent = itemContent.replace(regex, value);
        }
        return itemContent;
      }).join('');
    });
    
    return processed;
  }

  // Add open tracking pixel
  addOpenTracking(html, options) {
    const trackingUrl = `${process.env.FRONTEND_URL}/api/email/track/open?id=${options.id || 'unknown'}`;
    const pixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" />`;
    return html.replace('</body>', `${pixel}</body>`);
  }

  // Add click tracking to links
  addClickTracking(text, options) {
    // Simple implementation - in production you'd use more sophisticated tracking
    return text;
  }

  // Log email activity
  async logEmailActivity(activity) {
    try {
      // This would log to database in production
      console.log('📧 Email activity:', activity);
    } catch (error) {
      console.error('Failed to log email activity:', error);
    }
  }

  // Get email analytics
  getAnalytics() {
    return {
      ...this.analytics,
      queueSize: this.queue.length,
      processing: this.isProcessing,
      templates: this.templates.size
    };
  }

  // Add custom template
  addTemplate(name, template) {
    this.templates.set(name, template);
    console.log(`📄 Added custom template: ${name}`);
  }

  // Remove template
  removeTemplate(name) {
    this.templates.delete(name);
    console.log(`🗑️ Removed template: ${name}`);
  }

  // Get template
  getTemplate(name) {
    return this.templates.get(name);
  }

  // List all templates
  listTemplates() {
    return Array.from(this.templates.keys());
  }

  // Test email configuration
  async testEmail(to) {
    if (!this.transporter) {
      return { success: false, error: 'Email transporter not configured' };
    }

    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: 'ServiceNexus Email Test',
        html: '<h1>Email Test</h1><p>This is a test email from ServiceNexus.</p>',
        text: 'Email Test\n\nThis is a test email from ServiceNexus.'
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Start analytics cleanup
  startAnalyticsCleanup() {
    setInterval(() => {
      // Reset analytics counters periodically
      if (this.analytics.sent > 10000) {
        console.log('📊 Resetting email analytics counters');
        this.analytics = {
          sent: 0,
          failed: 0,
          bounced: 0,
          opened: 0,
          clicked: 0
        };
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down email service...');
    
    // Process remaining queue
    await this.processQueue();
    
    // Close transporter
    if (this.transporter) {
      this.transporter.close();
    }
    
    console.log('✅ Email service shut down');
  }

  // Template definitions
  getWelcomeTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ServiceNexus</title>
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
            <h2>Welcome {{firstName}}!</h2>
            <p>Thank you for joining ServiceNexus. We're excited to have you on board!</p>
            
            <h3>What's Next?</h3>
            <ul>
                <li>Complete your profile setup</li>
                <li>Explore our features</li>
                <li>Connect with your team</li>
            </ul>
            
            <a href="{{frontendUrl}}/dashboard" class="button">Get Started</a>
            
            <p>If you have any questions, don't hesitate to reach out to our support team.</p>
            
            <p>Welcome aboard!</p>
            <p>The ServiceNexus Team</p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2025 ServiceNexus. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  getWelcomeTextTemplate() {
    return `Welcome to ServiceNexus!

Hello {{firstName}},

Thank you for joining ServiceNexus. We're excited to have you on board!

What's Next?
- Complete your profile setup
- Explore our features
- Connect with your team

Get started here: {{frontendUrl}}/dashboard

If you have any questions, don't hesitate to reach out to our support team.

Welcome aboard!
The ServiceNexus Team

---
This is an automated message. Please do not reply to this email.
© 2025 ServiceNexus. All rights reserved.`;
  }

  getPasswordResetTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .alert { background: #FEF2F2; border: 1px solid #FCA5A5; color: #991B1B; padding: 12px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello {{firstName}},</p>
            <p>We received a request to reset your password for your ServiceNexus account.</p>
            
            <div class="alert">
                <strong>Security Notice:</strong> This link will expire in 1 hour for your security.
            </div>
            
            <a href="{{resetUrl}}" class="button">Reset Password</a>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <p>For your security, please make sure to:</p>
            <ul>
                <li>Choose a strong password</li>
                <li>Don't reuse passwords from other accounts</li>
                <li>Enable two-factor authentication</li>
            </ul>
            
            <p>If you have any issues, please contact our support team.</p>
            
            <p>ServiceNexus Security Team</p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2025 ServiceNexus. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  getPasswordResetTextTemplate() {
    return `Reset Your Password

Hello {{firstName}},

We received a request to reset your password for your ServiceNexus account.

Security Notice: This link will expire in 1 hour for your security.

Reset your password here: {{resetUrl}}

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

For your security, please make sure to:
- Choose a strong password
- Don't reuse passwords from other accounts
- Enable two-factor authentication

If you have any issues, please contact our support team.

ServiceNexus Security Team

---
This is an automated message. Please do not reply to this email.
© 2025 ServiceNexus. All rights reserved.`;
  }

  getServiceUpdateTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{title}}</h1>
        </div>
        <div class="content">
            <h2>{{title}}</h2>
            <p>Hello {{firstName}},</p>
            
            {{#if message}}
            <p>{{message}}</p>
            {{/if}}
            
            {{#if actionUrl}}
            <a href="{{actionUrl}}" class="button">{{actionText || 'View Details'}}</a>
            {{/if}}
            
            {{#if details}}
            <h3>Details:</h3>
            <ul>
                {{#each details}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
            {{/if}}
            
            <p>Thank you for using ServiceNexus!</p>
            
            <p>The ServiceNexus Team</p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2025 ServiceNexus. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  getServiceUpdateTextTemplate() {
    return `{{title}}

Hello {{firstName}},

{{#if message}}
{{message}}
{{/if}}

{{#if actionUrl}}
{{actionText || 'View Details'}}: {{actionUrl}}
{{/if}}

{{#if details}}
Details:
{{#each details}}
- {{this}}
{{/each}}
{{/if}}

Thank you for using ServiceNexus!

The ServiceNexus Team

---
This is an automated message. Please do not reply to this email.
© 2025 ServiceNexus. All rights reserved.`;
  }

  getInvoiceTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice #{{invoiceNumber}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .invoice-table th { background: #f3f4f6; }
        .total { font-weight: bold; font-size: 18px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invoice #{{invoiceNumber}}</h1>
        </div>
        <div class="content">
            <h2>Invoice #{{invoiceNumber}}</h2>
            <p>Date: {{date}}</p>
            <p>Due Date: {{dueDate}}</p>
            
            <h3>Bill To:</h3>
            <p>
                {{customerName}}<br>
                {{customerAddress}}<br>
                {{customerEmail}}
            </p>
            
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each items}}
                    <tr>
                        <td>{{description}}</td>
                        <td>{{quantity}}</td>
                        <td>{{price}}</td>
                        <td>{{total}}</td>
                    </tr>
                    {{/each}}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="total">Total:</td>
                        <td class="total">{{grandTotal}}</td>
                    </tr>
                </tfoot>
            </table>
            
            <p>Thank you for your business!</p>
            
            <p>ServiceNexus Billing Team</p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2025 ServiceNexus. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  getInvoiceTextTemplate() {
    return `Invoice #{{invoiceNumber}}

Date: {{date}}
Due Date: {{dueDate}}

Bill To:
{{customerName}}
{{customerAddress}}
{{customerEmail}}

Items:
{{#each items}}
{{description}} - {{quantity}} x {{price}} = {{total}}
{{/each}}

Total: {{grandTotal}}

Thank you for your business!

ServiceNexus Billing Team

---
This is an automated message. Please do not reply to this email.
© 2025 ServiceNexus. All rights reserved.`;
  }

  getAlertTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Alert: {{alertType}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .alert { background: #FEF3C7; border: 1px solid #FCD34D; color: #92400E; padding: 12px; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ System Alert</h1>
        </div>
        <div class="content">
            <h2>{{alertType}}</h2>
            <p>Hello {{firstName}},</p>
            
            <div class="alert">
                <strong>Alert Details:</strong><br>
                {{message}}
            </div>
            
            {{#if severity}}
            <p><strong>Severity:</strong> {{severity}}</p>
            {{/if}}
            
            {{#if affectedServices}}
            <p><strong>Affected Services:</strong></p>
            <ul>
                {{#each affectedServices}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
            {{/if}}
            
            {{#if actionRequired}}
            <p><strong>Action Required:</strong> {{actionRequired}}</p>
            {{/if}}
            
            {{#if actionUrl}}
            <a href="{{actionUrl}}" class="button">Take Action</a>
            {{/if}}
            
            <p>We're working to resolve this issue as quickly as possible.</p>
            
            <p>ServiceNexus Operations Team</p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2025 ServiceNexus. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  getAlertTextTemplate() {
    return `System Alert: {{alertType}}

Hello {{firstName}},

Alert Details:
{{message}}

{{#if severity}}
Severity: {{severity}}
{{/if}}

{{#if affectedServices}}
Affected Services:
{{#each affectedServices}}
- {{this}}
{{/each}}
{{/if}}

{{#if actionRequired}}
Action Required: {{actionRequired}}
{{/if}}

{{#if actionUrl}}
Take Action: {{actionUrl}}
{{/if}}

We're working to resolve this issue as quickly as possible.

ServiceNexus Operations Team

---
This is an automated message. Please do not reply to this email.
© 2025 ServiceNexus. All rights reserved.`;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
