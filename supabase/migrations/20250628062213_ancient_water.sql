/*
  # Create all required tables for SPARK application

  1. New Tables
    - `documents`
      - Complete document storage with all required fields
      - Includes OCR data, metadata, processing information
      - Status tracking and audit fields
    - `templates` 
      - Document template definitions
      - Form field configurations and validation rules
    
  2. Security
    - Enable RLS on both tables
    - Add policies for public access (matching current app behavior)
    
  3. Performance
    - Add all necessary indexes for optimal query performance
    - Include GIN indexes for JSONB columns
    
  4. Constraints and Triggers
    - Status check constraints
    - Automatic timestamp updates
*/

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT PRIMARY KEY,
    type JSONB NOT NULL,
    template_version TEXT NOT NULL DEFAULT 'v1.0',
    tags TEXT[] DEFAULT '{}',
    fields JSONB NOT NULL DEFAULT '{}',
    ocr_raw_text TEXT NOT NULL DEFAULT '',
    image_url TEXT DEFAULT '',
    created_by TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    document_data TEXT DEFAULT '',
    extracted_images JSONB DEFAULT '[]',
    processing_metadata JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    finalized_by TEXT,
    finalized_on TIMESTAMPTZ,
    
    -- Add constraint for status values
    CONSTRAINT documents_status_check CHECK (status IN ('pending', 'finalized', 'rejected'))
);

-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    template JSONB NOT NULL DEFAULT '[]',
    validation_rules JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents (allowing public access as per current app)
DO $$ BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Documents are viewable by everyone" ON public.documents;
    DROP POLICY IF EXISTS "Documents can be inserted by everyone" ON public.documents;
    DROP POLICY IF EXISTS "Documents can be updated by everyone" ON public.documents;
    DROP POLICY IF EXISTS "Documents can be deleted by everyone" ON public.documents;
    
    -- Create new policies
    CREATE POLICY "Documents are viewable by everyone" ON public.documents
        FOR SELECT USING (true);
    
    CREATE POLICY "Documents can be inserted by everyone" ON public.documents
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "Documents can be updated by everyone" ON public.documents
        FOR UPDATE USING (true);
    
    CREATE POLICY "Documents can be deleted by everyone" ON public.documents
        FOR DELETE USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create RLS policies for templates (allowing public access as per current app)
DO $$ BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Templates are viewable by everyone" ON public.templates;
    DROP POLICY IF EXISTS "Templates can be inserted by everyone" ON public.templates;
    DROP POLICY IF EXISTS "Templates can be updated by everyone" ON public.templates;
    DROP POLICY IF EXISTS "Templates can be deleted by everyone" ON public.templates;
    
    -- Create new policies
    CREATE POLICY "Templates are viewable by everyone" ON public.templates
        FOR SELECT USING (true);
    
    CREATE POLICY "Templates can be inserted by everyone" ON public.templates
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "Templates can be updated by everyone" ON public.templates
        FOR UPDATE USING (true);
    
    CREATE POLICY "Templates can be deleted by everyone" ON public.templates
        FOR DELETE USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON public.documents USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents USING gin (type);
CREATE INDEX IF NOT EXISTS idx_documents_fields ON public.documents USING gin (fields);

-- Create indexes for templates table
CREATE INDEX IF NOT EXISTS idx_templates_name ON public.templates USING btree (name);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_templates_template ON public.templates USING gin (template);

-- Create triggers for automatic timestamp updates
DO $$ BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
    DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
    
    -- Create new triggers
    CREATE TRIGGER update_documents_updated_at
        BEFORE UPDATE ON public.documents
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_templates_updated_at
        BEFORE UPDATE ON public.templates
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;