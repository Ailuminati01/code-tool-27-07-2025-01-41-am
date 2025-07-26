import { securityService } from './securityService';
import { ollamaService } from './ollamaService';

interface StampDetectionResult {
  Status: 'Present' | 'Absent';
  Coordinates: [number, number, number, number] | null;
  Type?: string;
  Confidence?: number;
  ExtractedText?: string;
  PersonName?: string;
  Date?: string;
}

interface SignatureDetectionResult {
  Status: 'Present' | 'Absent';
  Coordinates: [number, number, number, number] | null;
  Confidence?: number;
  PersonName?: string;
  Date?: string;
}

interface StampSignatureAnalysisResult {
  Stamp: StampDetectionResult;
  Signature: SignatureDetectionResult;
  StampValidation: 'Y' | 'N';
  MatchedStampType?: string;
  ProcessingTime: number;
  ExtractedText?: string;
  PersonName?: string;
  Date?: string;
}

// Master list of official stamps
const OFFICIAL_STAMP_MASTER_LIST = [
  {
    id: 'stamp_1',
    name: 'OFFICER COMMANDING 14th BN A.P.S.P. ANANTHAPURAMU',
    keywords: ['OFFICER COMMANDING', '14TH BN', 'A.P.S.P', 'ANANTHAPURAMU'],
    pattern: /OFFICER\s+COMMANDING.*14.*BN.*A\.P\.S\.P.*ANANTHAPURAMU/i
  },
  {
    id: 'stamp_2',
    name: 'STATE OFFICER TO ADGP APSP HEAD OFFICE MANGALAGIRI',
    keywords: ['STATE OFFICER', 'ADGP', 'APSP', 'HEAD OFFICE', 'MANGALAGIRI'],
    pattern: /STATE\s+OFFICER.*ADGP.*APSP.*HEAD\s+OFFICE.*MANGALAGIRI/i
  },
  {
    id: 'stamp_3',
    name: 'Inspector General of Police APSP Bns, Amaravathi',
    keywords: ['INSPECTOR GENERAL', 'POLICE', 'APSP', 'BNS', 'AMARAVATHI'],
    pattern: /INSPECTOR\s+GENERAL.*POLICE.*APSP.*BNS.*AMARAVATHI/i
  },
  {
    id: 'stamp_4',
    name: 'Dy. Inspector General of Police-IV APSP Battalions, Mangalagiri',
    keywords: ['DY', 'INSPECTOR GENERAL', 'POLICE', 'APSP', 'BATTALIONS', 'MANGALAGIRI'],
    pattern: /DY.*INSPECTOR\s+GENERAL.*POLICE.*APSP.*BATTALIONS.*MANGALAGIRI/i
  },
  {
    id: 'stamp_5',
    name: 'Sd/- B. Sreenivasulu, IPS., Addl. Commissioner of Police, Vijayawada City',
    keywords: ['SD', 'SREENIVASULU', 'IPS', 'COMMISSIONER', 'POLICE', 'VIJAYAWADA'],
    pattern: /SD.*SREENIVASULU.*IPS.*COMMISSIONER.*POLICE.*VIJAYAWADA/i
  },
  {
    id: 'stamp_6',
    name: 'Dr. SHANKHABRATA BAGCHI IPS., Addl. Director General of Police, APSP Battalions',
    keywords: ['SHANKHABRATA', 'BAGCHI', 'IPS', 'DIRECTOR GENERAL', 'POLICE', 'APSP', 'BATTALIONS'],
    pattern: /SHANKHABRATA.*BAGCHI.*IPS.*DIRECTOR\s+GENERAL.*POLICE.*APSP.*BATTALIONS/i
  }
];

class StampSignatureService {

