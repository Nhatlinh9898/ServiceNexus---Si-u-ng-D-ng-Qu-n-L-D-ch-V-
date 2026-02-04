// WebSocket Server for Real-time Features
// Live notifications, real-time updates, collaborative features

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map of userId -> WebSocket connection
    this.rooms = new Map(); // Map of roomName -> Set of clientIds
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      
      console.log(`WebSocket client connected: ${clientId}`);

      // Handle incoming messages
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleMessage(ws, clientId, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnection(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'welcome',
        clientId,
        timestamp: new Date().toISOString()
      });
    });

    console.log('WebSocket server initialized');
  }

  async handleMessage(ws, clientId, data) {
    const { type, payload } = data;

    switch (type) {
      case 'authenticate':
        await this.handleAuthentication(ws, clientId, payload);
        break;

      case 'join_room':
        this.joinRoom(clientId, payload.room);
        break;

      case 'leave_room':
        this.leaveRoom(clientId, payload.room);
        break;

      case 'send_message':
        this.handleChatMessage(clientId, payload);
        break;

      case 'typing':
        this.handleTyping(clientId, payload);
        break;

      case 'notification_read':
        this.handleNotificationRead(clientId, payload);
        break;

      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  async handleAuthentication(ws, clientId, payload) {
    try {
      const { token } = payload;
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Store user info with this connection
      const clientInfo = {
        id: clientId,
        userId: decoded.userId,
        ws,
        authenticated: true,
        joinedAt: new Date()
      };

      this.clients.set(clientId, clientInfo);

      // Send authentication success
      this.sendToClient(ws, {
        type: 'authenticated',
        clientId,
        userId: decoded.userId,
        timestamp: new Date().toISOString()
      });

      // Join user's personal room
      this.joinRoom(clientId, `user_${decoded.userId}`);

      console.log(`Client ${clientId} authenticated as user ${decoded.userId}`);
    } catch (error) {
      console.error('Authentication error:', error);
      this.sendError(ws, 'Authentication failed');
    }
  }

  joinRoom(clientId, roomName) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    
    this.rooms.get(roomName).add(clientId);
    
    const clientInfo = this.clients.get(clientId);
    if (clientInfo) {
      clientInfo.rooms = clientInfo.rooms || new Set();
      clientInfo.rooms.add(roomName);
    }

    // Notify other clients in the room
    this.broadcastToRoom(roomName, {
      type: 'user_joined',
      clientId,
      room: roomName,
      timestamp: new Date().toISOString()
    }, clientId);

    console.log(`Client ${clientId} joined room: ${roomName}`);
  }

  leaveRoom(clientId, roomName) {
    if (this.rooms.has(roomName)) {
      this.rooms.get(roomName).delete(clientId);
      
      // Remove room if empty
      if (this.rooms.get(roomName).size === 0) {
        this.rooms.delete(roomName);
      }
    }

    const clientInfo = this.clients.get(clientId);
    if (clientInfo && clientInfo.rooms) {
      clientInfo.rooms.delete(roomName);
    }

    // Notify other clients in the room
    this.broadcastToRoom(roomName, {
      type: 'user_left',
      clientId,
      room: roomName,
      timestamp: new Date().toISOString()
    }, clientId);

    console.log(`Client ${clientId} left room: ${roomName}`);
  }

  handleChatMessage(clientId, payload) {
    const { room, message } = payload;
    const clientInfo = this.clients.get(clientId);

    if (!clientInfo || !clientInfo.authenticated) {
      this.sendError(this.clients.get(clientId)?.ws, 'Not authenticated');
      return;
    }

    // Verify user is in the room
    if (!clientInfo.rooms || !clientInfo.rooms.has(room)) {
      this.sendError(clientInfo.ws, 'Not in room');
      return;
    }

    const chatMessage = {
      type: 'chat_message',
      id: uuidv4(),
      clientId,
      userId: clientInfo.userId,
      room,
      message,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all clients in the room
    this.broadcastToRoom(room, chatMessage);

    // Store message in database (optional)
    this.storeChatMessage(chatMessage);
  }

  handleTyping(clientId, payload) {
    const { room, isTyping } = payload;
    const clientInfo = this.clients.get(clientId);

    if (!clientInfo || !clientInfo.authenticated) return;

    const typingMessage = {
      type: 'typing',
      clientId,
      userId: clientInfo.userId,
      room,
      isTyping,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all clients in the room except sender
    this.broadcastToRoom(room, typingMessage, clientId);
  }

  handleNotificationRead(clientId, payload) {
    const { notificationId } = payload;
    const clientInfo = this.clients.get(clientId);

    if (!clientInfo || !clientInfo.authenticated) return;

    // Update notification status in database
    this.updateNotificationStatus(notificationId, clientInfo.userId);

    // Send confirmation
    this.sendToClient(clientInfo.ws, {
      type: 'notification_read',
      notificationId,
      timestamp: new Date().toISOString()
    });
  }

  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  sendError(ws, error) {
    this.sendToClient(ws, {
      type: 'error',
      error,
      timestamp: new Date().toISOString()
    });
  }

  broadcastToRoom(roomName, message, excludeClientId = null) {
    if (!this.rooms.has(roomName)) return;

    const roomClients = this.rooms.get(roomName);
    
    roomClients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        const clientInfo = this.clients.get(clientId);
        if (clientInfo && clientInfo.ws.readyState === WebSocket.OPEN) {
          this.sendToClient(clientInfo.ws, message);
        }
      }
    });
  }

  broadcastToAll(message) {
    this.clients.forEach((clientInfo, clientId) => {
      if (clientInfo.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(clientInfo.ws, message);
      }
    });
  }

  sendNotificationToUser(userId, notification) {
    const roomName = `user_${userId}`;
    const notificationMessage = {
      type: 'notification',
      id: uuidv4(),
      userId,
      ...notification,
      timestamp: new Date().toISOString()
    };

    this.broadcastToRoom(roomName, notificationMessage);

    // Store notification in database
    this.storeNotification(notificationMessage);
  }

  sendServiceUpdate(organizationId, serviceData, action = 'updated') {
    const roomName = `org_${organizationId}`;
    const updateMessage = {
      type: 'service_update',
      action, // created, updated, deleted, status_changed
      organizationId,
      ...serviceData,
      timestamp: new Date().toISOString()
    };

    this.broadcastToRoom(roomName, updateMessage);
  }

  sendUserStatusUpdate(userId, status) {
    const roomName = `user_${userId}`;
    const statusMessage = {
      type: 'user_status',
      userId,
      status,
      timestamp: new Date().toISOString()
    };

    this.broadcastToRoom(roomName, statusMessage);
  }

  handleDisconnection(clientId) {
    const clientInfo = this.clients.get(clientId);
    
    if (clientInfo) {
      console.log(`Client ${clientId} disconnected`);
      
      // Leave all rooms
      if (clientInfo.rooms) {
        clientInfo.rooms.forEach(roomName => {
          this.leaveRoom(clientId, roomName);
        });
      }
      
      this.clients.delete(clientId);
    }
  }

  getConnectedClients() {
    return Array.from(this.clients.values()).map(client => ({
      clientId: client.id,
      userId: client.userId,
      authenticated: client.authenticated,
      joinedAt: client.joinedAt,
      rooms: Array.from(client.rooms || [])
    }));
  }

  getRoomInfo(roomName) {
    if (!this.rooms.has(roomName)) {
      return null;
    }

    const roomClients = Array.from(this.rooms.get(roomName));
    const clientInfos = roomClients.map(clientId => {
      const clientInfo = this.clients.get(clientId);
      return {
        clientId,
        userId: clientInfo?.userId,
        authenticated: clientInfo?.authenticated || false
      };
    });

    return {
      roomName,
      clientCount: roomClients.length,
      clients: clientInfos
    };
  }

  // Database operations (mock implementations)
  async storeChatMessage(message) {
    // In a real implementation, this would store the message in a database
    console.log('Storing chat message:', message.id);
  }

  async storeNotification(notification) {
    // In a real implementation, this would store the notification in a database
    console.log('Storing notification:', notification.id);
  }

  async updateNotificationStatus(notificationId, userId) {
    // In a real implementation, this would update the notification status in a database
    console.log(`Marking notification ${notificationId} as read for user ${userId}`);
  }

  // Statistics
  getStats() {
    return {
      connectedClients: this.clients.size,
      activeRooms: this.rooms.size,
      totalRooms: this.rooms.size,
      timestamp: new Date().toISOString()
    };
  }

  // Graceful shutdown
  shutdown() {
    console.log('Shutting down WebSocket server...');
    
    this.wss.clients.forEach(ws => {
      ws.close();
    });
    
    this.wss.close();
  }
}

module.exports = WebSocketServer;
