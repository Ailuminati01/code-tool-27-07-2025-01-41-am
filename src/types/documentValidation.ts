export interface StampValidation {
  detected: Array<{
    id: string;
    type: 'official_stamp' | 'seal' | 'emblem' | 'unknown';
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
    imageData: string;
    location: string;
    matchesMasterList: boolean;
    matchedStampType?: string;
  }>;
  status: 'Present' | 'Absent';
  count: number;
  validationTimestamp: string;
  matchesMasterList: boolean;
}

export interface SignatureValidation {
  detected: Array<{
    id: string;
    type: 'handwritten_signature' | 'digital_signature';
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
    imageData: string;
    location: string;
  }>;
  status: 'Present' | 'Absent';
  count: number;
  validationTimestamp: string;
}

export interface DocumentValidationMetadata {
  stampValidation: StampValidation;
  signatureValidation: SignatureValidation;
  overallValidation: {
    isValid: boolean;
    completeness: number;
    missingElements: string[];
    validatedAt: string;
    validatedBy: string;
  };
}