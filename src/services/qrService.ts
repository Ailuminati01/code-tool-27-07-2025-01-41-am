import QRCode from 'qrcode';

export interface QRCodeData {
  id: string;
  type: 'document_upload' | 'folder_access' | 'workflow_action';
  documentId?: string;
  folderId?: string;
  workflowId?: string;
  userId: string;
  expiresAt: string;
  permissions: string[];
  uploadUrl?: string;
}

class QRService {
  private qrCodes: Map<string, QRCodeData> = new Map();

  async generateQRCode(data: Omit<QRCodeData, 'id'>): Promise<{ id: string; qrCodeUrl: string }> {
    const id = this.generateId('qr');
    const qrData: QRCodeData = { ...data, id };
    
    this.qrCodes.set(id, qrData);

    // Generate QR code with upload URL or mobile upload URL
    const targetUrl = data.uploadUrl || `${window.location.origin}/mobile-upload/${id}`;
    const qrCodeUrl = await QRCode.toDataURL(targetUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#1e3a8a',
        light: '#ffffff'
      }
    });

    return { id, qrCodeUrl };
  }

  validateQRCode(id: string): QRCodeData | null {
    const qrData = this.qrCodes.get(id);
    if (!qrData) return null;

    // Check expiration
    if (new Date() > new Date(qrData.expiresAt)) {
      this.qrCodes.delete(id);
      return null;
    }

    return qrData;
  }

  revokeQRCode(id: string): boolean {
    return this.qrCodes.delete(id);
  }

  getActiveQRCodes(userId: string): QRCodeData[] {
    return Array.from(this.qrCodes.values())
      .filter(qr => qr.userId === userId && new Date() <= new Date(qr.expiresAt));
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const qrService = new QRService();