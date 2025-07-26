import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, Upload, Clock, CheckCircle, AlertCircle, Camera, FileImage, Loader2, RefreshCw } from 'lucide-react';
import { qrService, QRCodeData } from '../../services/qrService';
import { mobileUploadService, MobileUploadFile, MobileUploadSession } from '../../services/mobileUploadService';
import { useAuth } from '../../contexts/AuthContext';

export function QRUpload() {
  const { user } = useAuth();
  const [qrCodes, setQrCodes] = useState<Array<{ id: string; qrCodeUrl: string; data: QRCodeData; session: MobileUploadSession }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<MobileUploadFile[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadActiveQRCodes();
      loadUploadedFiles();
      
      // Auto-refresh uploaded files every 10 seconds
      const interval = setInterval(loadUploadedFiles, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadActiveQRCodes = async () => {
    if (!user) return;
    
    const activeQRs = qrService.getActiveQRCodes(user.id);
    const qrCodesWithUrls = await Promise.all(
      activeQRs.map(async (qr) => {
        // Get the mobile upload session for this QR code
        const session = mobileUploadService.getSession(qr.id);
        if (!session) return null;

        const { qrCodeUrl } = await qrService.generateQRCode({
          type: qr.type,
          userId: qr.userId,
          expiresAt: qr.expiresAt,
          permissions: qr.permissions,
          documentId: qr.documentId,
          folderId: qr.folderId,
          workflowId: qr.workflowId
        });
        return { id: qr.id, qrCodeUrl, data: qr, session };
      })
    );
    
    setQrCodes(qrCodesWithUrls.filter(Boolean) as any);
  };

  const loadUploadedFiles = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    try {
      // Get all files from all active sessions
      const activeQRs = qrService.getActiveQRCodes(user.id);
      const allFiles: MobileUploadFile[] = [];
      
      for (const qr of activeQRs) {
        const sessionFiles = mobileUploadService.getSessionFiles(qr.id);
        allFiles.push(...sessionFiles);
      }
      
      // Sort by upload time (newest first)
      allFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      setUploadedFiles(allFiles);
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateUploadQR = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      // Create mobile upload session
      const session = await mobileUploadService.createUploadSession(user.id, 24);

      // Generate QR code that points to mobile upload page
      const mobileUploadUrl = `${window.location.origin}/mobile-upload/${session.id}`;
      
      const { id, qrCodeUrl } = await qrService.generateQRCode({
        type: 'document_upload',
        userId: user.id,
        expiresAt: expiresAt.toISOString(),
        permissions: ['document.create'],
        uploadUrl: mobileUploadUrl
      });

      const newQR = {
        id,
        qrCodeUrl,
        data: {
          id,
          type: 'document_upload' as const,
          userId: user.id,
          expiresAt: expiresAt.toISOString(),
          permissions: ['document.create'],
          uploadUrl: mobileUploadUrl
        },
        session
      };

      setQrCodes(prev => [...prev, newQR]);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeQRCode = (id: string) => {
    qrService.revokeQRCode(id);
    setQrCodes(prev => prev.filter(qr => qr.id !== id));
  };

  const processUploadedFile = async (file: MobileUploadFile) => {
    try {
      // Mark file as processing
      mobileUploadService.markFileAsProcessed(file.id);
      
      // Create File object from base64 data
      const binaryData = atob(file.fileData);
      const uint8Array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([uint8Array], { type: file.fileType });
      const fileObj = new File([blob], file.fileName, { type: file.fileType });

      // Here you would integrate with your existing document processing pipeline
      // For now, we'll just mark it as processed
      console.log('Processing file:', file.fileName);
      
      // Update file list
      loadUploadedFiles();
      
      alert(`File "${file.fileName}" has been processed and is ready for review.`);
    } catch (error) {
      console.error('Failed to process file:', error);
      mobileUploadService.markFileAsFailed(file.id, error instanceof Error ? error.message : 'Processing failed');
      alert('Failed to process file. Please try again.');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    return <FileImage className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'Ready for processing';
      case 'processing':
        return 'Processing...';
      case 'processed':
        return 'Processed successfully';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  const getQRTypeIcon = (type: string) => {
    switch (type) {
      case 'document_upload': return <Upload className="h-4 w-4" />;
      case 'folder_access': return <QrCode className="h-4 w-4" />;
      case 'workflow_action': return <CheckCircle className="h-4 w-4" />;
      default: return <QrCode className="h-4 w-4" />;
    }
  };

  const getQRTypeLabel = (type: string) => {
    switch (type) {
      case 'document_upload': return 'Document Upload';
      case 'folder_access': return 'Folder Access';
      case 'workflow_action': return 'Workflow Action';
      default: return 'Unknown';
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Mobile QR Upload</h2>
            <p className="text-sm text-gray-600 mt-1">
              Generate QR codes for instant mobile document upload with real-time sync
            </p>
          </div>
          <button
            onClick={generateUploadQR}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4 mr-2" />
            )}
            Generate Upload QR
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">How to use Mobile Upload</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Generate a QR code using the button above</li>
                  <li>Open your mobile camera or QR scanner app</li>
                  <li>Scan the QR code to open the mobile upload page</li>
                  <li>Take photos or select documents from your device</li>
                  <li>Files will appear here within seconds for processing</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Active QR Codes */}
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-medium text-gray-900">Active QR Codes</h3>
          
          {qrCodes.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No active QR codes</p>
              <p className="text-sm text-gray-400">Generate a QR code to enable mobile uploads</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {qrCodes.map((qr) => (
                <div key={qr.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getQRTypeIcon(qr.data.type)}
                      <span className="text-sm font-medium text-gray-900">
                        {getQRTypeLabel(qr.data.type)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {isExpired(qr.data.expiresAt) ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isExpired(qr.data.expiresAt)
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {isExpired(qr.data.expiresAt) ? 'Expired' : 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-3 mb-3">
                    <img
                      src={qr.qrCodeUrl}
                      alt="QR Code"
                      className="w-full h-32 object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        Expires: {new Date(qr.data.expiresAt).toLocaleDateString()} at{' '}
                        {new Date(qr.data.expiresAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>
                      <span>Permissions: {qr.data.permissions.join(', ')}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.download = `qr-upload-${qr.id}.png`;
                        link.href = qr.qrCodeUrl;
                        link.click();
                      }}
                      className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => revokeQRCode(qr.id)}
                      className="flex-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uploaded Files */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Mobile Uploaded Files</h3>
            <button
              onClick={loadUploadedFiles}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </button>
          </div>
          
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No files uploaded yet</p>
              <p className="text-sm text-gray-400">Files uploaded via QR codes will appear here within seconds</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.fileType)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {(file.fileSize / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleString()}
                      </p>
                      <div className="flex items-center space-x-1 mt-1">
                        {getStatusIcon(file.status)}
                        <span className="text-xs text-gray-500">{getStatusText(file.status)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.status === 'uploaded' && (
                      <button
                        onClick={() => processUploadedFile(file)}
                        className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Process
                      </button>
                    )}
                    {file.status === 'processed' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Ready for review
                      </span>
                    )}
                    {file.status === 'failed' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}