import React from 'react';
import { Upload, Users, BarChart3, Settings, FolderOpen, Smartphone, Shield, Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const { user } = useAuth();

  const navigationItems = [
    { id: 'upload', label: 'Upload Documents', icon: Upload, roles: ['clerk', 'admin'] },
    { id: 'documents', label: 'All Documents', icon: Database, roles: ['clerk', 'admin'] },
    { id: 'records', label: 'Records View', icon: FolderOpen, roles: ['clerk', 'admin'] },
    { id: 'mobile', label: 'Mobile Upload', icon: Smartphone, roles: ['clerk', 'admin'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
    { id: 'audit', label: 'Audit Log', icon: Shield, roles: ['admin'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['admin'] },
    { id: 'settings', label: 'Templates', icon: Settings, roles: ['admin'] },
  ];

  const visibleItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <nav className="bg-blue-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center space-x-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-yellow-400 text-yellow-400'
                    : 'border-transparent text-blue-200 hover:text-white hover:border-blue-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}