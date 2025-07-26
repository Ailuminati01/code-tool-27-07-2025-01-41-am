import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle, AlertCircle, FileImage, Loader2, X } from 'lucide-react';
import { mobileUploadService, MobileUploadFile, MobileUploadSession } from '../../services/mobileUploadService';

interface MobileUploadPageProps {
  sessionId: string;
}

export function MobileUploadPage({ sessionId }: MobileUploadPageProps) {
  const [session, setSession] = useState<MobileUploadSession | null>(null);
  const [files, setFiles] = useState<MobileUploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Validate session
    const sessionData = mobileUploadService.getSession(sessionId);
    if (!sessionData) {
      setError('Invalid or expired upload session');
      return;
    }

    setSession(sessionData);
    setFiles(mobileUploadService.getSessionFiles(sessionId));

    // Subscribe to file updates
    const unsubscribe = mobileUploadService.subscribeToSession(sessionId, (updatedFiles) => {
      setFiles(updatedFiles);
    });

    return unsubscribe;
  }, [sessionId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    await uploadFiles(selectedFiles);
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    if (!session) return;

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
        
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
        }

        // Validate file type
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          throw new Error(`File ${file.name} is not supported. Only images and PDFs are allowed.`);
        }

        await mobileUploadService.uploadFile(sessionId, file);
      }

      setSuccess(`Successfully uploaded ${filesToUpload.length} file(s)!`);
      
      // Clear file inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="h-5 w-5" />;
    return <FileImage className="h-5 w-5" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
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
        return 'Uploaded';
      case 'processing':
        return 'Processing';
      case 'processed':
        return 'Processed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Session</h1>
            <p className="text-gray-600">
              This upload session is invalid or has expired. Please scan a new QR code.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-semibold">S.P.A.R.K. Mobile Upload</h1>
          <p className="text-blue-100 text-sm mt-1">Secure Police Document Upload</p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Session Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-gray-900">Upload Session</h2>
              <p className="text-xs text-gray-500">
                Expires: {new Date(session.expiresAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-600 font-medium">Active</span>
            </div>
          </div>
        </div>

        {/* Upload Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Upload Documents</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCameraCapture}
              disabled={isUploading}
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">Camera</span>
            </button>
            
            <button
              onClick={handleGalleryUpload}
              disabled={isUploading}
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">Gallery</span>
            </button>
          </div>

          {/* File inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Uploading files...</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-gray-500">{Math.round(uploadProgress)}%</span>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          </div>
        )}

        {/* Uploaded Files */}
        {files.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Uploaded Files</h3>
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md">
                  {getFileIcon(file.fileType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {(file.fileSize / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(file.status)}
                    <span className="text-xs text-gray-500">{getStatusText(file.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Instructions</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Use Camera to capture documents directly</li>
            <li>• Use Gallery to upload existing photos</li>
            <li>• Supported: Images (JPG, PNG) and PDFs</li>
            <li>• Maximum file size: 10MB</li>
            <li>• Files will be processed automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}