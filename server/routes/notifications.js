// Notifications API Routes
// Handles CRUD operations for notifications

const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const notificationSystem = require('../utils/notifications');
const { performanceMiddleware } = require('../utils/performance');
const router = express.Router();

// Get user notifications
router.get('/', protect, performanceMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      limit = 20, 
      offset = 0, 
      unreadOnly = false, 
      type = null, 
      priority = null 
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unreadOnly === 'true',
      type,
      priority
    };

    const result = await notificationSystem.getUserNotifications(userId, options);
    
    res.json(result);
    
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get notification by ID
router.get('/:id', protect, performanceMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notifications = await notificationSystem.getUserNotifications(userId, {
      limit: 1,
      offset: 0
    });

    const notification = notifications.notifications.find(n => n.id === notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
    
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
});

// Mark notification as read
router.patch('/:id/read', protect, performanceMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await notificationSystem.markAsRead(notificationId, userId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
    
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/read-all', protect, performanceMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await notificationSystem.markAllAsRead(userId);
    
    res.json({
      message: 'All notifications marked as read',
      count: notifications.length,
      notifications
    });
    
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', protect, performanceMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await notificationSystem.deleteNotification(notificationId, userId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification deleted successfully',
      notification
    });
    
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get notification statistics
router.get('/stats/overview', protect, restrictTo('admin', 'manager'), performanceMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.query.userId || null;

    const stats = await notificationSystem.getNotificationStats(organizationId, userId);
    
    res.json({
      organizationId,
      userId,
      stats,
      total: stats.reduce((sum, stat) => sum + parseInt(stat.total), 0),
      unread: stats.reduce((sum, stat) => sum + parseInt(stat.unread), 0)
    });
    
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Failed to fetch notification statistics' });
  }
});

// Create notification (admin only)
router.post('/', protect, restrictTo('admin'), performanceMiddleware, async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      message,
      data = {},
      priority = 'normal',
      sendEmail = false,
      sendPush = false,
      expiresIn = null
    } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, type, title, message' 
      });
    }

    const notification = await notificationSystem.createNotification({
      userId,
      organizationId: req.user.organizationId,
      type,
      title,
      message,
      data,
      priority,
      sendEmail,
      sendPush,
      expiresIn
    });

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
    
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Bulk create notifications (admin only)
router.post('/bulk', protect, restrictTo('admin'), performanceMiddleware, async (req, res) => {
  try {
    const {
      userIds,
      type,
      title,
      message,
      data = {},
      priority = 'normal',
      sendEmail = false,
      sendPush = false,
      expiresIn = null
    } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        error: 'Missing or invalid userIds array' 
      });
    }

    if (!type || !title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, title, message' 
      });
    }

    const notifications = [];
    
    for (const userId of userIds) {
      try {
        const notification = await notificationSystem.createNotification({
          userId,
          organizationId: req.user.organizationId,
          type,
          title,
          message,
          data,
          priority,
          sendEmail,
          sendPush,
          expiresIn
        });
        
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to create notification for user ${userId}:`, error);
      }
    }

    res.status(201).json({
      message: 'Bulk notifications created successfully',
      count: notifications.length,
      notifications
    });
    
  } catch (error) {
    console.error('Bulk create notifications error:', error);
    res.status(500).json({ error: 'Failed to create bulk notifications' });
  }
});

// Create system notification (admin only)
router.post('/system', protect, restrictTo('admin'), performanceMiddleware, async (req, res) => {
  try {
    const {
      userId,
      title,
      message,
      data = {},
      priority = 'high',
      sendEmail = true,
      expiresIn = null
    } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, title, message' 
      });
    }

    const notification = await notificationSystem.createSystemNotification({
      userId,
      organizationId: req.user.organizationId,
      title,
      message,
      data,
      priority,
      sendEmail,
      expiresIn
    });

    res.status(201).json({
      message: 'System notification created successfully',
      notification
    });
    
  } catch (error) {
    console.error('Create system notification error:', error);
    res.status(500).json({ error: 'Failed to create system notification' });
  }
});

// Create service notification
router.post('/service', protect, performanceMiddleware, async (req, res) => {
  try {
    const {
      userId,
      title,
      message,
      data = {},
      priority = 'normal',
      sendEmail = false,
      expiresIn = null
    } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, title, message' 
      });
    }

    // Users can only create service notifications for themselves or their organization members
    if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ 
        error: 'Insufficient permissions to create service notification for this user' 
      });
    }

    const notification = await notificationSystem.createServiceNotification({
      userId,
      organizationId: req.user.organizationId,
      title,
      message,
      data,
      priority,
      sendEmail,
      expiresIn
    });

    res.status(201).json({
      message: 'Service notification created successfully',
      notification
    });
    
  } catch (error) {
    console.error('Create service notification error:', error);
    res.status(500).json({ error: 'Failed to create service notification' });
  }
});

// Create alert notification (admin/manager only)
router.post('/alert', protect, restrictTo('admin', 'manager'), performanceMiddleware, async (req, res) => {
  try {
    const {
      userId,
      title,
      message,
      data = {},
      priority = 'high',
      sendEmail = true,
      expiresIn = null
    } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, title, message' 
      });
    }

    const notification = await notificationSystem.createAlertNotification({
      userId,
      organizationId: req.user.organizationId,
      title,
      message,
      data,
      priority,
      sendEmail,
      expiresIn
    });

    res.status(201).json({
      message: 'Alert notification created successfully',
      notification
    });
    
  } catch (error) {
    console.error('Create alert notification error:', error);
    res.status(500).json({ error: 'Failed to create alert notification' });
  }
});

// Cleanup expired notifications (admin only)
router.post('/cleanup', protect, restrictTo('admin'), performanceMiddleware, async (req, res) => {
  try {
    const deletedCount = await notificationSystem.cleanupExpiredNotifications();
    
    res.json({
      message: 'Expired notifications cleaned up successfully',
      deletedCount
    });
    
  } catch (error) {
    console.error('Cleanup notifications error:', error);
    res.status(500).json({ error: 'Failed to cleanup expired notifications' });
  }
});

// Test notification (admin only)
router.post('/test', protect, restrictTo('admin'), performanceMiddleware, async (req, res) => {
  try {
    const { userId = req.user.id } = req.body;

    const notification = await notificationSystem.createNotification({
      userId,
      organizationId: req.user.organizationId,
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test notification to verify the notification system is working correctly.',
      data: { test: true, timestamp: new Date().toISOString() },
      priority: 'normal',
      sendEmail: false
    });

    res.status(201).json({
      message: 'Test notification created successfully',
      notification
    });
    
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Failed to create test notification' });
  }
});

module.exports = router;