  async analyzeStampsAndSignatures(
    file: File,
    userId: string
  ): Promise<StampSignatureAnalysisResult> {
    const startTime = Date.now();

    try {
      // Log analysis start
      securityService.logAction(
        userId,
        'stamp_signature_analysis_start',
        'document',
        file.name,
        { 
          fileSize: file.size, 
          fileType: file.type,
          processor: 'ollama_gemma3'
        }
      );

      // Use Ollama to extract all text from the document first
      const textExtractionResult = await ollamaService.extractTextFromDocument(file, userId);
      const extractedText = textExtractionResult.extractedText;

      // Now use Ollama specifically for stamp and signature detection
      const analysisResult = await this.analyzeWithOllama(file, extractedText, userId);

      const processingTime = Date.now() - startTime;

      const result: StampSignatureAnalysisResult = {
        ...analysisResult,
        ProcessingTime: processingTime,
        ExtractedText: extractedText
      };
      
      // Log successful analysis
      securityService.logAction(
        userId,
        'stamp_signature_analysis_complete',
        'document',
        file.name,
        {
          stampStatus: result.Stamp.Status,
          signatureStatus: result.Signature.Status,
          stampValidation: result.StampValidation,
          personName: result.PersonName,
          date: result.Date,
          processingTime
        }
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      
      // Log analysis error
      securityService.logAction(
        userId,
        'stamp_signature_analysis_error',
        'document',
        file.name,
        { error: errorMessage }
      );

      console.error('Stamp/Signature analysis failed:', errorMessage);

      // Return fallback result
      return {
        Stamp: { Status: 'Absent', Coordinates: null },
        Signature: { Status: 'Absent', Coordinates: null },
        StampValidation: 'N',
        ProcessingTime: Date.now() - startTime
      };
    }
  }

  private async analyzeWithOllama(file: File, extractedText: string, userId: string): Promise<{
    Stamp: StampDetectionResult;
    Signature: SignatureDetectionResult;
    StampValidation: 'Y' | 'N';
    MatchedStampType?: string;
    PersonName?: string;
    Date?: string;
  }> {
    const baseUrl = 'http://localhost:11434';
    const model = 'gemma3';

    // Convert file to base64 for vision analysis
    const base64Data = await this.fileToBase64(file);

    // Perfect prompt for stamp and signature detection
    const analysisPrompt = `You are an expert document analyst specializing in detecting official stamps and signatures in police documents. Analyze this document image carefully.

OFFICIAL STAMP TYPES TO DETECT:
1. "OFFICER COMMANDING 14th BN A.P.S.P. ANANTHAPURAMU"
2. "STATE OFFICER TO ADGP APSP HEAD OFFICE MANGALAGIRI"  
3. "Inspector General of Police APSP Bns, Amaravathi"
4. "Dy. Inspector General of Police-IV APSP Battalions, Mangalagiri"
5. "Sd/- B. Sreenivasulu, IPS., Addl. Commissioner of Police, Vijayawada City"
6. "Dr. SHANKHABRATA BAGCHI IPS., Addl. Director General of Police, APSP Battalions"

EXTRACTED TEXT FROM DOCUMENT:
${extractedText}

ANALYSIS TASKS:
1. STAMP DETECTION: Look for official stamps, seals, or circular/rectangular official markings
2. SIGNATURE DETECTION: Look for handwritten signatures (not typed names)
3. PERSON NAME EXTRACTION: Find the name of the signing authority
4. DATE EXTRACTION: Find any dates mentioned in stamps or near signatures
5. STAMP VALIDATION: Check if detected stamp text matches any official stamp from the list above

Respond in this EXACT JSON format:
{
  "stamp_detected": true/false,
  "stamp_text": "exact text found in stamp or null",
  "stamp_coordinates": [x, y, width, height] or null,
  "signature_detected": true/false,
  "signature_coordinates": [x, y, width, height] or null,
  "person_name": "name of the signing person or null",
  "date_found": "date in DD/MM/YYYY or DD-MM-YYYY format or null",
  "official_stamp_match": true/false,
  "matched_stamp_type": "exact matching official stamp name or null",
  "confidence_score": 0.85
}

Be extremely thorough and accurate. Look for faint stamps, partial stamps, and handwritten signatures carefully.`;

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          prompt: analysisPrompt,
          images: [base64Data],
          stream: false,
          options: {
            temperature: 0.1,
            top_p: 0.9,
            top_k: 40,
            num_predict: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.response?.trim();

      if (!analysisText) {
        throw new Error('No response from Ollama model');
      }

      // Parse the JSON response
      let analysisResult;
      try {
        // Clean the response to extract JSON
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse Ollama response:', parseError);
        // Fallback analysis using text patterns
        analysisResult = this.fallbackTextAnalysis(extractedText);
      }

      // Convert to our result format
      const stampResult: StampDetectionResult = {
        Status: analysisResult.stamp_detected ? 'Present' : 'Absent',
        Coordinates: analysisResult.stamp_coordinates || null,
        Type: analysisResult.stamp_text ? 'official_stamp' : undefined,
        Confidence: analysisResult.confidence_score || 0.7,
        ExtractedText: analysisResult.stamp_text || undefined,
        PersonName: analysisResult.person_name || undefined,
        Date: analysisResult.date_found || undefined
      };

      const signatureResult: SignatureDetectionResult = {
        Status: analysisResult.signature_detected ? 'Present' : 'Absent',
        Coordinates: analysisResult.signature_coordinates || null,
        Confidence: analysisResult.confidence_score || 0.7,
        PersonName: analysisResult.person_name || undefined,
        Date: analysisResult.date_found || undefined
      };

      const stampValidation: 'Y' | 'N' = analysisResult.official_stamp_match ? 'Y' : 'N';
      const matchedStampType = analysisResult.matched_stamp_type || undefined;
      const personName = analysisResult.person_name || undefined;
      const date = analysisResult.date_found || undefined;

      return {
        Stamp: stampResult,
        Signature: signatureResult,
        StampValidation: stampValidation,
        MatchedStampType: matchedStampType,
        PersonName: personName,
        Date: date
      };

    } catch (error) {
      console.error('Ollama analysis failed:', error);
      // Return fallback analysis
      return this.fallbackTextAnalysis(extractedText);
    }
  }

  private fallbackTextAnalysis(extractedText: string): {
    Stamp: StampDetectionResult;
    Signature: SignatureDetectionResult;
    StampValidation: 'Y' | 'N';
    MatchedStampType?: string;
    PersonName?: string;
    Date?: string;
  } {
    const textLower = extractedText.toLowerCase();
    
    // Check for stamp keywords
    const hasStampKeywords = ['stamp', 'seal', 'officer', 'police', 'commanding', 'commissioner'].some(
      keyword => textLower.includes(keyword)
    );

    // Check for signature keywords
    const hasSignatureKeywords = ['signature', 'signed', 'sd/', 'sign'].some(
      keyword => textLower.includes(keyword)
    );

    // Extract person name (look for patterns like "Sd/- Name" or "Signed by Name")
    const namePatterns = [
      /sd\/?\s*-?\s*([a-z\s\.]+)/i,
      /signed\s+by\s+([a-z\s\.]+)/i,
      /([a-z]+\s+[a-z]+),?\s+ips/i
    ];

    let personName = undefined;
    for (const pattern of namePatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        personName = match[1].trim();
        break;
      }
    }

    // Extract date
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
    const dateMatch = extractedText.match(datePattern);
    const date = dateMatch ? dateMatch[1] : undefined;

    // Check for official stamp match
    let matchedStamp = undefined;
    let stampValidation: 'Y' | 'N' = 'N';

    for (const stamp of OFFICIAL_STAMP_MASTER_LIST) {
      if (stamp.pattern.test(extractedText)) {
        matchedStamp = stamp.name;
        stampValidation = 'Y';
        break;
      }
    }

    return {
      Stamp: {
        Status: hasStampKeywords ? 'Present' : 'Absent',
        Coordinates: hasStampKeywords ? [100, 100, 200, 100] : null,
        Type: hasStampKeywords ? 'official_stamp' : undefined,
        Confidence: hasStampKeywords ? 0.6 : 0.3,
        PersonName: personName,
        Date: date
      },
      Signature: {
        Status: hasSignatureKeywords ? 'Present' : 'Absent',
        Coordinates: hasSignatureKeywords ? [300, 400, 150, 50] : null,
        Confidence: hasSignatureKeywords ? 0.6 : 0.3,
        PersonName: personName,
        Date: date
      },
      StampValidation: stampValidation,
      MatchedStampType: matchedStamp,
      PersonName: personName,
      Date: date
    };
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Get the master list of official stamps
  getMasterStampList() {
    return OFFICIAL_STAMP_MASTER_LIST.map(stamp => ({
      id: stamp.id,
      name: stamp.name
    }));
  }

  // Public method to check service health
  async checkServiceHealth(): Promise<boolean> {
    try {
      // Check Ollama service health
      return await ollamaService.checkServiceHealth();
    } catch (error) {
      console.error('Service health check failed:', error);
      return false;
    }
  }
}

export const stampSignatureService = new StampSignatureService();
export const stampSignatureService = new StampSignatureService();
export type { StampSignatureAnalysisResult };