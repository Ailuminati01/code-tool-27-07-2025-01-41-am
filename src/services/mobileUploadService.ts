import { supabaseService } from './supabaseService';
import { securityService } from './securityService';
import { webSocketService } from './webSocketService';

export interface MobileUploadSession {
  id: string;
  userId: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'completed';
  created_at: string;
  permissions: string[];
}

export interface MobileUploadFile {
  id: string;
  sessionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string; // base64 encoded file data
  uploadedAt: string;
  processedAt?: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  processingError?: string;
}

class MobileUploadService {
  private activeSessions: Map<string, MobileUploadSession> = new Map();
  private pendingFiles: Map<string, MobileUploadFile> = new Map();
  private listeners: Map<string, (files: MobileUploadFile[]) => void> = new Map();

  constructor() {
    // Setup WebSocket listeners for real-time updates
    this.setupWebSocketListeners();
  }

  // Setup WebSocket event listeners
  private setupWebSocketListeners() {
    webSocketService.onFileUploaded((data) => {
      // Handle real-time file upload notifications
      console.log('Real-time file upload notification:', data);
      this.notifyListeners(data.sessionId);
    });

    webSocketService.onFileProcessed((data) => {
      // Handle real-time file processing notifications
      console.log('Real-time file processing notification:', data);
      this.notifyListeners(data.sessionId);
    });
  }

  // Generate a new upload session
  async createUploadSession(userId: string, expirationHours: number = 24): Promise<MobileUploadSession> {
    const sessionId = this.generateId('session');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    const session: MobileUploadSession = {
      id: sessionId,
      userId,
      expiresAt: expiresAt.toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
      permissions: ['upload', 'view']
    };

    this.activeSessions.set(sessionId, session);

    // Join WebSocket session for real-time updates
    webSocketService.joinSession(sessionId);

    // Notify WebSocket about session creation
    webSocketService.notifyFileUploaded(sessionId, { 
      type: 'session_created',
      session: session 
    });

    // Log session creation
    securityService.logAction(
      userId,
      'mobile_upload_session_created',
      'mobile_upload',
      'session_management',
      { 
        sessionId, 
        expiresAt: session.expiresAt,
        realTimeEnabled: true 
      }
    );

    return session;
  }

