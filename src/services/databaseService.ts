import Dexie, { Table } from 'dexie';
import { Document, DocumentType } from '../types';
import { securityService } from './securityService';
import { supabaseService } from './supabaseService';

export interface StoredDocument extends Document {
  documentData?: string; // Base64 encoded document data
  extractedImages?: ExtractedImage[];
  processingMetadata?: ProcessingMetadata;
}

export interface ExtractedImage {
  id: string;
  type: 'logo' | 'stamp' | 'signature' | 'photo' | 'diagram';
  base64Data: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  description?: string;
}

export interface ProcessingMetadata {
  layoutAnalysis: LayoutElement[];
  tableData: TableData[];
  documentClassification: DocumentClassification;
  qualityMetrics: QualityMetrics;
}

export interface LayoutElement {
  type: 'header' | 'footer' | 'title' | 'text' | 'table' | 'figure' | 'list';
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  content: string;
  tokens?: TokenInfo[];
}

export interface TokenInfo {
  text: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  entityType?: string;
}

export interface TableData {
  id: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rows: TableRow[];
  headers: string[];
  confidence: number;
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableCell {
  text: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rowSpan?: number;
  colSpan?: number;
}

export interface DocumentClassification {
  documentType: string;
  confidence: number;
  subType?: string;
  language: string;
  orientation: 'portrait' | 'landscape';
}

export interface QualityMetrics {
  overallQuality: number;
  textClarity: number;
  imageQuality: number;
  layoutComplexity: number;
  ocrConfidence: number;
}

class SparkDatabase extends Dexie {
  documents!: Table<StoredDocument>;
  templates!: Table<DocumentType>;
  auditLogs!: Table<any>;
  users!: Table<any>;

  constructor() {
    super('SparkDatabase');
    
    this.version(1).stores({
      documents: '++id, type.id, createdBy, timestamp, status, location, confidence, [type.id+status], [createdBy+timestamp]',
      templates: '++id, name, category, [category+name]',
      auditLogs: '++id, userId, action, resource, timestamp, [userId+timestamp], [action+timestamp]',
      users: '++id, username, role, station, createdAt'
    });

    // Add hooks for audit logging
    this.documents.hook('creating', (primKey, obj, trans) => {
      securityService.logAction(
        obj.createdBy,
        'document_created',
        'document',
        obj.id,
        { 
          documentType: obj.type.name,
          confidence: obj.confidence,
          location: obj.location
        }
      );
    });

    this.documents.hook('updating', (modifications, primKey, obj, trans) => {
      securityService.logAction(
        'current_user',
        'document_updated',
        'document',
        obj.id,
        { 
          modifications: Object.keys(modifications),
          documentType: obj.type.name
        }
      );
    });

    this.documents.hook('deleting', (primKey, obj, trans) => {
      securityService.logAction(
        'current_user',
        'document_deleted',
        'document',
        obj.id,
        { 
          documentType: obj.type.name,
          originalLocation: obj.location
        }
      );
    });

    this.templates.hook('creating', (primKey, obj, trans) => {
      securityService.logAction(
        'current_user',
        'template_created',
        'template',
        obj.id,
        { 
          templateName: obj.name,
          category: obj.category,
          fieldsCount: obj.template.length
        }
      );
    });

    this.templates.hook('updating', (modifications, primKey, obj, trans) => {
      securityService.logAction(
        'current_user',
        'template_updated',
        'template',
        obj.id,
        { 
          modifications: Object.keys(modifications),
          templateName: obj.name
        }
      );
    });

    this.templates.hook('deleting', (primKey, obj, trans) => {
      securityService.logAction(
        'current_user',
        'template_deleted',
        'template',
        obj.id,
        { 
          templateName: obj.name,
          category: obj.category
        }
      );
    });
  }
}

class DatabaseService {
  private db: SparkDatabase;
  private useSupabase: boolean = true; // Re-enabled Supabase
  private syncInProgress: boolean = false;

  constructor() {
    this.db = new SparkDatabase();
    this.initializeSupabaseSync();
  }

