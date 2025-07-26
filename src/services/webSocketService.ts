import { io, Socket } from 'socket.io-client';

interface WebSocketMessage {
  type: 'file_uploaded' | 'file_processed' | 'session_created' | 'session_expired';
  sessionId: string;
  data?: any;
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Initialize WebSocket connection
  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // For development, we'll simulate WebSocket with EventSource/Server-Sent Events
        // In production, this would connect to a WebSocket server
        this.socket = io('http://localhost:3001', {
          transports: ['websocket', 'polling'],
          timeout: 5000,
          autoConnect: false
        });

        // Fallback to local EventSource simulation if Socket.IO server is not available
        this.setupLocalSimulation();
        
        this.isConnected = true;
        resolve(true);
      } catch (error) {
        console.error('WebSocket connection failed, using local simulation:', error);
        this.setupLocalSimulation();
        this.isConnected = true; // Consider local simulation as connected
        resolve(true);
      }
    });
  }

  // Setup local simulation for development
  private setupLocalSimulation() {
    console.log('Setting up local WebSocket simulation');
    
    // Simulate real-time updates by polling localStorage
    setInterval(() => {
      try {
        const updates = this.checkForLocalUpdates();
        updates.forEach(update => {
          this.notifyListeners(update.type, update);
        });
      } catch (error) {
        // Silently handle errors in simulation
      }
    }, 1000); // Check every second
  }

  // Check for updates in localStorage (simulation)
  private checkForLocalUpdates(): WebSocketMessage[] {
    const updates: WebSocketMessage[] = [];
    
    try {
      // Check for new upload notifications
      const uploadNotifications = localStorage.getItem('mobile_upload_notifications');
      if (uploadNotifications) {
        const notifications = JSON.parse(uploadNotifications);
        notifications.forEach((notification: any) => {
          updates.push({
            type: 'file_uploaded',
            sessionId: notification.sessionId,
            data: notification.fileData,
            timestamp: notification.timestamp
          });
        });
        
        // Clear processed notifications
        localStorage.removeItem('mobile_upload_notifications');
      }
    } catch (error) {
      console.error('Error checking local updates:', error);
    }
    
    return updates;
  }

  // Join a session room for real-time updates
  joinSession(sessionId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_session', sessionId);
    } else {
      // For local simulation, just store the session
      const activeSessions = JSON.parse(localStorage.getItem('ws_active_sessions') || '[]');
      if (!activeSessions.includes(sessionId)) {
        activeSessions.push(sessionId);
        localStorage.setItem('ws_active_sessions', JSON.stringify(activeSessions));
      }
    }
  }

  // Leave a session room
  leaveSession(sessionId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_session', sessionId);
    } else {
      // For local simulation, remove from storage
      const activeSessions = JSON.parse(localStorage.getItem('ws_active_sessions') || '[]');
      const filtered = activeSessions.filter((id: string) => id !== sessionId);
      localStorage.setItem('ws_active_sessions', JSON.stringify(filtered));
    }
  }

  // Subscribe to file upload events
  onFileUploaded(callback: (data: { sessionId: string; file: any }) => void) {
    this.addEventListener('file_uploaded', callback);
  }

  // Subscribe to file processing events
  onFileProcessed(callback: (data: { sessionId: string; file: any }) => void) {
    this.addEventListener('file_processed', callback);
  }

  // Subscribe to session events
  onSessionCreated(callback: (data: { sessionId: string }) => void) {
    this.addEventListener('session_created', callback);
  }

  // Send file upload notification (for mobile upload page)
  notifyFileUploaded(sessionId: string, fileData: any) {
    const message: WebSocketMessage = {
      type: 'file_uploaded',
      sessionId,
      data: fileData,
      timestamp: new Date().toISOString()
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('file_uploaded', message);
    } else {
      // Use localStorage for local simulation
      this.storeLocalNotification(message);
    }
  }

  // Send file processing notification
  notifyFileProcessed(sessionId: string, fileData: any) {
    const message: WebSocketMessage = {
      type: 'file_processed',
      sessionId,
      data: fileData,
      timestamp: new Date().toISOString()
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('file_processed', message);
    } else {
      this.storeLocalNotification(message);
    }
  }

  // Store notification in localStorage for simulation
  private storeLocalNotification(message: WebSocketMessage) {
    try {
      const notifications = JSON.parse(localStorage.getItem('mobile_upload_notifications') || '[]');
      notifications.push(message);
      localStorage.setItem('mobile_upload_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error storing local notification:', error);
    }
  }

  // Generic event listener
  private addEventListener(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  // Notify all listeners for an event type
  private notifyListeners(eventType: string, data: any) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${eventType}:`, error);
        }
      });
    }
  }

  // Remove event listener
  removeEventListener(eventType: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  // Check connection status
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }

  // Get connection status for UI
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (!this.isConnected) return 'disconnected';
    if (this.socket && this.socket.connected) return 'connected';
    return 'connecting';
  }
}

export const webSocketService = new WebSocketService();

// Auto-connect when service is imported
webSocketService.connect().then(() => {
  console.log('WebSocket service initialized');
});

export type { WebSocketMessage };