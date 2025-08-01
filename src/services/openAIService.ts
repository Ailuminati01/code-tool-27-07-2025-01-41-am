import { securityService } from './securityService';
import { DocumentType } from '../types';

interface OpenAIAnalysisResult {
  documentType: string;
  confidence: number;
  reasoning: string;
  extractedFields: Record<string, any>;
  templateMatch: DocumentType | null;
  fieldMappingDetails: FieldMappingDetail[];
}

interface FieldMappingDetail {
  fieldId: string;
  fieldLabel: string;
  extractedValue: any;
  confidence: number;
  source: 'direct_match' | 'pattern_match' | 'context_match' | 'ai_inference';
}

interface TemplateMatchResult {
  templateId: string;
  templateName: string;
  confidence: number;
  fieldMappings: Record<string, any>;
  reasoning: string;
}

class OpenAIService {
  private apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  private baseUrl = 'https://api.openai.com/v1';

  async analyzeDocument(
    extractedText: string,
    availableTemplates: DocumentType[],
    userId: string
  ): Promise<OpenAIAnalysisResult> {
    try {
      // Log analysis start
      securityService.logAction(
        userId,
        'openai_analysis_start',
        'document',
        'text_analysis',
        { textLength: extractedText.length, templatesCount: availableTemplates.length }
      );

      // First, determine the best matching template
      const templateMatch = await this.findBestTemplate(extractedText, availableTemplates);
      
      if (!templateMatch) {
        // If no template match found, use fallback analysis
        return this.createFallbackAnalysis(extractedText, availableTemplates, userId);
      }

      // Then extract fields specifically for that template
      const fieldExtractionResult = await this.extractFieldsForTemplate(
        extractedText, 
        templateMatch, 
        availableTemplates
      );

      const result: OpenAIAnalysisResult = {
        documentType: fieldExtractionResult.documentType,
        confidence: fieldExtractionResult.confidence,
        reasoning: fieldExtractionResult.reasoning,
        extractedFields: fieldExtractionResult.extractedFields,
        templateMatch: templateMatch,
        fieldMappingDetails: fieldExtractionResult.fieldMappingDetails || []
      };

      // Log successful analysis
      securityService.logAction(
        userId,
        'openai_analysis_complete',
        'document',
        'text_analysis',
        {
          documentType: result.documentType,
          confidence: result.confidence,
          templateMatched: templateMatch.name,
          fieldsExtracted: Object.keys(result.extractedFields).length
        }
      );

      return result;

    } catch (error) {
      console.error('OpenAI analysis error:', error);
      
      // Log analysis error
      securityService.logAction(
        userId,
        'openai_analysis_error',
        'document',
        'text_analysis',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      // Return fallback analysis instead of throwing
      return this.createFallbackAnalysis(extractedText, availableTemplates, userId);
    }
  }

  private async findBestTemplate(
    text: string, 
    templates: DocumentType[]
  ): Promise<DocumentType | null> {
    try {
      const templateDescriptions = templates.map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        description: this.getTemplateDescription(template)
      }));

