import React, { useState, useRef } from 'react';
import { 
  Stamp, 
  PenTool, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  Download,
  FileImage, 
  Upload,
  Shield,
  Zap,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { stampSignatureService, StampSignatureAnalysisResult } from '../../services/stampSignatureService';

// Define the expected response format
interface StampAnalysisResult {
  Status: 'Present' | 'Absent';
  Coordinates: [number, number, number, number] | null;
}

interface SignatureAnalysisResult {
  Status: 'Present' | 'Absent';
  Coordinates: [number, number, number, number] | null;
}

// Master list of official stamps for validation
const OFFICIAL_STAMPS = [
  "OFFICER COMMANDING 14th BN A.P.S.P. ANANTHAPURAMU",
  "STATE OFFICER TO ADGP APSP HEAD OFFICE MANGALAGIRI",
  "Inspector General of Police APSP Bns, Amaravathi",
  "Dy. Inspector General of Police-IV APSP Battalions, Mangalagiri",
  "Sd/- B. Sreenivasulu, IPS., Addl. Commissioner of Police, Vijayawada City",
  "Dr. SHANKHABRATA BAGCHI IPS., Addl. Director General of Police, APSP Battalions"
];

export function StampSignatureAnalyzer() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StampSignatureAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPdf, setIsPdf] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
      setIsPdf(file.type === 'application/pdf');
      setAnalysisResult(null);
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !user) return;

    setIsAnalyzing(true);
    setError('');

    try {
      // Call the stamp signature service
      const result = await stampSignatureService.analyzeStampsAndSignatures(selectedFile, user.id);
      setAnalysisResult(result);
      
      // Draw bounding boxes on canvas if not PDF
      if (!isPdf) {
        drawBoundingBoxes(result);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const drawBoundingBoxes = (result: StampSignatureAnalysisResult) => {
    if (!canvasRef.current || !previewUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Load and draw the original image
    const img = new Image();
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image
      ctx.drawImage(img, 0, 0);
      
      // Draw stamp bounding box if present
      if (result.Stamp.Status === 'Present' && result.Stamp.Coordinates) {
        const [x, y, width, height] = result.Stamp.Coordinates;
        
        ctx.strokeStyle = result.StampValidation === 'Y' ? '#10B981' : '#F59E0B'; // Green if valid, amber if not
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        
        // Add label
        ctx.fillStyle = result.StampValidation === 'Y' ? '#10B981' : '#F59E0B';
        ctx.fillRect(x, y - 25, 120, 25);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(`Stamp ${result.StampValidation === 'Y' ? '✓' : '✗'}`, x + 10, y - 8);
      }
      
      // Draw signature bounding box if present
      if (result.Signature.Status === 'Present' && result.Signature.Coordinates) {
        const [x, y, width, height] = result.Signature.Coordinates;
        
        ctx.strokeStyle = '#3B82F6'; // Blue for signatures
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        
        // Add label
        ctx.fillStyle = '#3B82F6';
        ctx.fillRect(x, y - 25, 100, 25);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText('Signature', x + 10, y - 8);
      }
    };
    
    img.src = previewUrl;
  };

  const downloadResults = () => {
    if (!analysisResult || !selectedFile) return;

    const results = {
      fileName: selectedFile.name,
      analysisDate: new Date().toISOString(),
      stamp: analysisResult.Stamp,
      signature: analysisResult.Signature,
      stampValidation: analysisResult.StampValidation,
      matchedStampType: analysisResult.MatchedStampType
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stamp_signature_analysis_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Stamp className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Stamp & Signature Analyzer</h2>
              <p className="text-sm text-gray-600">
                Upload a document to detect and validate official stamps and signatures
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Document for Analysis</h3>
        
        {!selectedFile ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="text-center">
              <FileImage className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Upload Document</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a document to analyze for stamps and signatures
              </p>
              <div className="mt-6">
                <label className="cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <span className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Analyze
                    </>
                  )}
                </button>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <span className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Choose Different File
                  </span>
                </label>
              </div>
            </div>

            {/* Document Preview */}
            <div className="relative border rounded-lg overflow-hidden bg-gray-50">
              <div className="relative w-full h-96">
                {isPdf ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Analysis Results</h3>
            <button
              onClick={downloadResults}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Results
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Stamp Detection */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Stamp className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium text-gray-900">Stamp Detection</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {analysisResult.Stamp.Status === 'Present' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    analysisResult.Stamp.Status === 'Present' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Status: {analysisResult.Stamp.Status}
                  </span>
                </div>
                {analysisResult.Stamp.Coordinates && (
                  <div className="text-xs text-gray-600">
                    Coordinates: [{analysisResult.Stamp.Coordinates.join(', ')}]
                  </div>
                )}
              </div>
            </div>

            {/* Stamp Validation */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">Stamp Validation</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {analysisResult.StampValidation === 'Y' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    analysisResult.StampValidation === 'Y' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Valid: {analysisResult.StampValidation}
                  </span>
                </div>
                {analysisResult.MatchedStampType && (
                  <div className="text-xs text-green-700 font-medium">
                    Matched: {analysisResult.MatchedStampType}
                  </div>
                )}
                {analysisResult.StampValidation === 'N' && (
                  <div className="text-xs text-red-700">
                    No match found in master list
                  </div>
                )}
              </div>
            </div>

            {/* Signature Detection */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <PenTool className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">Signature Detection</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {analysisResult.Signature.Status === 'Present' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    analysisResult.Signature.Status === 'Present' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Status: {analysisResult.Signature.Status}
                  </span>
                </div>
                {analysisResult.Signature.Coordinates && (
                  <div className="text-xs text-gray-600">
                    Coordinates: [{analysisResult.Signature.Coordinates.join(', ')}]
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-blue-900">Validation Summary</h4>
            </div>
            <div className="space-y-1 text-sm text-blue-800">
              <p>• Stamp: {analysisResult.Stamp.Status}</p>
              <p>• Signature: {analysisResult.Signature.Status}</p>
              <p>• Official Stamp Validation: {analysisResult.StampValidation}</p>
              {analysisResult.MatchedStampType && (
                <p>• Matched Stamp Type: {analysisResult.MatchedStampType}</p>
              )}
              <p className="text-xs text-blue-600 mt-2">
                This document {analysisResult.Stamp.Status === 'Present' && analysisResult.Signature.Status === 'Present' && analysisResult.StampValidation === 'Y' 
                  ? 'has valid stamps and signatures' 
                  : 'may require additional verification'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}