import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Eye, 
  Download, 
  Calendar, 
  User, 
  MapPin, 
  Database, 
  Cpu, 
  Box, 
  Layers,
  CheckCircle,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  Table,
  Hash,
  Activity,
  Shield,
  Zap,
  Stamp,
  PenTool,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService, StoredDocument } from '../../services/databaseService';
import { securityService } from '../../services/securityService';
import { DocumentValidationMetadata } from '../../types/documentValidation';

interface DocumentDetailsProps {
  documentId?: string;
  onClose?: () => void;
}

export function DocumentDetails({ documentId, onClose }: DocumentDetailsProps) {
  const { user } = useAuth();
  const [document, setDocument] = useState<StoredDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'extracted' | 'processing' | 'metadata' | 'audit' | 'validation'>('overview');
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [selectedBoundingBox, setSelectedBoundingBox] = useState<string | null>(null);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);

  useEffect(() => {
    if (documentId) {
      loadDocument(documentId);
    }
  }, [documentId]);

  const loadDocument = async (id: string) => {
    try {
      setLoading(true);
      const doc = await databaseService.getDocument(id);
      setDocument(doc);
      
      // Log document access
      if (user && doc) {
        securityService.logAction(
          user.id,
          'document_viewed',
          'document',
          id,
          { fileName: doc.type.name, viewedBy: user.fullName }
        );
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportDocument = () => {
    if (!document) return;

    const exportData = {
      basicInfo: {
        id: document.id,
        fileName: document.type.name,
        documentType: document.type.name,
        status: document.status,
        confidence: document.confidence,
        createdBy: document.createdBy,
        location: document.location,
        timestamp: document.timestamp
      },
      extractedData: document.fields,
      ocrText: document.ocrRawText,
      processingMetadata: document.processingMetadata,
      extractedImages: document.extractedImages,
      metadata: document.metadata,
      validationData: document.metadata?.documentMetadata?.validationMetadata
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${document.type.name}_${document.id}_details.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Log export action
    if (user) {
      securityService.logAction(
        user.id,
        'document_exported',
        'document',
        document.id,
        { exportFormat: 'json', exportedBy: user.fullName }
      );
    }
  };

  const renderBoundingBoxes = () => {
    if (!showBoundingBoxes || !document?.metadata?.boundingBoxes) return null;

    return document.metadata.boundingBoxes.map((bbox: any) => (
      <div
        key={bbox.id}
        className={`absolute border-2 cursor-pointer transition-all ${
          selectedBoundingBox === bbox.id
            ? 'border-red-500 bg-red-100 bg-opacity-30'
            : getBoundingBoxColor(bbox.type)
        }`}
        style={{
          left: `${(bbox.bbox.x / 800) * 100}%`,
          top: `${(bbox.bbox.y / 600) * 100}%`,
          width: `${(bbox.bbox.width / 800) * 100}%`,
          height: `${(bbox.bbox.height / 600) * 100}%`,
        }}
        onClick={() => setSelectedBoundingBox(selectedBoundingBox === bbox.id ? null : bbox.id)}
        title={`${bbox.type}: ${bbox.label} (${Math.round(bbox.confidence * 100)}%)`}
      >
        <div className="absolute -top-6 left-0 bg-black text-white text-xs px-1 py-0.5 rounded opacity-75">
          {bbox.type}
        </div>
      </div>
    ));
  };

  const getBoundingBoxColor = (type: string) => {
    const colors = {
      text: 'border-blue-500 bg-blue-100 bg-opacity-20',
      title: 'border-purple-500 bg-purple-100 bg-opacity-20',
      header: 'border-green-500 bg-green-100 bg-opacity-20',
      footer: 'border-orange-500 bg-orange-100 bg-opacity-20',
      table: 'border-yellow-500 bg-yellow-100 bg-opacity-20',
      figure: 'border-pink-500 bg-pink-100 bg-opacity-20',
      list: 'border-indigo-500 bg-indigo-100 bg-opacity-20'
    };
    return colors[type as keyof typeof colors] || 'border-gray-500 bg-gray-100 bg-opacity-20';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'finalized':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finalized':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getValidationMetadata = (): DocumentValidationMetadata | null => {
    if (!document?.metadata?.documentMetadata?.validationMetadata) {
      return null;
    }
    return document.metadata.documentMetadata.validationMetadata;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Document not found</p>
      </div>
    );
  }

  const validationMetadata = getValidationMetadata();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(document.status)}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{document.type.name}</h2>
              <p className="text-sm text-gray-600">Document ID: {document.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(document.status)}`}>
              {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
            </span>
            <button
              onClick={exportDocument}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Details
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Confidence</p>
              <p className="text-sm font-medium">{Math.round(document.confidence * 100)}%</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm font-medium">{new Date(document.timestamp).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Created By</p>
              <p className="text-sm font-medium">{document.createdBy}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-orange-600" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium">{document.location}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'extracted', label: 'Extracted Data', icon: Database },
              { id: 'processing', label: 'Processing Details', icon: Cpu },
              { id: 'validation', label: 'Stamp & Signature', icon: Stamp },
              { id: 'metadata', label: 'Metadata', icon: Hash },
              ...(user?.role === 'admin' ? [{ id: 'audit', label: 'Audit Trail', icon: Shield }] : [])
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Document Preview */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Document Preview</h3>
                <div className="relative border rounded-lg overflow-hidden bg-gray-50">
                  <div className="relative w-full h-96">
                    {document.imageUrl ? (
                      <img
                        src={document.imageUrl}
                        alt="Document"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <FileText className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Render bounding boxes */}
                    {renderBoundingBoxes()}
                  </div>
                </div>
                
                <div className="mt-2 flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showBoundingBoxes}
                      onChange={(e) => setShowBoundingBoxes(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show Bounding Boxes</span>
                  </label>
                  {selectedBoundingBox && (
                    <button
                      onClick={() => setSelectedBoundingBox(null)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {/* Key Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Key Information</h3>
                  <div className="space-y-3">
                    {Object.entries(document.fields).slice(0, 8).map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-sm text-gray-600 text-right max-w-xs truncate">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation Summary */}
                {validationMetadata && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Validation Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-3 rounded-lg ${validationMetadata.stampValidation.status === 'Present' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center space-x-2">
                          <Stamp className={`h-5 w-5 ${validationMetadata.stampValidation.status === 'Present' ? 'text-green-600' : 'text-red-600'}`} />
                          <div>
                            <p className="text-xs text-gray-600">Official Stamps</p>
                            <p className="text-sm font-medium">
                              {validationMetadata.stampValidation.status} ({validationMetadata.stampValidation.count})
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${validationMetadata.stampValidation.matchesMasterList ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center space-x-2">
                          <Check className={`h-5 w-5 ${validationMetadata.stampValidation.matchesMasterList ? 'text-green-600' : 'text-red-600'}`} />
                          <div>
                            <p className="text-xs text-gray-600">Master List Match</p>
                            <p className="text-sm font-medium">
                              {validationMetadata.stampValidation.matchesMasterList ? 'Y' : 'N'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${validationMetadata.signatureValidation.status === 'Present' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center space-x-2">
                          <PenTool className={`h-5 w-5 ${validationMetadata.signatureValidation.status === 'Present' ? 'text-green-600' : 'text-red-600'}`} />
                          <div>
                            <p className="text-xs text-gray-600">Signatures</p>
                            <p className="text-sm font-medium">
                              {validationMetadata.signatureValidation.status} ({validationMetadata.signatureValidation.count})
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-blue-600">Completeness</p>
                            <p className="text-sm font-medium text-blue-900">
                              {validationMetadata.overallValidation.completeness}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Extracted Data Tab */}
          {activeTab === 'extracted' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">All Extracted Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(document.fields).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <p className="text-sm text-gray-900 break-words">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* OCR Text */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Full OCR Text</h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">{document.ocrRawText}</pre>
                </div>
              </div>

              {/* Extracted Images */}
              {document.extractedImages && document.extractedImages.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Extracted Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {document.extractedImages.map((img) => (
                      <div key={img.id} className="border rounded-lg p-3">
                        <img
                          src={img.base64Data}
                          alt={img.description}
                          className="w-full h-20 object-contain bg-gray-50 rounded mb-2"
                        />
                        <p className="text-xs text-center text-gray-600">
                          {img.type} ({Math.round(img.confidence * 100)}%)
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Tab */}
          {activeTab === 'validation' && validationMetadata && (
            <div className="space-y-6">
              {/* Validation Summary */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Validation Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Stamp Validation</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Status:</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${validationMetadata.stampValidation.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {validationMetadata.stampValidation.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Count:</span>
                        <span className="text-sm font-medium">{validationMetadata.stampValidation.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Master List Match:</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${validationMetadata.stampValidation.matchesMasterList ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {validationMetadata.stampValidation.matchesMasterList ? 'Y' : 'N'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Validation Time:</span>
                        <span className="text-sm text-gray-600">
                          {new Date(validationMetadata.stampValidation.validationTimestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Signature Validation</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Status:</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${validationMetadata.signatureValidation.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {validationMetadata.signatureValidation.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Count:</span>
                        <span className="text-sm font-medium">{validationMetadata.signatureValidation.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Validation Time:</span>
                        <span className="text-sm text-gray-600">
                          {new Date(validationMetadata.signatureValidation.validationTimestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detected Stamps */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Detected Stamps</h3>
                {validationMetadata.stampValidation.detected.length === 0 ? (
                  <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <Stamp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No stamps detected in this document</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {validationMetadata.stampValidation.detected.map((stamp, index) => (
                      <div 
                        key={stamp.id}
                        className={`border rounded-lg p-4 cursor-pointer ${
                          selectedStamp === stamp.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedStamp(selectedStamp === stamp.id ? null : stamp.id)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Stamp className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-medium">Stamp {index + 1}</span>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            stamp.matchesMasterList ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            Match: {stamp.matchesMasterList ? 'Y' : 'N'}
                          </span>
                        </div>
                        
                        {stamp.matchesMasterList && stamp.matchedStampType && (
                          <p className="text-xs text-green-700 mb-2">
                            Matched: {stamp.matchedStampType}
                          </p>
                        )}
                        
                        <div className="flex justify-between text-xs text-gray-600 mb-2">
                          <span>Type: {stamp.type.replace('_', ' ')}</span>
                          <span>Confidence: {Math.round(stamp.confidence * 100)}%</span>
                        </div>
                        
                        {selectedStamp === stamp.id && (
                          <div className="mt-2">
                            <img 
                              src={stamp.imageData} 
                              alt={`Stamp ${index + 1}`}
                              className="w-full h-auto border rounded-lg"
                            />
                            <div className="mt-2 text-xs text-gray-500">
                              <p>Location: {stamp.location}</p>
                              <p>Bounding Box: ({stamp.boundingBox.x}, {stamp.boundingBox.y}, {stamp.boundingBox.width}×{stamp.boundingBox.height})</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detected Signatures */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Detected Signatures</h3>
                {validationMetadata.signatureValidation.detected.length === 0 ? (
                  <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <PenTool className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No signatures detected in this document</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {validationMetadata.signatureValidation.detected.map((signature, index) => (
                      <div 
                        key={signature.id}
                        className={`border rounded-lg p-4 cursor-pointer ${
                          selectedSignature === signature.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedSignature(selectedSignature === signature.id ? null : signature.id)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <PenTool className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-medium">Signature {index + 1}</span>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {signature.type.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-600 mb-2">
                          <span>Location: {signature.location}</span>
                          <span>Confidence: {Math.round(signature.confidence * 100)}%</span>
                        </div>
                        
                        {selectedSignature === signature.id && (
                          <div className="mt-2">
                            <img 
                              src={signature.imageData} 
                              alt={`Signature ${index + 1}`}
                              className="w-full h-auto border rounded-lg"
                            />
                            <div className="mt-2 text-xs text-gray-500">
                              <p>Bounding Box: ({signature.boundingBox.x}, {signature.boundingBox.y}, {signature.boundingBox.width}×{signature.boundingBox.height})</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Overall Validation */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Validation</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-700">Completeness:</span>
                    <div className="flex items-center">
                      <div className="w-48 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className={`h-2.5 rounded-full ${
                            validationMetadata.overallValidation.completeness >= 70 ? 'bg-green-600' :
                            validationMetadata.overallValidation.completeness >= 40 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                          style={{ width: `${validationMetadata.overallValidation.completeness}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {validationMetadata.overallValidation.completeness}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-700">Valid Document:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      validationMetadata.overallValidation.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {validationMetadata.overallValidation.isValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  {validationMetadata.overallValidation.missingElements.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700">Missing Elements:</span>
                      <ul className="mt-1 list-disc list-inside text-sm text-red-600">
                        {validationMetadata.overallValidation.missingElements.map((element, index) => (
                          <li key={index}>{element}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    <p>Validated by: {validationMetadata.overallValidation.validatedBy}</p>
                    <p>Validated at: {new Date(validationMetadata.overallValidation.validatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Details Tab */}
          {activeTab === 'processing' && (
            <div className="space-y-6">
              {/* Processing Metadata */}
              {document.processingMetadata && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Document Classification */}
                    {document.processingMetadata.documentClassification && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-3">Document Classification</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Type:</span>
                            <span className="text-blue-900 font-medium">
                              {document.processingMetadata.documentClassification.documentType}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Language:</span>
                            <span className="text-blue-900 font-medium">
                              {document.processingMetadata.documentClassification.language}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Orientation:</span>
                            <span className="text-blue-900 font-medium">
                              {document.processingMetadata.documentClassification.orientation}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quality Metrics */}
                    {document.processingMetadata.qualityMetrics && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-green-900 mb-3">Quality Metrics</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-700">Overall Quality:</span>
                            <span className="text-green-900 font-medium">
                              {Math.round(document.processingMetadata.qualityMetrics.overallQuality * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">Text Clarity:</span>
                            <span className="text-green-900 font-medium">
                              {Math.round(document.processingMetadata.qualityMetrics.textClarity * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">Image Quality:</span>
                            <span className="text-green-900 font-medium">
                              {Math.round(document.processingMetadata.qualityMetrics.imageQuality * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">OCR Confidence:</span>
                            <span className="text-green-900 font-medium">
                              {Math.round(document.processingMetadata.qualityMetrics.ocrConfidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Layout Analysis */}
              {document.processingMetadata?.layoutAnalysis && document.processingMetadata.layoutAnalysis.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Layout Analysis</h3>
                  <div className="space-y-3">
                    {document.processingMetadata.layoutAnalysis.map((element: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">{element.type}</span>
                          <span className="text-xs text-gray-500">
                            {Math.round(element.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{element.content || 'Layout element detected'}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          Position: ({element.bbox.x}, {element.bbox.y}) - {element.bbox.width}×{element.bbox.height}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bounding Boxes */}
              {document.metadata?.boundingBoxes && document.metadata.boundingBoxes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Detected Elements</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {document.metadata.boundingBoxes.map((bbox: any) => (
                      <div
                        key={bbox.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedBoundingBox === bbox.id
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedBoundingBox(selectedBoundingBox === bbox.id ? null : bbox.id)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">{bbox.type}</span>
                          <span className="text-xs text-gray-500">{Math.round(bbox.confidence * 100)}%</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Position: ({bbox.bbox.x}, {bbox.bbox.y}) - {bbox.bbox.width}×{bbox.bbox.height}
                        </div>
                        {bbox.text && (
                          <div className="text-sm text-gray-700 mt-1 truncate">{bbox.text}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata Tab */}
          {activeTab === 'metadata' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Document Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Document ID</span>
                      <span className="text-sm text-gray-600 font-mono">{document.id}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Template Version</span>
                      <span className="text-sm text-gray-600">{document.templateVersion}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Created By</span>
                      <span className="text-sm text-gray-600">{document.createdBy}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Location</span>
                      <span className="text-sm text-gray-600">{document.location}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Created At</span>
                      <span className="text-sm text-gray-600">
                        {new Date(document.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Status</span>
                      <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(document.status)}`}>
                        {document.status}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Confidence Score</span>
                      <span className="text-sm text-gray-600">{Math.round(document.confidence * 100)}%</span>
                    </div>
                    {document.finalizedBy && (
                      <>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-700">Finalized By</span>
                          <span className="text-sm text-gray-600">{document.finalizedBy}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-700">Finalized On</span>
                          <span className="text-sm text-gray-600">
                            {document.finalizedOn ? new Date(document.finalizedOn).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Audit Trail Tab (Admin only) */}
          {activeTab === 'audit' && user?.role === 'admin' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Trail</h3>
              <div className="space-y-3">
                {securityService.getAuditLogs({ resource: 'document', resourceId: document.id }).map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{log.action}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      User: {log.userId} | IP: {log.ipAddress}
                    </div>
                    {Object.keys(log.details).length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Details: {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}