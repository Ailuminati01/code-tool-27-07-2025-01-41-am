/*
  # Create documents table

  1. New Tables
    - `documents`
      - `id` (text, primary key) - Unique document identifier
      - `type` (jsonb) - Document type information
      - `template_version` (text) - Version of template used
      - `tags` (text[]) - Array of tags for categorization
      - `fields` (jsonb) - Extracted field data
      - `ocr_raw_text` (text) - Raw OCR extracted text
      - `image_url` (text) - URL to document image
      - `created_by` (text) - User who created the document
      - `location` (text) - Document location/source
      - `status` (text) - Processing status
      - `confidence` (real) - Confidence score for extraction
      - `timestamp` (timestamptz) - Creation timestamp
      - `document_data` (text) - Raw document data
      - `extracted_images` (jsonb) - Extracted image information
      - `processing_metadata` (jsonb) - Processing metadata
      - `metadata` (jsonb) - Additional metadata
      - `finalized_by` (text) - User who finalized the document
      - `finalized_on` (timestamptz) - Finalization timestamp

  2. Security
    - Enable RLS on `documents` table
    - Add policies for authenticated users to manage their documents
*/

CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  type jsonb DEFAULT '{}',
  template_version text DEFAULT '',
  tags text[] DEFAULT '{}',
  fields jsonb DEFAULT '{}',
  ocr_raw_text text DEFAULT '',
  image_url text DEFAULT '',
  created_by text DEFAULT '',
  location text DEFAULT '',
  status text DEFAULT 'pending',
  confidence real DEFAULT 0.0,
  timestamp timestamptz DEFAULT now(),
  document_data text DEFAULT '',
  extracted_images jsonb DEFAULT '{}',
  processing_metadata jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  finalized_by text DEFAULT '',
  finalized_on timestamptz
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = created_by);

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY "Users can update own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = created_by)
  WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = created_by);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents(timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);