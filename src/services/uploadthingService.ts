import { securityService } from './securityService';

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  size: number;
  type: string;
}

class UploadThingService {
  private apiKey = 'eyJhcGlLZXkiOiJza19saXZlXzc5Y2ExNjBmNjJhNDg2YjYyYzVmZmIxNmYzODQyMjgwMzVmNzVlNDkwYjVlZjg3MGNkY2Q2NjE0OTNkMjJkYTUiLCJhcHBJZCI6Inc3N2oyZXRqaDEiLCJyZWdpb25zIjpbInNlYTEiXX0=';
  private baseUrl = 'https://api.uploadthing.com';
  private uploadedFiles: Map<string, UploadedFile> = new Map();

  async generateUploadUrl(): Promise<string> {
    try {
      // In a real implementation, this would call UploadThing API to generate a presigned URL
      const uploadId = this.generateId('upload');
      const uploadUrl = `${this.baseUrl}/upload/${uploadId}`;
      
      // For demo purposes, return a mock URL that includes the upload ID
      return `${window.location.origin}/mobile-upload/${uploadId}`;
    } catch (error) {
      console.error('Failed to generate upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  async uploadFile(file: File, uploadUrl: string): Promise<UploadedFile> {
    try {
      // In a real implementation, this would upload to UploadThing
      const fileId = this.generateId('file');
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        url: URL.createObjectURL(file), // Mock URL for demo
        uploadedAt: new Date().toISOString(),
        size: file.size,
        type: file.type
      };

      this.uploadedFiles.set(fileId, uploadedFile);

      // Log the upload
      securityService.logAction(
        'mobile_user',
        'file_uploaded',
        'document',
        fileId,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadMethod: 'mobile_qr'
        }
      );

      return uploadedFile;
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('File upload failed');
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const file = this.uploadedFiles.get(fileId);
      if (!file) return false;

      // In a real implementation, this would delete from UploadThing
      this.uploadedFiles.delete(fileId);

      // Log the deletion
      securityService.logAction(
        'current_user',
        'file_deleted',
        'document',
        fileId,
        { fileName: file.name }
      );

      return true;
    } catch (error) {
      console.error('File deletion failed:', error);
      return false;
    }
  }

  getUploadedFiles(): UploadedFile[] {
    return Array.from(this.uploadedFiles.values())
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  getFile(fileId: string): UploadedFile | null {
    return this.uploadedFiles.get(fileId) || null;
  }

  async getUploadStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }> {
    const files = this.getUploadedFiles();
    
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      fileTypes: {} as Record<string, number>
    };

    files.forEach(file => {
      const type = file.type.split('/')[0] || 'unknown';
      stats.fileTypes[type] = (stats.fileTypes[type] || 0) + 1;
    });

    return stats;
  }

  // Utility method to validate file before upload
  validateFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'];

    if (file.size > maxSize) {
      return { isValid: false, error: 'File size exceeds 50MB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not supported' };
    }

    return { isValid: true };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to handle mobile upload page
  async handleMobileUpload(uploadId: string, files: FileList): Promise<UploadedFile[]> {
    const uploadedFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Upload file
      const uploadUrl = `${this.baseUrl}/upload/${uploadId}`;
      const uploadedFile = await this.uploadFile(file, uploadUrl);
      uploadedFiles.push(uploadedFile);
    }

    return uploadedFiles;
  }
}

export const uploadthingService = new UploadThingService();