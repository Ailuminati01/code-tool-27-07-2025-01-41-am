import { createClient } from '@supabase/supabase-js';
import { securityService } from './securityService';
import { StoredDocument } from './databaseService';
import { DocumentType } from '../types';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase credentials are available and not placeholder values
const hasSupabaseCredentials = supabaseUrl && supabaseKey && 
  supabaseUrl !== '' && supabaseKey !== '' &&
  supabaseUrl !== 'undefined' && supabaseKey !== 'undefined' &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  supabaseKey !== 'your-anon-key-here' &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseKey.includes('your-anon-key');

// Only create Supabase client if credentials are available
const supabase = hasSupabaseCredentials ? createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
}) : null;

class SupabaseService {
  private isAvailable(): boolean {
    return hasSupabaseCredentials && supabase !== null;
  }

  async saveDocument(document: StoredDocument): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    }

    try {
      console.log('Attempting to save document to Supabase:', document.id);
      
      const { data, error } = await supabase!
        .from('documents')
        .insert([{
          id: document.id,
          type: document.type,
          template_version: document.templateVersion,
          tags: document.tags,
          fields: document.fields,
          ocr_raw_text: document.ocrRawText,
          image_url: document.imageUrl,
          created_by: document.createdBy,
          location: document.location,
          status: document.status,
          confidence: document.confidence,
          timestamp: document.timestamp,
          document_data: document.documentData,
          extracted_images: document.extractedImages,
          processing_metadata: document.processingMetadata,
          metadata: document.metadata,
          finalized_by: document.finalizedBy,
          finalized_on: document.finalizedOn
        }])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from Supabase insert');
      }

      console.log('Document successfully saved to Supabase:', data[0].id);
      return data[0].id;
    } catch (error) {
      console.error('Failed to save to Supabase:', error);
      throw error;
    }
  }

  async saveTemplate(template: DocumentType): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    }

    try {
      console.log('Attempting to save template to Supabase:', template.id);
      
      const { data, error } = await supabase!
        .from('templates')
        .insert([{
          id: template.id,
          name: template.name,
          category: template.category,
          template: template.template,
          validation_rules: template.validationRules,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('Supabase template insert error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from Supabase template insert');
      }

      console.log('Template successfully saved to Supabase:', data[0].id);
      return data[0].id;
    } catch (error) {
      console.error('Failed to save template to Supabase:', error);
      throw error;
    }
  }

  async getAllTemplates(): Promise<DocumentType[]> {
    if (!this.isAvailable()) {
      console.warn('Supabase is not configured, cannot fetch templates');
      return [];
    }

    try {
      console.log('Fetching all templates from Supabase...');
      
      const { data, error } = await supabase!
        .from('templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase getAllTemplates error:', error);
        throw error;
      }
      
      console.log(`Retrieved ${data.length} templates from Supabase`);
      return data.map(this.mapSupabaseToTemplate);
    } catch (error) {
      console.error('Failed to get templates from Supabase:', error);
      return [];
    }
  }

  async updateTemplate(id: string, updates: Partial<DocumentType>): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    }

    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      // Map fields to Supabase column names
      if (updates.name) updateData.name = updates.name;
      if (updates.category) updateData.category = updates.category;
      if (updates.template) updateData.template = updates.template;
      if (updates.validationRules) updateData.validation_rules = updates.validationRules;

      const { error } = await supabase!
        .from('templates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      console.log('Template successfully updated in Supabase:', id);
    } catch (error) {
      console.error('Failed to update template in Supabase:', error);
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    }

    try {
      const { error } = await supabase!
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      console.log('Template successfully deleted from Supabase:', id);
    } catch (error) {
      console.error('Failed to delete template from Supabase:', error);
      throw error;
    }
  }

  async getDocument(id: string): Promise<StoredDocument | null> {
    if (!this.isAvailable()) {
      console.warn('Supabase is not configured, cannot fetch document');
      return null;
    }

    try {
      console.log('Fetching document from Supabase:', id);
      
      const { data, error } = await supabase!
        .from('documents')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Supabase get error:', error);
        throw error;
      }
      
      if (!data) {
        console.log('Document not found in Supabase:', id);
        return null;
      }
      
      return this.mapSupabaseToStoredDocument(data);
    } catch (error) {
      console.error('Failed to get document from Supabase:', error);
      return null;
    }
  }

  async getAllDocuments(): Promise<StoredDocument[]> {
    if (!this.isAvailable()) {
      console.warn('Supabase is not configured, cannot fetch documents');
      return [];
    }

    try {
      console.log('Fetching all documents from Supabase...');
      console.log('Supabase URL:', supabaseUrl);
      console.log('Supabase Key (first 20 chars):', supabaseKey?.substring(0, 20) + '...');
      
      // Test connection first
      const connectionTest = await this.checkConnection();
      if (!connectionTest) {
        console.error('Supabase connection test failed');
        throw new Error('Unable to connect to Supabase. Please check your configuration and network connection.');
      }
      
      const { data, error } = await supabase!
        .from('documents')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Supabase getAllDocuments error:', error);
        throw error;
      }
      
      console.log(`Retrieved ${data.length} documents from Supabase`);
      return data.map(this.mapSupabaseToStoredDocument);
    } catch (error) {
      console.error('Failed to get documents from Supabase:', error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  }

  async updateDocument(id: string, updates: Partial<StoredDocument>): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    }

    try {
      const updateData: any = {};
      
      // Map fields to Supabase column names
      if (updates.templateVersion) updateData.template_version = updates.templateVersion;
      if (updates.ocrRawText) updateData.ocr_raw_text = updates.ocrRawText;
      if (updates.imageUrl) updateData.image_url = updates.imageUrl;
      if (updates.createdBy) updateData.created_by = updates.createdBy;
      if (updates.documentData) updateData.document_data = updates.documentData;
      if (updates.extractedImages) updateData.extracted_images = updates.extractedImages;
      if (updates.processingMetadata) updateData.processing_metadata = updates.processingMetadata;
      if (updates.finalizedBy) updateData.finalized_by = updates.finalizedBy;
      if (updates.finalizedOn) updateData.finalized_on = updates.finalizedOn;
      
      // Direct mappings
      if (updates.type) updateData.type = updates.type;
      if (updates.tags) updateData.tags = updates.tags;
      if (updates.fields) updateData.fields = updates.fields;
      if (updates.location) updateData.location = updates.location;
      if (updates.status) updateData.status = updates.status;
      if (updates.confidence !== undefined) updateData.confidence = updates.confidence;
      if (updates.timestamp) updateData.timestamp = updates.timestamp;
      if (updates.metadata) updateData.metadata = updates.metadata;

      const { error } = await supabase!
        .from('documents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      console.log('Document successfully updated in Supabase:', id);
    } catch (error) {
      console.error('Failed to update document in Supabase:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    }

    try {
      const { error } = await supabase!
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      console.log('Document successfully deleted from Supabase:', id);
    } catch (error) {
      console.error('Failed to delete document from Supabase:', error);
      throw error;
    }
  }

  async searchDocuments(
    query: string, 
    filters?: {
      documentType?: string;
      status?: string;
      dateRange?: { start: string; end: string };
      location?: string;
      minConfidence?: number;
    }
  ): Promise<StoredDocument[]> {
    if (!this.isAvailable()) {
      console.warn('Supabase is not configured, cannot search documents');
      return [];
    }

    try {
      let queryBuilder = supabase!
        .from('documents')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.status) {
          queryBuilder = queryBuilder.eq('status', filters.status);
        }
        if (filters.location) {
          queryBuilder = queryBuilder.eq('location', filters.location);
        }
        if (filters.minConfidence) {
          queryBuilder = queryBuilder.gte('confidence', filters.minConfidence);
        }
        if (filters.dateRange) {
          queryBuilder = queryBuilder
            .gte('timestamp', filters.dateRange.start)
            .lte('timestamp', filters.dateRange.end);
        }
      }

      // Text search (basic implementation)
      if (query) {
        queryBuilder = queryBuilder.ilike('ocr_raw_text', `%${query}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data.map(this.mapSupabaseToStoredDocument);
    } catch (error) {
      console.error('Failed to search documents in Supabase:', error);
      return [];
    }
  }

  async syncIndexedDBToSupabase(indexedDBDocuments: StoredDocument[], indexedDBTemplates: DocumentType[]): Promise<{
    documentsSynced: number;
    templatesSynced: number;
    errors: string[];
  }> {
    if (!this.isAvailable()) {
      return { documentsSynced: 0, templatesSynced: 0, errors: ['Supabase not configured'] };
    }

    const errors: string[] = [];
    let documentsSynced = 0;
    let templatesSynced = 0;

    console.log('Starting sync of IndexedDB data to Supabase...');

    // Sync templates first
    console.log(`Syncing ${indexedDBTemplates.length} templates...`);
    for (const template of indexedDBTemplates) {
      try {
        // Check if template already exists
        const { data: existingTemplate } = await supabase!
          .from('templates')
          .select('id')
          .eq('id', template.id)
          .maybeSingle();

        if (!existingTemplate) {
          await this.saveTemplate(template);
          templatesSynced++;
          console.log(`Synced template: ${template.name}`);
        } else {
          console.log(`Template already exists: ${template.name}`);
        }
      } catch (error) {
        const errorMsg = `Failed to sync template ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Sync documents
    console.log(`Syncing ${indexedDBDocuments.length} documents...`);
    for (const document of indexedDBDocuments) {
      try {
        // Check if document already exists
        const { data: existingDocument } = await supabase!
          .from('documents')
          .select('id')
          .eq('id', document.id)
          .maybeSingle();

        if (!existingDocument) {
          await this.saveDocument(document);
          documentsSynced++;
          console.log(`Synced document: ${document.id}`);
        } else {
          console.log(`Document already exists: ${document.id}`);
        }
      } catch (error) {
        const errorMsg = `Failed to sync document ${document.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Sync completed: ${documentsSynced} documents, ${templatesSynced} templates synced`);
    return { documentsSynced, templatesSynced, errors };
  }

  private mapSupabaseToStoredDocument(data: any): StoredDocument {
    return {
      id: data.id,
      type: data.type,
      templateVersion: data.template_version,
      tags: data.tags || [],
      fields: data.fields || {},
      ocrRawText: data.ocr_raw_text || '',
      imageUrl: data.image_url || '',
      createdBy: data.created_by,
      location: data.location,
      status: data.status,
      confidence: data.confidence || 0,
      timestamp: data.timestamp,
      documentData: data.document_data,
      extractedImages: data.extracted_images || [],
      processingMetadata: data.processing_metadata || {},
      metadata: data.metadata || {},
      finalizedBy: data.finalized_by,
      finalizedOn: data.finalized_on
    };
  }

  private mapSupabaseToTemplate(data: any): DocumentType {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      template: data.template || [],
      validationRules: data.validation_rules || []
    };
  }

  async checkConnection(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Supabase credentials not configured properly. Please set valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      return false;
    }

    try {
      console.log('Checking Supabase connection...');
      
      // Use a simple health check instead of querying documents table
      const { data, error } = await supabase!
        .from('documents')
        .select('count')
        .limit(1);

      const isConnected = !error;
      console.log('Supabase connection status:', isConnected);
      
      if (error) {
        console.error('Supabase connection error:', error);
      }
      
      return isConnected;
    } catch (error) {
      console.error('Supabase connection check failed:', error);
      return false;
    }
  }

  // Test method to insert a simple document
  async testInsert(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Supabase is not configured, cannot test insert');
      return false;
    }

    try {
      console.log('Testing Supabase insert...');
      
      const testDoc = {
        id: `test_${Date.now()}`,
        type: { id: 'test', name: 'Test Document', category: 'Test', template: [], validationRules: [] },
        template_version: 'v1.0',
        tags: ['test'],
        fields: { testField: 'test value' },
        ocr_raw_text: 'Test OCR text',
        image_url: '',
        created_by: 'test_user',
        location: 'Test Location',
        status: 'finalized',
        confidence: 0.9,
        timestamp: new Date().toISOString(),
        document_data: '',
        extracted_images: [],
        processing_metadata: {},
        metadata: {}
      };

      const { data, error } = await supabase!
        .from('documents')
        .insert([testDoc])
        .select();

      if (error) {
        console.error('Test insert failed:', error);
        return false;
      }

      console.log('Test insert successful:', data[0].id);
      
      // Clean up test document
      await supabase!.from('documents').delete().eq('id', testDoc.id);
      
      return true;
    } catch (error) {
      console.error('Test insert error:', error);
      return false;
    }
  }

  // Method to check if Supabase is properly configured
  getConfigurationStatus(): { configured: boolean; message: string } {
    if (!hasSupabaseCredentials) {
      if (supabaseUrl === 'https://your-project-ref.supabase.co' || supabaseKey === 'your-anon-key-here') {
        return {
          configured: false,
          message: 'Supabase environment variables contain placeholder values. Please replace them with your actual Supabase project URL and anon key from your Supabase Dashboard > Settings > API.'
        };
      }
      
      return {
        configured: false,
        message: 'Supabase environment variables are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
      };
    }
    
    return {
      configured: true,
      message: 'Supabase is properly configured.'
    };
  }
}

export const supabaseService = new SupabaseService();