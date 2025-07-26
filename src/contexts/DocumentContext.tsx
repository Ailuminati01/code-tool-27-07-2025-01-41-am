import React, { createContext, useContext, useState, useEffect } from 'react';
import { Document, DocumentType } from '../types';
import { databaseService } from '../services/databaseService';

interface DocumentContextType {
  documents: Document[];
  documentTypes: DocumentType[];
  addDocument: (document: Omit<Document, 'id' | 'timestamp'>) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  finalizeDocument: (id: string, userId: string) => void;
  refreshDocuments: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// Updated mock document types with the new reward letter template
const mockDocumentTypes: DocumentType[] = [
  {
    id: 'earned_leave',
    name: 'Earned Leave Letter',
    category: 'Leave',
    template: [
      { id: 'rcNo', label: 'R c No.', type: 'text', required: true },
      { id: 'hodNo', label: 'H.O.D No.', type: 'text', required: true },
      { id: 'pcNo', label: 'PC No. or HC No or ARSI No', type: 'text', required: false },
      { id: 'name', label: 'Name', type: 'text', required: true },
      { id: 'date', label: 'Date', type: 'date', required: true },
      { id: 'numberOfDays', label: 'Number of Days', type: 'number', required: true },
      { id: 'leaveFromDate', label: 'Leave From Date', type: 'date', required: true },
      { id: 'leaveToDate', label: 'Leave To Date', type: 'date', required: true },
      { id: 'leaveReason', label: 'Leave Reason', type: 'textarea', required: true }
    ],
    validationRules: []
  },
  {
    id: 'medical_leave',
    name: 'Medical Leave Letter',
    category: 'Leave',
    template: [
      { id: 'name', label: 'Name', type: 'text', required: true },
      { id: 'dateOfSubmission', label: 'Date of Submission', type: 'date', required: true },
      { id: 'coyBelongsTo', label: 'Coy Belongs to', type: 'text', required: true },
      { id: 'rank', label: 'Rank', type: 'text', required: true },
      { id: 'leaveReason', label: 'Leave Reason', type: 'textarea', required: true },
      { id: 'phoneNumber', label: 'Phone Number', type: 'text', required: true },
      { id: 'unitAndDistrict', label: 'Unit and District', type: 'text', required: true }
    ],
    validationRules: []
  },
  {
    id: 'probation_letter',
    name: 'Probation Letter',
    category: 'Administrative',
    template: [
      { id: 'serviceClassCategory', label: 'Service Class Category', type: 'text', required: true },
      { id: 'nameOfProbationer', label: 'Name of Probationer', type: 'text', required: true },
      { id: 'dateOfRegularization', label: 'Date of Regularization', type: 'date', required: true },
      { id: 'periodOfProbationPrescribed', label: 'Period of Probation Prescribed', type: 'text', required: true },
      { id: 'leaveTakenDuringProbation', label: 'Leave Taken During Probation', type: 'text', required: true },
      { id: 'dateOfCompletionOfProbation', label: 'Date of Completion of Probation', type: 'date', required: true },
      { id: 'testsToBePassedDuringProbation', label: 'Tests to be Passed During Probation', type: 'textarea', required: true },
      { id: 'punishmentsDuringProbation', label: 'Punishments During Probation', type: 'textarea', required: true },
      { id: 'pendingPROE', label: 'Pending PR/OE', type: 'textarea', required: true },
      { id: 'characterAndConduct', label: 'Character and Conduct', type: 'select', required: true, options: ['Satisfactory', 'Good', 'Excellent'] },
      { id: 'firingPracticeCompleted', label: 'Firing Practice Completed', type: 'select', required: true, options: ['YES', 'NO'] },
      { id: 'remarksOfICOfficer', label: 'Remarks of I/C Officer', type: 'textarea', required: true },
      { id: 'remarksOfCommandant', label: 'Remarks of Commandant', type: 'textarea', required: true },
      { id: 'remarksOfDIG', label: 'Remarks of DIG', type: 'textarea', required: true },
      { id: 'adgpOrders', label: 'ADGP Orders', type: 'textarea', required: true },
      { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { id: 'salary', label: 'Salary', type: 'number', required: true },
      { id: 'qualification', label: 'Qualification', type: 'text', required: true },
      { id: 'acceptanceOfSelfAppraisalReport', label: 'Acceptance of Self Appraisal Report – Part-I', type: 'select', required: true, options: ['Accepted', 'Not Accepted'] },
      { id: 'assessmentOfPerformance', label: 'Assessment of Officer\'s Performance During the Year', type: 'select', required: true, options: ['Satisfactory', 'Good', 'Excellent'] },
      { id: 'reportingOfficerDate', label: 'Reporting Officer - Date', type: 'date', required: false },
      { id: 'reportingOfficerName', label: 'Reporting Officer - Name', type: 'text', required: true },
      { id: 'reportingOfficerDesignation', label: 'Reporting Officer - Designation', type: 'text', required: true },
      { id: 'countersigningOfficerDate', label: 'Countersigning Officer - Date', type: 'text', required: false },
      { id: 'countersigningOfficerName', label: 'Countersigning Officer - Name', type: 'text', required: true },
      { id: 'countersigningOfficerDesignation', label: 'Countersigning Officer - Designation', type: 'text', required: true },
      { id: 'countersigningOfficerRemarks', label: 'Countersigning Officer - Remarks', type: 'textarea', required: true },
      { id: 'hodOpinion', label: 'Head of Department Opinion', type: 'text', required: true },
      { id: 'hodDate', label: 'Head of Department - Date', type: 'date', required: false },
      { id: 'hodName', label: 'Head of Department - Name', type: 'text', required: true },
      { id: 'hodDesignation', label: 'Head of Department - Designation', type: 'text', required: true }
    ],
    validationRules: []
  },
  {
    id: 'punishment_letter',
    name: 'Punishment Letter',
    category: 'Disciplinary',
    template: [
      { id: 'rcNo', label: 'R c. No', type: 'text', required: true },
      { id: 'doNo', label: 'D. O No', type: 'text', required: true },
      { id: 'orderDate', label: 'Order Date', type: 'date', required: true },
      { id: 'punishmentAwarded', label: 'Punishment Awarded', type: 'textarea', required: true },
      { id: 'delinquencyDescription', label: 'Delinquency Description', type: 'textarea', required: true },
      { id: 'issuedBy', label: 'Issued By', type: 'text', required: true },
      { id: 'issuedDate', label: 'Issued Date', type: 'date', required: true }
    ],
    validationRules: []
  },
  {
    id: 'reward_letter',
    name: 'Reward Letter',
    category: 'Recognition',
    template: [
      { id: 'rcNo', label: 'R c No', type: 'text', required: true },
      { id: 'hooNo', label: 'H. O. O No', type: 'text', required: true },
      { id: 'date', label: 'Date', type: 'date', required: true },
      { id: 'issuedBy', label: 'Issued By', type: 'text', required: true },
      { id: 'subject', label: 'Subject', type: 'text', required: true },
      { id: 'referenceOrders', label: 'Reference Orders', type: 'textarea', required: true },
      { id: 'rewardDetails', label: 'Reward Details', type: 'textarea', required: true },
      { id: 'reasonForReward', label: 'Reason for Reward', type: 'textarea', required: true }
    ],
    validationRules: []
  }
];

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>(mockDocumentTypes);

  // Load documents and templates from database on mount
  useEffect(() => {
    refreshDocuments();
    refreshTemplates();
  }, []);

  const refreshDocuments = async () => {
    try {
      const storedDocuments = await databaseService.getAllDocuments();
      // Convert stored documents to context format
      const contextDocuments: Document[] = storedDocuments.map(stored => ({
        id: stored.id,
        type: stored.type,
        templateVersion: stored.templateVersion,
        tags: stored.tags,
        fields: stored.fields,
        ocrRawText: stored.ocrRawText,
        imageUrl: stored.imageUrl,
        createdBy: stored.createdBy,
        timestamp: stored.timestamp,
        location: stored.location,
        status: stored.status,
        finalizedBy: stored.finalizedBy,
        finalizedOn: stored.finalizedOn,
        confidence: stored.confidence,
        metadata: stored.metadata
      }));
      setDocuments(contextDocuments);
    } catch (error) {
      console.error('Failed to load documents from database:', error);
    }
  };

  const refreshTemplates = async () => {
    try {
      const storedTemplates = await databaseService.getAllTemplates();
      // Combine mock templates with stored templates
      setDocumentTypes([...mockDocumentTypes, ...storedTemplates]);
    } catch (error) {
      console.error('Failed to load templates from database:', error);
    }
  };

  const addDocument = (document: Omit<Document, 'id' | 'timestamp'>) => {
    const newDocument: Document = {
      ...document,
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    setDocuments(prev => [...prev, newDocument]);
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    try {
      // Update in database
      await databaseService.updateDocument(id, updates as any);
      
      // Update in context
      setDocuments(prev => prev.map(doc => 
        doc.id === id ? { ...doc, ...updates } : doc
      ));
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      // Delete from database
      await databaseService.deleteDocument(id);
      
      // Remove from context
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const finalizeDocument = (id: string, userId: string) => {
    updateDocument(id, {
      status: 'finalized',
      finalizedBy: userId,
      finalizedOn: new Date().toISOString()
    });
  };

  return (
    <DocumentContext.Provider value={{
      documents,
      documentTypes,
      addDocument,
      updateDocument,
      deleteDocument,
      finalizeDocument,
      refreshDocuments,
      refreshTemplates
    }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}