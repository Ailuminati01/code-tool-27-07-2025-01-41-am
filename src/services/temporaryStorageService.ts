import { securityService } from './securityService';
import { StampSignatureAnalysisResult } from './stampSignatureService';

interface TemporaryDocument {
  id: string;
  originalFile: File;
  extractedText: string;
  azureAIResult: any;
  openAIAnalysis: any;
  suggestedTemplate: any;
  extractedFields: Record<string, any>;
  confidence: number;
  createdAt: string;
  userId: string;
  status: 'pending_review' | 'approved' | 'rejected';
  stampSignatureResult?: StampSignatureAnalysisResult;
}

class TemporaryStorageService {
  private temporaryDocuments: Map<string, TemporaryDocument> = new Map();
  private readonly CACHE_EXPIRY_HOURS = 24;

  storeTemporaryDocument(
    file: File,
    extractedText: string,
    azureAIResult: any,
    openAIAnalysis: any,
    userId: string,
    stampSignatureResult?: StampSignatureAnalysisResult
  ): string {
    const documentId = this.generateId('temp_doc');
    
    // Ensure all template fields are present in extracted fields
    const completeFields = this.ensureAllTemplateFieldsPresent(
      openAIAnalysis.extractedFields,
      openAIAnalysis.templateMatch
    );
    
    const tempDoc: TemporaryDocument = {
      id: documentId,
      originalFile: file,
      extractedText,
      azureAIResult,
      openAIAnalysis,
      suggestedTemplate: openAIAnalysis.templateMatch,
      extractedFields: completeFields,
      confidence: openAIAnalysis.confidence,
      createdAt: new Date().toISOString(),
      userId,
      status: 'pending_review',
      stampSignatureResult
    };

    // Encrypt sensitive data
    tempDoc.extractedFields = this.encryptSensitiveFields(tempDoc.extractedFields);

    this.temporaryDocuments.set(documentId, tempDoc);

    // Log temporary storage
    securityService.logAction(
      userId,
      'document_stored_temporarily',
      'document',
      documentId,
      {
        fileName: file.name,
        confidence: tempDoc.confidence,
        templateSuggested: openAIAnalysis.templateMatch?.name,
        fieldsExtracted: Object.keys(completeFields).length,
        stampDetected: stampSignatureResult?.Stamp.Status === 'Present',
        signatureDetected: stampSignatureResult?.Signature.Status === 'Present',
        stampValidated: stampSignatureResult?.StampValidation === 'Y'
      }
    );

    // Schedule cleanup
    this.scheduleCleanup(documentId);

    return documentId;
  }

  private ensureAllTemplateFieldsPresent(
    extractedFields: Record<string, any>,
    template: any
  ): Record<string, any> {
    if (!template || !template.template) {
      return extractedFields;
    }

    const completeFields = { ...extractedFields };

    // Ensure every template field has a corresponding entry
    template.template.forEach((field: any) => {
      if (!(field.id in completeFields)) {
        // Set default value based on field type
        switch (field.type) {
          case 'text':
          case 'textarea':
            completeFields[field.id] = '';
            break;
          case 'number':
            completeFields[field.id] = null;
            break;
          case 'date':
            completeFields[field.id] = null;
            break;
          case 'select':
            completeFields[field.id] = field.options?.[0] || '';
            break;
          default:
            completeFields[field.id] = '';
        }
      }
    });

    return completeFields;
  }

  getTemporaryDocument(documentId: string): TemporaryDocument | null {
    const doc = this.temporaryDocuments.get(documentId);
    if (!doc) return null;

    // Check if expired
    const createdAt = new Date(doc.createdAt);
    const expiryTime = new Date(createdAt.getTime() + (this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000));
    
    if (new Date() > expiryTime) {
      this.temporaryDocuments.delete(documentId);
      return null;
    }

    // Decrypt sensitive fields
    const decryptedDoc = { ...doc };
    decryptedDoc.extractedFields = this.decryptSensitiveFields(doc.extractedFields);

    return decryptedDoc;
  }

  updateTemporaryDocument(documentId: string, updates: Partial<TemporaryDocument>): boolean {
    const doc = this.temporaryDocuments.get(documentId);
    if (!doc) return false;

    // Encrypt sensitive fields if updating them
    if (updates.extractedFields) {
      updates.extractedFields = this.encryptSensitiveFields(updates.extractedFields);
    }

    const updatedDoc = { ...doc, ...updates };
    this.temporaryDocuments.set(documentId, updatedDoc);

    // Log update
    securityService.logAction(
      doc.userId,
      'temporary_document_updated',
      'document',
      documentId,
      { updatedFields: Object.keys(updates) }
    );

    return true;
  }

