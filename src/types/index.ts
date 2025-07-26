export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'clerk' | 'admin';
  station: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Document {
  id: string;
  type: DocumentType;
  templateVersion: string;
  tags: string[];
  fields: Record<string, any>;
  ocrRawText: string;
  imageUrl: string;
  createdBy: string;
  timestamp: string;
  location: string;
  status: 'pending' | 'finalized' | 'rejected';
  finalizedBy?: string;
  finalizedOn?: string;
  confidence: number;
  metadata?: {
    processingMethod?: string;
    layout?: any[];
    tables?: any[];
    documentMetadata?: any;
  };
}

export interface DocumentType {
  id: string;
  name: string;
  category: string;
  template: FormField[];
  validationRules: ValidationRule[];
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
  validation?: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
}

export interface UploadSession {
  id: string;
  userId: string;
  documents: Document[];
  status: 'active' | 'completed';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface Analytics {
  totalRecords: number;
  ocrSuccessRate: number;
  mostActiveUsers: { userId: string; count: number }[];
  trendsByType: Record<string, number>;
}