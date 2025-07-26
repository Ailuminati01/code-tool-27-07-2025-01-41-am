import CryptoJS from 'crypto-js';
import { AuditLog, Permission, Role, AccessPolicy } from '../types/security';

class SecurityService {
  private auditLogs: AuditLog[] = [];
  private permissions: Map<string, Permission> = new Map();
  private roles: Map<string, Role> = new Map();
  private policies: Map<string, AccessPolicy> = new Map();
  private encryptionKey = 'SPARK_ENCRYPTION_KEY_2025'; // In production, use proper key management

  constructor() {
    this.initializeDefaultRoles();
    this.initializeDefaultPermissions();
  }

  // Encryption/Decryption
  encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Audit Logging
  logAction(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, any> = {},
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'Unknown',
    sessionId: string = 'session_' + Date.now()
  ): void {
    const auditLog: AuditLog = {
      id: this.generateId('audit'),
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
      sessionId
    };

    this.auditLogs.push(auditLog);
    
    // In production, this would be sent to a secure logging service
    console.log('Audit Log:', auditLog);
  }

  getAuditLogs(filters?: {
    userId?: string;
    resource?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): AuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.resource) {
        logs = logs.filter(log => log.resource === filters.resource);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Role-Based Access Control
  hasPermission(userId: string, resource: string, action: string): boolean {
    // This would typically check against a user's roles and permissions
    // For now, return a simplified check
    return true; // Simplified for demo
  }

  getUserRoles(userId: string): Role[] {
    // This would fetch from database
    return Array.from(this.roles.values()).filter(role => 
      // Simplified role assignment logic
      userId.includes(role.name.toLowerCase())
    );
  }

  createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Role {
    const role: Role = {
      ...roleData,
      id: this.generateId('role'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.roles.set(role.id, role);
    return role;
  }

  updateRole(id: string, updates: Partial<Role>): Role | null {
    const role = this.roles.get(id);
    if (!role) return null;

    const updatedRole = {
      ...role,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.roles.set(id, updatedRole);
    return updatedRole;
  }

  // Data Validation and Sanitization
  sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .trim();
  }

  validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  validateFileSize(file: File, maxSizeBytes: number): boolean {
    return file.size <= maxSizeBytes;
  }

  // Session Management
  generateSessionToken(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  validateSessionToken(token: string): boolean {
    // In production, this would validate against stored sessions
    return token.length > 0;
  }

  private initializeDefaultRoles(): void {
    const defaultRoles: Role[] = [
      {
        id: 'role_admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: ['*'],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'role_clerk',
        name: 'Clerk',
        description: 'Document upload and basic operations',
        permissions: ['document.create', 'document.read', 'document.update'],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    defaultRoles.forEach(role => this.roles.set(role.id, role));
  }

  private initializeDefaultPermissions(): void {
    const defaultPermissions: Permission[] = [
      {
        id: 'perm_doc_create',
        name: 'Create Documents',
        description: 'Upload and create new documents',
        resource: 'document',
        actions: ['create']
      },
      {
        id: 'perm_doc_read',
        name: 'Read Documents',
        description: 'View and search documents',
        resource: 'document',
        actions: ['read']
      },
      {
        id: 'perm_doc_update',
        name: 'Update Documents',
        description: 'Edit document metadata',
        resource: 'document',
        actions: ['update']
      }
    ];

    defaultPermissions.forEach(perm => this.permissions.set(perm.id, perm));
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }
}

export const securityService = new SecurityService();