  approveDocument(documentId: string, userId: string): boolean {
    const doc = this.temporaryDocuments.get(documentId);
    if (!doc) return false;

    doc.status = 'approved';

    // Log approval
    securityService.logAction(
      userId,
      'temporary_document_approved',
      'document',
      documentId,
      { 
        approvedBy: userId,
        stampDetected: doc.stampSignatureResult?.Stamp.Status === 'Present',
        signatureDetected: doc.stampSignatureResult?.Signature.Status === 'Present',
        stampValidated: doc.stampSignatureResult?.StampValidation === 'Y'
      }
    );

    return true;
  }

  rejectDocument(documentId: string, userId: string, reason?: string): boolean {
    const doc = this.temporaryDocuments.get(documentId);
    if (!doc) return false;

    doc.status = 'rejected';

    // Log rejection
    securityService.logAction(
      userId,
      'temporary_document_rejected',
      'document',
      documentId,
      { rejectedBy: userId, reason }
    );

    return true;
  }

  deleteTemporaryDocument(documentId: string, userId: string): boolean {
    const doc = this.temporaryDocuments.get(documentId);
    if (!doc) return false;

    this.temporaryDocuments.delete(documentId);

    // Log deletion
    securityService.logAction(
      userId,
      'temporary_document_deleted',
      'document',
      documentId,
      { deletedBy: userId }
    );

    return true;
  }

  getUserTemporaryDocuments(userId: string): TemporaryDocument[] {
    const userDocs = Array.from(this.temporaryDocuments.values())
      .filter(doc => doc.userId === userId)
      .map(doc => ({
        ...doc,
        extractedFields: this.decryptSensitiveFields(doc.extractedFields)
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return userDocs;
  }

  private encryptSensitiveFields(fields: Record<string, any>): Record<string, any> {
    const encrypted = { ...fields };
    const sensitiveFields = ['name', 'address', 'phone', 'email', 'id', 'officer', 'recipient'];
    
    for (const [fieldName, value] of Object.entries(encrypted)) {
      if (sensitiveFields.some(sf => fieldName.toLowerCase().includes(sf))) {
        if (typeof value === 'string' && value.length > 0) {
          encrypted[fieldName] = securityService.encrypt(value);
        }
      }
    }

    return encrypted;
  }

  private decryptSensitiveFields(fields: Record<string, any>): Record<string, any> {
    const decrypted = { ...fields };
    const sensitiveFields = ['name', 'address', 'phone', 'email', 'id', 'officer', 'recipient'];
    
    for (const [fieldName, value] of Object.entries(decrypted)) {
      if (sensitiveFields.some(sf => fieldName.toLowerCase().includes(sf))) {
        if (typeof value === 'string' && value.length > 0) {
          try {
            decrypted[fieldName] = securityService.decrypt(value);
          } catch (error) {
            console.warn(`Failed to decrypt field ${fieldName}:`, error);
          }
        }
      }
    }

    return decrypted;
  }

  private scheduleCleanup(documentId: string): void {
    setTimeout(() => {
      const doc = this.temporaryDocuments.get(documentId);
      if (doc && doc.status === 'pending_review') {
        this.temporaryDocuments.delete(documentId);
        
        securityService.logAction(
          doc.userId,
          'temporary_document_expired',
          'document',
          documentId,
          { reason: 'cache_expiry' }
        );
      }
    }, this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup methods
  cleanupExpiredDocuments(): number {
    let cleanedCount = 0;
    const now = new Date();

    for (const [id, doc] of this.temporaryDocuments.entries()) {
      const createdAt = new Date(doc.createdAt);
      const expiryTime = new Date(createdAt.getTime() + (this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000));
      
      if (now > expiryTime) {
        this.temporaryDocuments.delete(id);
        cleanedCount++;
        
        securityService.logAction(
          'system',
          'temporary_document_expired',
          'document',
          id,
          { reason: 'scheduled_cleanup' }
        );
      }
    }

    return cleanedCount;
  }

  getStorageStatistics(): {
    totalDocuments: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    oldestDocument: string | null;
  } {
    const docs = Array.from(this.temporaryDocuments.values());
    
    return {
      totalDocuments: docs.length,
      pendingReview: docs.filter(d => d.status === 'pending_review').length,
      approved: docs.filter(d => d.status === 'approved').length,
      rejected: docs.filter(d => d.status === 'rejected').length,
      oldestDocument: docs.length > 0 
        ? docs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0].createdAt
        : null
    };
  }
}

export const temporaryStorageService = new TemporaryStorageService();
export type { TemporaryDocument };