  private async initializeSupabaseSync() {
    try {
      // Check if Supabase is properly configured
      const configStatus = supabaseService.getConfigurationStatus();
      if (!configStatus.configured) {
        console.warn('Supabase not configured:', configStatus.message);
        this.useSupabase = false;
        return;
      }

      // Test Supabase connection
      const isConnected = await supabaseService.checkConnection();
      if (!isConnected) {
        console.warn('Supabase connection failed, using IndexedDB only');
        this.useSupabase = false;
        return;
      }

      console.log('Supabase connected successfully');
      this.useSupabase = true;

      // Sync existing data to Supabase
      await this.syncExistingDataToSupabase();
    } catch (error) {
      console.error('Failed to initialize Supabase sync:', error);
      this.useSupabase = false;
    }
  }

  private async syncExistingDataToSupabase(): Promise<void> {
    if (this.syncInProgress || !this.useSupabase) return;

    try {
      this.syncInProgress = true;
      console.log('Starting sync of existing data to Supabase...');

      // Get all local data
      const localDocuments = await this.db.documents.toArray();
      const localTemplates = await this.db.templates.toArray();

      // Sync to Supabase
      const syncResult = await supabaseService.syncIndexedDBToSupabase(localDocuments, localTemplates);
      
      console.log('Sync completed:', syncResult);
    } catch (error) {
      console.error('Failed to sync existing data:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Document methods
  async saveDocument(document: StoredDocument): Promise<string> {
    try {
      // Encrypt sensitive data before storing
      const encryptedDocument = this.encryptSensitiveFields(document);
      
      // Store in IndexedDB first
      const documentId = String(await this.db.documents.add(encryptedDocument));
      
      // Sync to Supabase if enabled
      if (this.useSupabase) {
        try {
          await supabaseService.saveDocument(encryptedDocument);
          console.log(`Document synced to Supabase: ${documentId}`);
        } catch (error) {
          console.warn('Failed to sync document to Supabase:', error);
          // Continue with local storage even if Supabase fails
        }
      }
      
      console.log(`Document saved with ID: ${documentId}`);
      return documentId;
    } catch (error) {
      console.error('Failed to save document:', error);
      throw new Error('Failed to save document to database');
    }
  }

  async getDocument(id: string): Promise<StoredDocument | null> {
    try {
      // Try Supabase first if enabled
      if (this.useSupabase) {
        try {
          const supabaseDoc = await supabaseService.getDocument(id);
          if (supabaseDoc) {
            return this.decryptSensitiveFields(supabaseDoc);
          }
        } catch (error) {
          console.warn('Failed to get document from Supabase, trying IndexedDB:', error);
        }
      }

      // Fallback to IndexedDB
      const document = await this.db.documents.get(id) || null;
      if (!document) return null;
      
      return this.decryptSensitiveFields(document);
    } catch (error) {
      console.error('Failed to retrieve document:', error);
      return null;
    }
  }

  async getAllDocuments(): Promise<StoredDocument[]> {
    try {
      // Try Supabase first if enabled
      if (this.useSupabase) {
        try {
          const supabaseDocs = await supabaseService.getAllDocuments();
          if (supabaseDocs.length > 0) {
            return supabaseDocs.map(doc => this.decryptSensitiveFields(doc));
          }
        } catch (error) {
          console.warn('Failed to get documents from Supabase, using IndexedDB:', error);
        }
      }

      // Fallback to IndexedDB
      const documents = await this.db.documents.orderBy('timestamp').reverse().toArray();
      return documents.map(doc => this.decryptSensitiveFields(doc));
    } catch (error) {
      console.error('Failed to retrieve documents:', error);
      return [];
    }
  }

  async updateDocument(id: string, updates: Partial<StoredDocument>): Promise<boolean> {
    try {
      const encryptedUpdates = this.encryptSensitiveFields(updates as StoredDocument);
      
      // Update in IndexedDB
      await this.db.documents.update(id, encryptedUpdates);
      
      // Sync to Supabase if enabled
      if (this.useSupabase) {
        try {
          await supabaseService.updateDocument(id, encryptedUpdates);
          console.log(`Document updated in Supabase: ${id}`);
        } catch (error) {
          console.warn('Failed to update document in Supabase:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update document:', error);
      return false;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      // Delete from IndexedDB
      await this.db.documents.delete(id);
      
      // Delete from Supabase if enabled
      if (this.useSupabase) {
        try {
          await supabaseService.deleteDocument(id);
          console.log(`Document deleted from Supabase: ${id}`);
        } catch (error) {
          console.warn('Failed to delete document from Supabase:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete document:', error);
      return false;
    }
  }

  // Template methods
  async saveTemplate(template: DocumentType): Promise<string> {
    try {
      // Check if template already exists (for updates)
      const existingTemplate = await this.db.templates.where('id').equals(template.id).first();
      
      if (existingTemplate) {
        // Update existing template
        await this.db.templates.update(template.id, template);
        console.log(`Template updated in IndexedDB: ${template.id}`);
      } else {
        // Create new template
        await this.db.templates.add(template);
        console.log(`Template created in IndexedDB: ${template.id}`);
      }
      
      // Sync to Supabase if enabled
      if (this.useSupabase) {
        try {
          if (existingTemplate) {
            await supabaseService.updateTemplate(template.id, template);
            console.log(`Template updated in Supabase: ${template.id}`);
          } else {
            await supabaseService.saveTemplate(template);
            console.log(`Template synced to Supabase: ${template.id}`);
          }
        } catch (error) {
          console.warn('Failed to sync template to Supabase:', error);
        }
      }
      
      return template.id;
    } catch (error) {
      console.error('Failed to save template to database:', error);
      throw new Error('Failed to save template to database');
    }
  }

  async getTemplate(id: string): Promise<DocumentType | null> {
    try {
      // Try Supabase first if enabled
      if (this.useSupabase) {
        try {
          const supabaseTemplate = await supabaseService.getAllTemplates();
          const template = supabaseTemplate.find(t => t.id === id);
          if (template) return template;
        } catch (error) {
          console.warn('Failed to get template from Supabase, trying IndexedDB:', error);
        }
      }

      // Fallback to IndexedDB
      const template = await this.db.templates.get(id) || null;
      return template;
    } catch (error) {
      console.error('Failed to retrieve template from database:', error);
      return null;
    }
  }

  async getAllTemplates(): Promise<DocumentType[]> {
    try {
      // Try Supabase first if enabled
      if (this.useSupabase) {
        try {
          const supabaseTemplates = await supabaseService.getAllTemplates();
          if (supabaseTemplates.length > 0) {
            console.log(`Retrieved ${supabaseTemplates.length} templates from Supabase`);
            return supabaseTemplates;
          }
        } catch (error) {
          console.warn('Failed to get templates from Supabase, using IndexedDB:', error);
        }
      }

      // Fallback to IndexedDB
      const templates = await this.db.templates.orderBy('name').toArray();
      console.log(`Retrieved ${templates.length} templates from IndexedDB`);
      return templates;
    } catch (error) {
      console.error('Failed to retrieve templates from database:', error);
      return [];
    }
  }

  async updateTemplate(id: string, updates: Partial<DocumentType>): Promise<boolean> {
    try {
      // Update in IndexedDB
      await this.db.templates.update(id, updates);
      
      // Sync to Supabase if enabled
      if (this.useSupabase) {
        try {
          await supabaseService.updateTemplate(id, updates);
          console.log(`Template updated in Supabase: ${id}`);
        } catch (error) {
          console.warn('Failed to update template in Supabase:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update template:', error);
      return false;
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      // Delete from IndexedDB
      await this.db.templates.delete(id);
      
      // Delete from Supabase if enabled
      if (this.useSupabase) {
        try {
          await supabaseService.deleteTemplate(id);
          console.log(`Template deleted from Supabase: ${id}`);
        } catch (error) {
          console.warn('Failed to delete template from Supabase:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete template:', error);
      return false;
    }
  }

  async getTemplatesByCategory(category: string): Promise<DocumentType[]> {
    try {
      const allTemplates = await this.getAllTemplates();
      return allTemplates.filter(template => template.category === category);
    } catch (error) {
      console.error('Failed to get templates by category:', error);
      return [];
    }
  }

  // Search and filter methods
  async searchDocuments(query: string, filters?: {
    documentType?: string;
    status?: string;
    dateRange?: { start: string; end: string };
    location?: string;
    minConfidence?: number;
  }): Promise<StoredDocument[]> {
    try {
      // Try Supabase first if enabled
      if (this.useSupabase) {
        try {
          const supabaseResults = await supabaseService.searchDocuments(query, filters);
          if (supabaseResults.length > 0) {
            return supabaseResults.map(doc => this.decryptSensitiveFields(doc));
          }
        } catch (error) {
          console.warn('Failed to search documents in Supabase, using IndexedDB:', error);
        }
      }

      // Fallback to IndexedDB
      const documents = await this.searchDocumentsIndexedDB(query, filters);
      return documents.map(doc => this.decryptSensitiveFields(doc));
    } catch (error) {
      console.error('Failed to search documents:', error);
      return [];
    }
  }

  private async searchDocumentsIndexedDB(query: string, filters?: any): Promise<StoredDocument[]> {
    let collection = this.db.documents.orderBy('timestamp').reverse();

    // Apply filters
    if (filters) {
      if (filters.documentType) {
        collection = collection.filter(doc => doc.type.id === filters.documentType);
      }
      if (filters.status) {
        collection = collection.filter(doc => doc.status === filters.status);
      }
      if (filters.location) {
        collection = collection.filter(doc => doc.location === filters.location);
      }
      if (filters.minConfidence) {
        collection = collection.filter(doc => doc.confidence >= filters.minConfidence!);
      }
      if (filters.dateRange) {
        collection = collection.filter(doc => {
          const docDate = new Date(doc.timestamp);
          const startDate = new Date(filters.dateRange!.start);
          const endDate = new Date(filters.dateRange!.end);
          return docDate >= startDate && docDate <= endDate;
        });
      }
    }

    const documents = await collection.toArray();
    
    // Text search
    const searchResults = documents.filter(doc => {
      if (!query) return true;
      
      const searchText = [
        doc.ocrRawText,
        JSON.stringify(doc.fields),
        doc.type.name,
        doc.location
      ].join(' ').toLowerCase();
      
      return searchText.includes(query.toLowerCase());
    });

    return searchResults;
  }

  async searchTemplates(query: string): Promise<DocumentType[]> {
    try {
      const templates = await this.getAllTemplates();
      
      if (!query) return templates;
      
      return templates.filter(template => 
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        template.category.toLowerCase().includes(query.toLowerCase()) ||
        template.template.some(field => 
          field.label.toLowerCase().includes(query.toLowerCase())
        )
      );
    } catch (error) {
      console.error('Failed to search templates:', error);
      return [];
    }
  }

  // Statistics and analytics
  async getDocumentStatistics(): Promise<{
    totalDocuments: number;
    documentsByType: Record<string, number>;
    documentsByStatus: Record<string, number>;
    averageConfidence: number;
    documentsThisMonth: number;
  }> {
    try {
      const documents = await this.getAllDocuments();
      
      const stats = {
        totalDocuments: documents.length,
        documentsByType: {} as Record<string, number>,
        documentsByStatus: {} as Record<string, number>,
        averageConfidence: 0,
        documentsThisMonth: 0
      };

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      documents.forEach(doc => {
        // Count by type
        const typeName = doc.type.name;
        stats.documentsByType[typeName] = (stats.documentsByType[typeName] || 0) + 1;
        
        // Count by status
        stats.documentsByStatus[doc.status] = (stats.documentsByStatus[doc.status] || 0) + 1;
        
        // Count this month
        if (new Date(doc.timestamp) >= thisMonth) {
          stats.documentsThisMonth++;
        }
      });

      // Calculate average confidence
      if (documents.length > 0) {
        stats.averageConfidence = documents.reduce((sum, doc) => sum + doc.confidence, 0) / documents.length;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get document statistics:', error);
      return {
        totalDocuments: 0,
        documentsByType: {},
        documentsByStatus: {},
        averageConfidence: 0,
        documentsThisMonth: 0
      };
    }
  }

  async getTemplateStatistics(): Promise<{
    totalTemplates: number;
    templatesByCategory: Record<string, number>;
    averageFieldsPerTemplate: number;
  }> {
    try {
      const templates = await this.getAllTemplates();
      
      const stats = {
        totalTemplates: templates.length,
        templatesByCategory: {} as Record<string, number>,
        averageFieldsPerTemplate: 0
      };

      templates.forEach(template => {
        // Count by category
        stats.templatesByCategory[template.category] = (stats.templatesByCategory[template.category] || 0) + 1;
      });

      // Calculate average fields per template
      if (templates.length > 0) {
        stats.averageFieldsPerTemplate = templates.reduce((sum, template) => sum + template.template.length, 0) / templates.length;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get template statistics:', error);
      return {
        totalTemplates: 0,
        templatesByCategory: {},
        averageFieldsPerTemplate: 0
      };
    }
  }

  // Utility methods
  private encryptSensitiveFields(document: StoredDocument): StoredDocument {
    const encrypted = { ...document };
    
    // Encrypt sensitive field values
    const sensitiveFields = ['name', 'address', 'phone', 'email', 'id', 'officer', 'recipient'];
    
    for (const [fieldName, value] of Object.entries(encrypted.fields)) {
      if (sensitiveFields.some(sf => fieldName.toLowerCase().includes(sf))) {
        if (typeof value === 'string' && value.length > 0) {
          encrypted.fields[fieldName] = securityService.encrypt(value);
        }
      }
    }

    return encrypted;
  }

  private decryptSensitiveFields(document: StoredDocument): StoredDocument {
    const decrypted = { ...document };
    
    // Decrypt sensitive field values
    const sensitiveFields = ['name', 'address', 'phone', 'email', 'id', 'officer', 'recipient'];
    
    for (const [fieldName, value] of Object.entries(decrypted.fields)) {
      if (sensitiveFields.some(sf => fieldName.toLowerCase().includes(sf))) {
        if (typeof value === 'string' && value.length > 0) {
          try {
            decrypted.fields[fieldName] = securityService.decrypt(value);
          } catch (error) {
            // If decryption fails, assume it's not encrypted
            console.warn(`Failed to decrypt field ${fieldName}:`, error);
          }
        }
      }
    }

    return decrypted;
  }

  // Backup and export methods
  async exportDocuments(): Promise<Blob> {
    try {
      const documents = await this.getAllDocuments();
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        documents: documents.map(doc => ({
          ...doc,
          // Remove sensitive data from export
          documentData: undefined,
          extractedImages: doc.extractedImages?.map(img => ({
            ...img,
            base64Data: img.type === 'logo' || img.type === 'stamp' ? img.base64Data : undefined
          }))
        }))
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      return new Blob([jsonString], { type: 'application/json' });
    } catch (error) {
      console.error('Failed to export documents:', error);
      throw new Error('Failed to export documents');
    }
  }

  async exportTemplates(): Promise<Blob> {
    try {
      const templates = await this.getAllTemplates();
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        templates
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      return new Blob([jsonString], { type: 'application/json' });
    } catch (error) {
      console.error('Failed to export templates:', error);
      throw new Error('Failed to export templates');
    }
  }

  async clearDatabase(): Promise<void> {
    try {
      await this.db.documents.clear();
      await this.db.templates.clear();
      await this.db.auditLogs.clear();
      console.log('Database cleared successfully');
    } catch (error) {
      console.error('Failed to clear database:', error);
      throw new Error('Failed to clear database');
    }
  }

  // Method to toggle storage backend
  setSupabaseEnabled(enabled: boolean): void {
    this.useSupabase = enabled;
    console.log(`Supabase storage ${enabled ? 'enabled' : 'disabled'}`);
  }

  isSupabaseEnabled(): boolean {
    return this.useSupabase;
  }

  // Manual sync method
  async syncToSupabase(): Promise<{ success: boolean; message: string }> {
    if (!this.useSupabase) {
      return { success: false, message: 'Supabase is disabled' };
    }

    try {
      // Check Supabase connection
      const isConnected = await supabaseService.checkConnection();
      if (!isConnected) {
        return { success: false, message: 'Supabase connection failed' };
      }

      // Get all local data
      const localDocuments = await this.db.documents.toArray();
      const localTemplates = await this.db.templates.toArray();

      // Sync to Supabase
      const syncResult = await supabaseService.syncIndexedDBToSupabase(localDocuments, localTemplates);
      
      return {
        success: true,
        message: `Synced ${syncResult.documentsSynced} documents and ${syncResult.templatesSynced} templates to Supabase`
      };
    } catch (error) {
      console.error('Manual sync failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }
}

export const databaseService = new DatabaseService();