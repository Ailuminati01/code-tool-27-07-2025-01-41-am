export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  sessionId: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  actions: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  rules: AccessRule[];
  isActive: boolean;
  priority: number;
}

export interface AccessRule {
  id: string;
  condition: string;
  effect: 'allow' | 'deny';
  resources: string[];
  actions: string[];
}

export interface EncryptionKey {
  id: string;
  algorithm: string;
  keySize: number;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}