  // Validate and get session
  getSession(sessionId: string): MobileUploadSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      this.expireSession(sessionId);
      return null;
    }

    return session;
  }

  // Upload file to session with real-time notification
  async uploadFile(sessionId: string, file: File): Promise<MobileUploadFile> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Convert file to base64
    const fileData = await this.fileToBase64(file);
    
    const uploadFile: MobileUploadFile = {
      id: this.generateId('file'),
      sessionId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileData,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded'
    };

    // Store file in memory for immediate access
    this.pendingFiles.set(uploadFile.id, uploadFile);

    // Save to Supabase for persistence
    try {
      await this.saveFileToSupabase(uploadFile);
    } catch (error) {
      console.error('Failed to save file to Supabase:', error);
      // Continue with local storage for now
    }

    // Send real-time notification via WebSocket
    webSocketService.notifyFileUploaded(sessionId, {
      type: 'file_uploaded',
      file: {
        id: uploadFile.id,
        fileName: uploadFile.fileName,
        fileSize: uploadFile.fileSize,
        fileType: uploadFile.fileType,
        uploadedAt: uploadFile.uploadedAt,
        status: uploadFile.status
      }
    });

    // Notify listeners (PC interface) - both WebSocket and local
    this.notifyListeners(sessionId);

    // Log file upload
    securityService.logAction(
      session.userId,
      'mobile_file_uploaded',
      'mobile_upload',
      'file_upload',
      { 
        fileId: uploadFile.id,
        fileName: uploadFile.fileName,
        fileSize: uploadFile.fileSize,
        sessionId,
        realTimeNotified: true
      }
    );

    return uploadFile;
  }

  // Get files for a session
  getSessionFiles(sessionId: string): MobileUploadFile[] {
    return Array.from(this.pendingFiles.values())
      .filter(file => file.sessionId === sessionId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  // Get file by ID
  getFile(fileId: string): MobileUploadFile | null {
    return this.pendingFiles.get(fileId) || null;
  }

  // Subscribe to file updates for a session with WebSocket integration
  subscribeToSession(sessionId: string, callback: (files: MobileUploadFile[]) => void): () => void {
    const listenerId = this.generateId('listener');
    this.listeners.set(listenerId, callback);

    // Join WebSocket session for real-time updates
    webSocketService.joinSession(sessionId);

    // Send initial files
    const files = this.getSessionFiles(sessionId);
    callback(files);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listenerId);
      webSocketService.leaveSession(sessionId);
    };
  }

  // Mark file as processed with real-time notification
  markFileAsProcessed(fileId: string): void {
    const file = this.pendingFiles.get(fileId);
    if (file) {
      file.status = 'processed';
      file.processedAt = new Date().toISOString();
      this.pendingFiles.set(fileId, file);
      
      // Send real-time notification
      webSocketService.notifyFileProcessed(file.sessionId, {
        type: 'file_processed',
        file: {
          id: file.id,
          fileName: file.fileName,
          status: file.status,
          processedAt: file.processedAt
        }
      });
      
      // Update in Supabase
      this.updateFileInSupabase(file);
      
      // Notify local listeners
      this.notifyListeners(file.sessionId);
    }
  }

  // Mark file as failed with real-time notification
  markFileAsFailed(fileId: string, error: string): void {
    const file = this.pendingFiles.get(fileId);
    if (file) {
      file.status = 'failed';
      file.processingError = error;
      this.pendingFiles.set(fileId, file);
      
      // Send real-time notification
      webSocketService.notifyFileProcessed(file.sessionId, {
        type: 'file_failed',
        file: {
          id: file.id,
          fileName: file.fileName,
          status: file.status,
          processingError: file.processingError
        }
      });
      
      // Update in Supabase
      this.updateFileInSupabase(file);
      
      // Notify local listeners
      this.notifyListeners(file.sessionId);
    }
  }

  // Convert file to base64
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Save file to Supabase
  private async saveFileToSupabase(file: MobileUploadFile): Promise<void> {
    // Note: This would require a custom Supabase table for mobile uploads
    // For now, we'll use local storage with periodic sync
    console.log('Saving file to Supabase (simulated):', file.id);
  }

  // Update file in Supabase
  private async updateFileInSupabase(file: MobileUploadFile): Promise<void> {
    // Note: This would update the file status in Supabase
    console.log('Updating file in Supabase (simulated):', file.id);
  }

  // Notify all listeners with enhanced real-time support
  private notifyListeners(sessionId: string): void {
    const files = this.getSessionFiles(sessionId);
    this.listeners.forEach(callback => {
      try {
        callback(files);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  // Expire session with WebSocket cleanup
  private expireSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'expired';
      this.activeSessions.set(sessionId, session);
      
      // Leave WebSocket session
      webSocketService.leaveSession(sessionId);
    }
  }

  // Generate unique ID
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up expired sessions and files
  cleanup(): void {
    const now = new Date();
    
    // Clean up expired sessions
    this.activeSessions.forEach((session, sessionId) => {
      if (now > new Date(session.expiresAt)) {
        this.expireSession(sessionId);
      }
    });

    // Clean up old files (older than 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.pendingFiles.forEach((file, fileId) => {
      if (new Date(file.uploadedAt) < weekAgo) {
        this.pendingFiles.delete(fileId);
      }
    });
  }

  // Get WebSocket connection status for UI
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    return webSocketService.getConnectionStatus();
  }
}

export const mobileUploadService = new MobileUploadService();

// Run cleanup every hour
setInterval(() => {
  mobileUploadService.cleanup();
}, 60 * 60 * 1000);