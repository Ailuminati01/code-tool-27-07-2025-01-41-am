import React from 'react';
import { BarChart3, TrendingUp, FileCheck, Users, Calendar, Target } from 'lucide-react';
import { useDocuments } from '../../contexts/DocumentContext';

export function AnalyticsDashboard() {
  const { documents } = useDocuments();

  const stats = {
    totalRecords: documents.length,
    finalizedRecords: documents.filter(d => d.status === 'finalized').length,
    pendingRecords: documents.filter(d => d.status === 'pending').length,
    avgConfidence: documents.length > 0 
      ? Math.round((documents.reduce((sum, doc) => sum + doc.confidence, 0) / documents.length) * 100)
      : 0,
    ocrSuccessRate: documents.length > 0 
      ? Math.round((documents.filter(d => d.confidence >= 0.8).length / documents.length) * 100)
      : 0
  };

  const documentsByType = documents.reduce((acc, doc) => {
    acc[doc.type.name] = (acc[doc.type.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const documentsByDate = documents.reduce((acc, doc) => {
    const date = new Date(doc.timestamp).toDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentActivity = documents
    .slice(-10)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Finalized</p>
              <p className="text-2xl font-bold text-gray-900">{stats.finalizedRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">OCR Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ocrSuccessRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents by Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Documents by Type</h3>
          <div className="space-y-4">
            {Object.entries(documentsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{type}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(count / stats.totalRecords) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
              recentActivity.map((doc) => (
                <div key={doc.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <FileCheck className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.type.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {doc.fields.officerName || doc.fields.recipientName || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(doc.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Performance Metrics</h3>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{stats.avgConfidence}%</div>
            <p className="text-sm text-gray-600">Average OCR Confidence</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.totalRecords > 0 ? Math.round((stats.finalizedRecords / stats.totalRecords) * 100) : 0}%
            </div>
            <p className="text-sm text-gray-600">Finalization Rate</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {documents.length > 0 ? Math.round(documents.length / 7) : 0}
            </div>
            <p className="text-sm text-gray-600">Avg. Documents/Day</p>
          </div>
        </div>
      </div>
    </div>
  );
}