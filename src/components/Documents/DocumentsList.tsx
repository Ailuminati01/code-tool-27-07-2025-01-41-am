import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Calendar, 
  User, 
  MapPin, 
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Database,
  Cpu,
  Box
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService, StoredDocument } from '../../services/databaseService';
import { DocumentDetails } from './DocumentDetails';

export function DocumentsList() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'finalized' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [documents, searchTerm, statusFilter, typeFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await databaseService.getAllDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = documents.filter(doc => {
      const matchesSearch = searchTerm === '' || 
        Object.values(doc.fields).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        doc.type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      const matchesType = typeFilter === 'all' || doc.type.name === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });

    setFilteredDocuments(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'finalized':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finalized':
        return 'text-green-700 bg-green-100';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      case 'rejected':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getProcessingMethodIcon = (method: string) => {
    switch (method) {
      case 'layoutlmv3':
        return <Cpu className="h-4 w-4 text-blue-600" />;
      case 'basic-ocr':
        return <FileText className="h-4 w-4 text-gray-600" />;
      default:
        return <Database className="h-4 w-4 text-purple-600" />;
    }
  };

  const exportDocument = (doc: StoredDocument) => {
    const exportData = {
      id: doc.id,
      type: doc.type.name,
      status: doc.status,
      confidence: doc.confidence,
      createdBy: doc.createdBy,
      location: doc.location,
      timestamp: doc.timestamp,
      extractedFields: doc.fields,
      ocrText: doc.ocrRawText
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.type.name}_${doc.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const documentTypes = [...new Set(documents.map(doc => doc.type.name))];

  if (selectedDocument) {
    return (
      <DocumentDetails
        documentId={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">All Documents</h2>
            <p className="text-sm text-gray-600 mt-1">
              View and manage all uploaded documents with detailed information
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            <div className="bg-blue-50 px-3 py-2 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                {filteredDocuments.length} of {documents.length} documents
              </span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by document ID, content, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="finalized">Finalized</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {documentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confidence Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Min %"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Max %"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created By
                  </label>
                  <input
                    type="text"
                    placeholder="User ID or name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No documents found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <h3 className="font-medium text-gray-900">{doc.type.name}</h3>
                      <p className="text-sm text-gray-500">ID: {doc.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(doc.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>{doc.createdBy}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{doc.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(doc.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    {getProcessingMethodIcon(doc.metadata?.processingMethod || 'standard')}
                    <span className="capitalize">
                      {doc.metadata?.processingMethod?.replace('-', ' ') || 'Standard'}
                    </span>
                  </div>
                </div>

                {/* Key Fields Preview */}
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Information:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {Object.entries(doc.fields).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="ml-1 text-gray-800">{String(value).substring(0, 30)}...</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Processing Details */}
                <div className="mb-3">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Database className="h-3 w-3" />
                      <span>{Object.keys(doc.fields).length} fields extracted</span>
                    </span>
                    {doc.metadata?.boundingBoxes && (
                      <span className="flex items-center space-x-1">
                        <Box className="h-3 w-3" />
                        <span>{doc.metadata.boundingBoxes.length} elements detected</span>
                      </span>
                    )}
                    {doc.extractedImages && doc.extractedImages.length > 0 && (
                      <span className="flex items-center space-x-1">
                        <FileText className="h-3 w-3" />
                        <span>{doc.extractedImages.length} images extracted</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* OCR Text Preview */}
                <div className="mb-3">
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {doc.ocrRawText.substring(0, 200)}...
                  </p>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedDocument(doc.id)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </button>
                  <button
                    onClick={() => exportDocument(doc)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </button>
                </div>

                {doc.status === 'finalized' && doc.finalizedBy && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Finalized by {doc.finalizedBy} on {doc.finalizedOn ? new Date(doc.finalizedOn).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}