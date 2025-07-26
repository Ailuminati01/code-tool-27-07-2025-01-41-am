import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Header } from './components/Layout/Header';
import { Navigation } from './components/Layout/Navigation';
import { UploadInterface } from './components/Documents/UploadInterface';
import { RecordsList } from './components/Documents/RecordsList';
import { DocumentsList } from './components/Documents/DocumentsList';
import { AnalyticsDashboard } from './components/Analytics/Dashboard';
import { UserManagement } from './components/Admin/UserManagement';
import { TemplateManager } from './components/Admin/TemplateManager';
import { QRUpload } from './components/Mobile/QRUpload';
import { MobileUploadPage } from './components/Mobile/MobileUploadPage';
import { AuditLog } from './components/Security/AuditLog';

function AppContent() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('upload');

  if (!user) {
    return <LoginForm />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'upload':
        return <UploadInterface />;
      case 'records':
        return <RecordsList />;
      case 'documents':
        return <DocumentsList />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'mobile':
        return <QRUpload />;
      case 'audit':
        return <AuditLog />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <TemplateManager />;
      default:
        return <UploadInterface />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
}

// Mobile upload page component
function MobileUploadRoute() {
  const { sessionId } = useParams<{ sessionId: string }>();
  
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid URL</h1>
            <p className="text-gray-600">Please scan a valid QR code.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return <MobileUploadPage sessionId={sessionId} />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <DocumentProvider>
          <Routes>
            <Route path="/mobile-upload/:sessionId" element={<MobileUploadRoute />} />
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </DocumentProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;