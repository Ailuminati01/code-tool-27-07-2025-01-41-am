/*
  # Create documents table with proper structure

  1. New Tables
    - `documents`
      - `id` (text, primary key)
      - `type` (jsonb, document type information)
      - `template_version` (text, template version)
      - `tags` (text array, document tags)
      - `fields` (jsonb, extracted field data)
      - `ocr_raw_text` (text, raw OCR text)
      - `image_url` (text, document image URL)
      - `created_by` (text, user who created)
      - `location` (text, creation location)
      - `status` (text, document status)
      - `confidence` (real, processing confidence)
      - `timestamp` (timestamptz, creation time)
      - `document_data` (text, base64 document data)
      - `extracted_images` (jsonb, extracted images)
      - `processing_metadata` (jsonb, processing metadata)
      - `metadata` (jsonb, additional metadata)
      - `created_at` (timestamptz, auto-generated)
      - `updated_at` (timestamptz, auto-updated)

  2. Security
    - Temporarily disable RLS for development
    - Add indexes for performance
    - Add updated_at trigger
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS documents;

-- Create documents table
CREATE TABLE documents (
  id text PRIMARY KEY,
  type jsonb NOT NULL,
  template_version text NOT NULL DEFAULT 'v1.0',
  tags text[] DEFAULT '{}',
  fields jsonb NOT NULL DEFAULT '{}',
  ocr_raw_text text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  created_by text NOT NULL,
  location text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'finalized', 'rejected')),
  confidence real NOT NULL DEFAULT 0,
  timestamp timestamptz NOT NULL DEFAULT now(),
  document_data text DEFAULT '',
  extracted_images jsonb DEFAULT '[]',
  processing_metadata jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Temporarily disable RLS for development
-- In production, you should enable RLS and create proper policies
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents(timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents USING GIN(type);
CREATE INDEX IF NOT EXISTS idx_documents_fields ON documents USING GIN(fields);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a test document to verify the table works
INSERT INTO documents (
  id,
  type,
  template_version,
  tags,
  fields,
  ocr_raw_text,
  created_by,
  location,
  status,
  confidence
) VALUES (
  'test_document_1',
  '{"id": "test", "name": "Test Document", "category": "Test"}',
  'v1.0',
  ARRAY['test', 'sample'],
  '{"testField": "test value", "sampleField": "sample data"}',
  'This is a test document for verifying the table structure.',
  'test_user',
  'Test Location',
  'finalized',
  0.95
);