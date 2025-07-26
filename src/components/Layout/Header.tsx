import React from 'react';
import { Shield, LogOut, User, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'supervisor': return 'bg-yellow-600';
      case 'clerk': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <header className="bg-blue-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-yellow-400" />
            <div>
              <h1 className="text-xl font-bold text-white">S.P.A.R.K.</h1>
              <p className="text-blue-200 text-sm">Secure Police Archival & Record Keeper</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="text-blue-200 hover:text-white p-2 rounded-lg hover:bg-blue-800 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-3 bg-blue-800 rounded-lg px-4 py-2">
              <User className="h-5 w-5 text-blue-200" />
              <div className="text-left">
                <p className="text-white font-medium">{user?.fullName}</p>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getRoleBadgeColor(user?.role || '')}`}>
                    {user?.role?.toUpperCase()}
                  </span>
                  <span className="text-blue-200 text-sm">{user?.station}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="text-blue-200 hover:text-white p-2 rounded-lg hover:bg-blue-800 transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}