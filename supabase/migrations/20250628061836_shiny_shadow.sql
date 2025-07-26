/*
  # Create missing database tables

  1. New Tables
    - `documents` - Main document storage with all required fields
    - `templates` - Document templates for form generation
  
  2. Security
    - Enable RLS on both tables
    - Add permissive policies for development
  
  3. Indexes
    - Performance indexes for common queries
  
  4. Triggers
    - Auto-update timestamps
*/

-- Create update_updated_at_column function if it doesn't exist
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
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT documents_status_check CHECK (status = ANY (ARRAY['pending'::text, 'finalized'::text, 'rejected'::text]))
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

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones for documents
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Documents are viewable by everyone" ON documents;
  DROP POLICY IF EXISTS "Documents can be inserted by everyone" ON documents;
  DROP POLICY IF EXISTS "Documents can be updated by everyone" ON documents;
  DROP POLICY IF EXISTS "Documents can be deleted by everyone" ON documents;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Documents are viewable by everyone"
  ON documents
  FOR SELECT
  USING (true);

CREATE POLICY "Documents can be inserted by everyone"
  ON documents
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Documents can be updated by everyone"
  ON documents
  FOR UPDATE
  USING (true);

CREATE POLICY "Documents can be deleted by everyone"
  ON documents
  FOR DELETE
  USING (true);

-- Drop existing policies if they exist and create new ones for templates
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;
  DROP POLICY IF EXISTS "Templates can be inserted by everyone" ON templates;
  DROP POLICY IF EXISTS "Templates can be updated by everyone" ON templates;
  DROP POLICY IF EXISTS "Templates can be deleted by everyone" ON templates;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Templates are viewable by everyone"
  ON templates
  FOR SELECT
  USING (true);

CREATE POLICY "Templates can be inserted by everyone"
  ON templates
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Templates can be updated by everyone"
  ON templates
  FOR UPDATE
  USING (true);

CREATE POLICY "Templates can be deleted by everyone"
  ON templates
  FOR DELETE
  USING (true);

-- Create indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_documents_fields ON documents USING gin (fields);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents USING gin (type);

-- Create indexes for templates
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates USING btree (name);
CREATE INDEX IF NOT EXISTS idx_templates_template ON templates USING gin (template);

-- Create triggers for updated_at
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