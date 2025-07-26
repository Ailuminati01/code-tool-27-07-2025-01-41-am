/*
  # Complete Database Schema Setup

  This migration creates the complete database schema for the document management system.
  
  ## New Tables
  1. **documents** - Main document storage table
     - `id` (text, primary key) - Unique document identifier
     - `type` (jsonb) - Document type information
     - `template_version` (text) - Template version used
     - `tags` (text[]) - Document tags for categorization
     - `fields` (jsonb) - Extracted field data
     - `ocr_raw_text` (text) - Raw OCR extracted text
     - `image_url` (text) - URL to document image
     - `created_by` (text) - User who created the document
     - `location` (text) - Location where document was processed
     - `status` (text) - Document status (pending/finalized/rejected)
     - `confidence` (real) - AI confidence score
     - `timestamp` (timestamptz) - Document creation timestamp
     - `document_data` (text) - Base64 encoded document data
     - `extracted_images` (jsonb) - Extracted images from document
     - `processing_metadata` (jsonb) - AI processing metadata
     - `metadata` (jsonb) - Additional document metadata
     - `created_at` (timestamptz) - Record creation timestamp
     - `updated_at` (timestamptz) - Record update timestamp

  2. **templates** - Document template definitions
     - `id` (text, primary key) - Unique template identifier
     - `name` (text) - Template display name
     - `category` (text) - Template category
     - `template` (jsonb) - Template field definitions
     - `validation_rules` (jsonb) - Validation rules for template
     - `created_at` (timestamptz) - Template creation timestamp
     - `updated_at` (timestamptz) - Template update timestamp

  ## Security
  - Enable RLS on both tables
  - Add policies for authenticated users to perform CRUD operations
  - Documents table has no RLS policies initially (as per schema)
  - Templates table has full CRUD policies for authenticated users

  ## Indexes
  - Performance indexes on frequently queried columns
  - GIN indexes for JSONB columns
  - B-tree indexes for text and timestamp columns

  ## Triggers
  - Auto-update `updated_at` timestamps on record changes

  ## Constraints
  - Primary key constraints
  - Check constraint on document status values
*/

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id text PRIMARY KEY,
    type jsonb NOT NULL,
    template_version text NOT NULL DEFAULT 'v1.0',
    tags text[] DEFAULT '{}',
    fields jsonb NOT NULL DEFAULT '{}',
    ocr_raw_text text NOT NULL DEFAULT '',
    image_url text DEFAULT '',
    created_by text NOT NULL,
    location text NOT NULL,
    status text NOT NULL,
    confidence real NOT NULL DEFAULT 0,
    timestamp timestamptz NOT NULL DEFAULT now(),
    document_data text DEFAULT '',
    extracted_images jsonb DEFAULT '[]',
    processing_metadata jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id text PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    template jsonb NOT NULL DEFAULT '[]',
    validation_rules jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add constraints
DO $$
BEGIN
    -- Add check constraint for document status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documents_status_check' 
        AND table_name = 'documents'
    ) THEN
        ALTER TABLE documents ADD CONSTRAINT documents_status_check 
        CHECK (status = ANY (ARRAY['pending'::text, 'finalized'::text, 'rejected'::text]));
    END IF;
END $$;

-- Create indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_documents_fields ON documents USING gin (fields);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents USING gin (type);

-- Create indexes for templates table
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates USING btree (name);
CREATE INDEX IF NOT EXISTS idx_templates_template ON templates USING gin (template);

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for templates (as per schema)
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all templates" ON templates;
DROP POLICY IF EXISTS "Users can insert templates" ON templates;
DROP POLICY IF EXISTS "Users can update templates" ON templates;
DROP POLICY IF EXISTS "Users can delete templates" ON templates;

-- Create new policies for templates
CREATE POLICY "Users can read all templates"
    ON templates
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert templates"
    ON templates
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update templates"
    ON templates
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Users can delete templates"
    ON templates
    FOR DELETE
    TO authenticated
    USING (true);

-- Note: Documents table has RLS enabled but no policies as per the provided schema
-- This means only service role can access documents directly
-- You may want to add policies later based on your security requirements