      const prompt = `You are an expert document classifier and template matcher for Andhra Pradesh Police Department documents. Your task is to analyze the document text and find the BEST matching template from the provided list.

DOCUMENT TEXT TO ANALYZE:
${text.substring(0, 1500)}

AVAILABLE TEMPLATES:
${JSON.stringify(templateDescriptions, null, 2)}

CLASSIFICATION INSTRUCTIONS:
1. Read the document text carefully and identify key elements like:
   - Document type (leave letter, punishment, reward, etc.)
   - Official stamps or seals mentioned
   - Department or office names
   - Field types present (dates, names, stations, etc.)

2. Match against available templates by:
   - Comparing document content with template categories
   - Looking for field types that match template requirements
   - Considering the purpose and context of the document

3. Assign confidence based on:
   - High (0.9+): Perfect match with clear indicators
   - Medium (0.7-0.9): Good match with most indicators present  
   - Low (0.5-0.7): Partial match or uncertain
   - Very Low (<0.5): Poor match or unable to determine

Respond with valid JSON only:
{
  "bestTemplateId": "exact template id from the list above",
  "confidence": 0.85,
  "reasoning": "detailed explanation of why this template was chosen, mentioning specific text elements that led to this decision"
}`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: 'You are an expert document classifier for Andhra Pradesh Police Department. Analyze police documents and classify them accurately based on content, purpose, and official indicators. Respond only with valid JSON. Do not include any explanatory text outside the JSON.'
          }, {
            role: 'user',
            content: prompt
          }],
          temperature: 0.2,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Clean the content to ensure it's valid JSON
      const cleanedContent = this.cleanJsonResponse(content);
      const analysis = JSON.parse(cleanedContent);

      return templates.find(t => t.id === analysis.bestTemplateId) || null;
    } catch (error) {
      console.error('Template matching failed:', error);
      // Return first template as fallback
      return templates.length > 0 ? templates[0] : null;
    }
  }

  private async extractFieldsForTemplate(
    text: string,
    template: DocumentType,
    allTemplates: DocumentType[]
  ): Promise<{
    documentType: string;
    confidence: number;
    reasoning: string;
    extractedFields: Record<string, any>;
    fieldMappingDetails: FieldMappingDetail[];
  }> {
    try {
      const templateFields = template.template.map(field => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options || []
      }));

      const prompt = `You are an expert data extraction specialist for Andhra Pradesh Police Department documents. Extract data from the document text using the specified template with extreme precision.

DOCUMENT TEXT:
${text.substring(0, 2000)}

TARGET TEMPLATE: ${template.name}
CATEGORY: ${template.category}

TEMPLATE FIELDS TO EXTRACT:
${JSON.stringify(templateFields, null, 2)}

EXTRACTION INSTRUCTIONS:
1. For each field, extract the most relevant information from the document text
2. Match field labels with document content (e.g., "Officer Name" should extract actual officer names)
3. For dates: Extract in DD/MM/YYYY or DD-MM-YYYY format if found
4. For names: Extract full names of persons, officers, or authorities
5. For stations/departments: Extract official names of police stations or departments
6. For select fields: Choose the option that best matches the document content
7. If no relevant information is found for a field, use null

FIELD MATCHING STRATEGIES:
- Look for exact matches first (e.g., "Name:" followed by text)
- Check for contextual matches (e.g., officer names near "Sd/-" or signature areas)
- Use positional clues (e.g., dates at top/bottom of document)
- Consider document structure and official formatting

CONFIDENCE SCORING:
- Assign high confidence (0.9+) for exact matches
- Medium confidence (0.7-0.8) for contextual matches
- Lower confidence (0.5-0.6) for inferred or partial matches

Respond with valid JSON only:
{
  "documentType": "${template.name}",
  "confidence": 0.85,
  "reasoning": "detailed explanation of extraction process and field matching strategy",
  "extractedFields": {
    ${templateFields.map(f => `"${f.id}": "extracted value or null"`).join(',\n    ')}
  },
  "fieldMappingDetails": [
    {
      "fieldId": "field id",
      "fieldLabel": "field label", 
      "extractedValue": "value",
      "confidence": 0.8,
      "source": "direct_match | pattern_match | context_match | ai_inference"
    }
  ]
}`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: 'You are an expert data extraction specialist for Andhra Pradesh Police Department documents. Extract information precisely from police documents including leave letters, punishment orders, awards, and official correspondence. Focus on accuracy and proper field mapping. Respond only with valid JSON. Do not include any explanatory text outside the JSON.'
          }, {
            role: 'user',
            content: prompt
          }],
          temperature: 0.1,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Clean the content to ensure it's valid JSON
      const cleanedContent = this.cleanJsonResponse(content);
      const extraction = JSON.parse(cleanedContent);

      // Ensure all template fields are present in extracted fields
      const completeFields = this.ensureAllFieldsPresent(extraction.extractedFields, template);

      return {
        documentType: extraction.documentType || template.name,
        confidence: extraction.confidence || 0.7,
        reasoning: extraction.reasoning || 'Automated field extraction completed',
        extractedFields: completeFields,
        fieldMappingDetails: extraction.fieldMappingDetails || []
      };
    } catch (error) {
      console.error('Field extraction failed:', error);
      // Return fallback extraction
      return this.createFallbackFieldExtraction(text, template);
    }
  }

  private cleanJsonResponse(content: string): string {
    // Remove any markdown code blocks
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any leading/trailing whitespace
    content = content.trim();
    
    // Find the first { and last } to extract just the JSON
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      content = content.substring(firstBrace, lastBrace + 1);
    }
    
    return content;
  }

  private createFallbackAnalysis(
    text: string,
    templates: DocumentType[],
    userId: string
  ): OpenAIAnalysisResult {
    // Simple keyword-based template matching
    const textLower = text.toLowerCase();
    let bestTemplate = templates[0]; // Default to first template
    let confidence = 0.5;

    // Basic keyword matching
    for (const template of templates) {
      const templateKeywords = this.getTemplateKeywords(template);
      let matchCount = 0;
      
      for (const keyword of templateKeywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        bestTemplate = template;
        confidence = Math.min(0.8, 0.5 + (matchCount * 0.1));
        break;
      }
    }

    // Extract fields using basic pattern matching
    const extractedFields = this.extractFieldsBasic(text, bestTemplate);

    securityService.logAction(
      userId,
      'openai_fallback_analysis',
      'document',
      'text_analysis',
      { templateUsed: bestTemplate.name, confidence }
    );

    return {
      documentType: bestTemplate.name,
      confidence,
      reasoning: 'Fallback analysis using keyword matching and pattern recognition',
      extractedFields,
      templateMatch: bestTemplate,
      fieldMappingDetails: []
    };
  }

  private createFallbackFieldExtraction(
    text: string,
    template: DocumentType
  ): {
    documentType: string;
    confidence: number;
    reasoning: string;
    extractedFields: Record<string, any>;
    fieldMappingDetails: FieldMappingDetail[];
  } {
    const extractedFields = this.extractFieldsBasic(text, template);
    
    return {
      documentType: template.name,
      confidence: 0.6,
      reasoning: 'Fallback field extraction using pattern matching',
      extractedFields,
      fieldMappingDetails: []
    };
  }

  private extractFieldsBasic(text: string, template: DocumentType): Record<string, any> {
    const fields: Record<string, any> = {};
    
    // Initialize all fields with default values
    template.template.forEach(field => {
      switch (field.type) {
        case 'text':
        case 'textarea':
          fields[field.id] = '';
          break;
        case 'number':
          fields[field.id] = null;
          break;
        case 'date':
          fields[field.id] = null;
          break;
        case 'select':
          fields[field.id] = field.options?.[0] || '';
          break;
        default:
          fields[field.id] = '';
      }
    });

    // Basic pattern matching for common fields
    const patterns = {
      name: /(?:name|officer|recipient|श्री|sri)\s*:?\s*([a-z\s]+)/i,
      date: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      station: /(?:station|police|थाना)\s*:?\s*([a-z\s]+)/i,
      rank: /(?:rank|पद)\s*:?\s*([a-z\s]+)/i
    };

    // Apply patterns to extract basic information
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Find template field that might match this pattern
        const matchingField = template.template.find(field => 
          field.label.toLowerCase().includes(key) || 
          field.id.toLowerCase().includes(key)
        );
        
        if (matchingField) {
          fields[matchingField.id] = match[1].trim();
        }
      }
    }

    return fields;
  }

  private getTemplateKeywords(template: DocumentType): string[] {
    const keywords: string[] = [];
    
    // Add template name words
    keywords.push(...template.name.toLowerCase().split(' '));
    
    // Add category
    keywords.push(template.category.toLowerCase());
    
    // Add field labels
    template.template.forEach(field => {
      keywords.push(...field.label.toLowerCase().split(' '));
    });
    
    // Add specific keywords based on template ID
    switch (template.id) {
      case 'transfer':
        keywords.push('transfer', 'posting', 'station', 'order');
        break;
      case 'award':
        keywords.push('award', 'certificate', 'recognition', 'medal');
        break;
      case 'complaint':
        keywords.push('complaint', 'grievance', 'disciplinary');
        break;
    }
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  private ensureAllFieldsPresent(
    extractedFields: Record<string, any>, 
    template: DocumentType
  ): Record<string, any> {
    const completeFields = { ...extractedFields };

    // Ensure every template field has a corresponding entry
    template.template.forEach(field => {
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

  private getTemplateDescription(template: DocumentType): string {
    const fieldDescriptions = template.template.map(field => 
      `${field.label} (${field.type}${field.required ? ', required' : ''})`
    ).join(', ');

    return `${template.category} document with fields: ${fieldDescriptions}`;
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('OpenAI service health check failed:', error);
      return false;
    }
  }
}

export const openAIService = new OpenAIService();
export type { OpenAIAnalysisResult, FieldMappingDetail };