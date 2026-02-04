// WebSocket Client Utility
// Real-time communication with WebSocket server

interface WebSocketMessage {
  type: string;
  payload?: any;
  clientId?: string;
  timestamp?: string;
}

interface WebSocketClientConfig {
  url: string;
  token?: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

interface WebSocketEventHandlers {
  onOpen?: () => void;
  onMessage?: (message: any) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onReconnect?: () => void;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketClientConfig;
  private handlers: WebSocketEventHandlers;
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private rooms: Set<string> = new Set();
  private clientId: string | null = null;
  private isAuthenticated = false;

  constructor(config: WebSocketClientConfig, handlers: WebSocketEventHandlers = {}) {
    this.config = {
      reconnectAttempts: 5,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      ...config
    };
    
    this.handlers = handlers;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isConnecting = true;
      
      const wsUrl = new URL(this.config.url);
      
      // Add token as query parameter if provided
      if (this.config.token) {
        wsUrl.searchParams.set('token', this.config.token);
      }

      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = (event) => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.isAuthenticated = false;
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Send queued messages
        this.flushMessageQueue();
        
        // Call handler
        this.handlers.onOpen?.();
        
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected');
        this.stopHeartbeat();
        
        // Call handler
        this.handlers.onClose?.(event);
        
        // Attempt reconnection
        if (!event.wasClean && this.reconnectAttempts < this.config.reconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handlers.onError?.(error);
      };

      // Set connection timeout
      const timeout = setTimeout(() => {
        if (this.isConnecting) {
          this.ws?.close();
          this.isConnecting = false;
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.handlers.onOpen?.();
      };
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.rooms.clear();
    this.messageQueue = [];
  }

  private handleMessage(message: WebSocketMessage): void {
    const { type, payload, clientId, timestamp } = message;

    switch (type) {
      case 'welcome':
        this.clientId = clientId;
        console.log('Received welcome message, clientId:', clientId);
        break;

      case 'authenticated':
        this.isAuthenticated = true;
        console.log('Authenticated successfully');
        this.handlers.onMessage?.(message);
        break;

      case 'error':
        console.error('WebSocket error from server:', payload);
        break;

      default:
        this.handlers.onMessage?.(message);
    }
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.config.reconnectAttempts})`);
      this.reconnectAttempts++;
      
      this.connect().then(() => {
        this.handlers.onReconnect?.();
      }).catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.config.reconnectInterval);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendMessage({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Authentication
  authenticate(token: string): void {
    this.sendMessage({
      type: 'authenticate',
      payload: { token }
    });
  }

  // Room management
  joinRoom(roomName: string): void {
    this.sendMessage({
      type: 'join_room',
      payload: { room: roomName }
    });
    this.rooms.add(roomName);
  }

  leaveRoom(roomName: string): void {
    this.sendMessage({
      type: 'leave_room',
      payload: { room: roomName }
    });
    this.rooms.delete(roomName);
  }

  // Chat functionality
  sendMessage(room: string, message: string): void {
    this.sendMessage({
      type: 'send_message',
      payload: { room, message }
    });
  }

  sendTyping(room: string, isTyping: boolean): void {
    this.sendMessage({
      type: 'typing',
      payload: { room, isTyping }
    });
  }

  // Notifications
  markNotificationRead(notificationId: string): void {
    this.sendMessage({
      type: 'notification_read',
      payload: { notificationId }
    });
  }

  // Utility methods
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  isReady(): boolean {
    return this.isConnected() && this.isAuthenticated;
  }

  getClientId(): string | null {
    return this.clientId;
  }

  getConnectedRooms(): string[] {
    return Array.from(this.rooms);
  }

  // Static factory method
  static create(config: WebSocketClientConfig, handlers?: WebSocketEventHandlers): WebSocketClient {
    return new WebSocketClient(config, handlers);
  }
}

export default WebSocketClient;
