import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration - removed supervisor role
const mockUsers: User[] = [
  {
    id: '1',
    username: 'clerk1',
    fullName: 'Officer Rajesh Kumar',
    role: 'clerk',
    station: 'Vijayawada Central',
    createdAt: '2024-01-15T08:00:00Z',
    lastLogin: '2025-01-20T09:30:00Z'
  },
  {
    id: '2',
    username: 'clerk2',
    fullName: 'Officer Priya Sharma',
    role: 'clerk',
    station: 'Vijayawada Central',
    createdAt: '2024-01-10T08:00:00Z',
    lastLogin: '2025-01-20T10:15:00Z'
  },
  {
    id: '3',
    username: 'admin1',
    fullName: 'DGP Anand Prasad',
    role: 'admin',
    station: 'State Headquarters',
    createdAt: '2024-01-01T08:00:00Z',
    lastLogin: '2025-01-20T11:00:00Z'
  }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('spark_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find(u => u.username === username);
    
    if (foundUser && password === 'password123') {
      const updatedUser = { ...foundUser, lastLogin: new Date().toISOString() };
      setUser(updatedUser);
      localStorage.setItem('spark_user', JSON.stringify(updatedUser));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('spark_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}