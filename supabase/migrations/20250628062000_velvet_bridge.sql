/*
  # Complete Database Schema Setup for Police Document Management System

  This migration creates the complete database schema including:
  
  1. New Tables
     - `documents` - Stores processed documents with OCR data and metadata
     - `templates` - Stores document templates for field mapping
  
  2. Functions
     - `update_updated_at_column()` - Trigger function to automatically update timestamps
  
  3. Security
     - Enable RLS on all tables
     - Add policies for public access (as per existing schema)
     - Add policies for authenticated users
  
  4. Indexes
     - Performance indexes for common queries
     - GIN indexes for JSONB fields
  
  5. Triggers
     - Auto-update timestamps on record changes
  
  6. Constraints
     - Primary keys and check constraints for data integrity

  Run this script in your Supabase SQL Editor to set up the complete schema.
*/

-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id text PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    template jsonb NOT NULL DEFAULT '[]'::jsonb,
    validation_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id text PRIMARY KEY,
    type jsonb NOT NULL,
    template_version text NOT NULL DEFAULT 'v1.0',
    tags text[] DEFAULT '{}',
    fields jsonb NOT NULL DEFAULT '{}'::jsonb,
    ocr_raw_text text NOT NULL DEFAULT '',
    image_url text DEFAULT '',
    created_by text NOT NULL,
    location text NOT NULL,
    status text NOT NULL,
    confidence real NOT NULL DEFAULT 0,
    timestamp timestamptz NOT NULL DEFAULT now(),
    document_data text DEFAULT '',
    extracted_images jsonb DEFAULT '[]'::jsonb,
    processing_metadata jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Add constraint for status values
    CONSTRAINT documents_status_check CHECK (status = ANY (ARRAY['pending'::text, 'finalized'::text, 'rejected'::text]))
);

-- Enable Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create indexes for templates table
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates USING btree (name);
CREATE INDEX IF NOT EXISTS idx_templates_template ON templates USING gin (template);

-- Create indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_documents_fields ON documents USING gin (fields);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents USING gin (type);

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Templates table policies
DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;
CREATE POLICY "Templates are viewable by everyone"
    ON templates FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Templates can be inserted by everyone" ON templates;
CREATE POLICY "Templates can be inserted by everyone"
    ON templates FOR INSERT
    TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "Templates can be updated by everyone" ON templates;
CREATE POLICY "Templates can be updated by everyone"
    ON templates FOR UPDATE
    TO public
    USING (true);

DROP POLICY IF EXISTS "Templates can be deleted by everyone" ON templates;
CREATE POLICY "Templates can be deleted by everyone"
    ON templates FOR DELETE
    TO public
    USING (true);

-- Authenticated user policies for templates
DROP POLICY IF EXISTS "Users can read all templates" ON templates;
CREATE POLICY "Users can read all templates"
    ON templates FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert templates" ON templates;
CREATE POLICY "Users can insert templates"
    ON templates FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update templates" ON templates;
CREATE POLICY "Users can update templates"
    ON templates FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can delete templates" ON templates;
CREATE POLICY "Users can delete templates"
    ON templates FOR DELETE
    TO authenticated
    USING (true);

-- Documents table policies
DROP POLICY IF EXISTS "Documents are viewable by everyone" ON documents;
CREATE POLICY "Documents are viewable by everyone"
    ON documents FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Documents can be inserted by everyone" ON documents;
CREATE POLICY "Documents can be inserted by everyone"
    ON documents FOR INSERT
    TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "Documents can be updated by everyone" ON documents;
CREATE POLICY "Documents can be updated by everyone"
    ON documents FOR UPDATE
    TO public
    USING (true);

DROP POLICY IF EXISTS "Documents can be deleted by everyone" ON documents;
CREATE POLICY "Documents can be deleted by everyone"
    ON documents FOR DELETE
    TO public
    USING (true);

-- Insert some sample templates to get started
INSERT INTO templates (id, name, category, template, validation_rules) VALUES
(
    'transfer',
    'Transfer Order',
    'Administrative',
    '[
        {"id": "officerName", "label": "Officer Name", "type": "text", "required": true},
        {"id": "rank", "label": "Rank", "type": "select", "required": true, "options": ["Constable", "Head Constable", "Sub-Inspector", "Inspector", "DSP"]},
        {"id": "fromStation", "label": "From Station", "type": "text", "required": true},
        {"id": "toStation", "label": "To Station", "type": "text", "required": true},
        {"id": "transferDate", "label": "Transfer Date", "type": "date", "required": true},
        {"id": "reason", "label": "Reason", "type": "textarea", "required": true},
        {"id": "authoritySignature", "label": "Authority Signature", "type": "text", "required": true}
    ]'::jsonb,
    '[]'::jsonb
),
(
    'award',
    'Award Certificate',
    'Recognition',
    '[
        {"id": "recipientName", "label": "Recipient Name", "type": "text", "required": true},
        {"id": "rank", "label": "Rank", "type": "select", "required": true, "options": ["Constable", "Head Constable", "Sub-Inspector", "Inspector", "DSP"]},
        {"id": "awardType", "label": "Award Type", "type": "select", "required": true, "options": ["Gallantry Award", "Service Medal", "Commendation", "Excellence Award"]},
        {"id": "awardDate", "label": "Award Date", "type": "date", "required": true},
        {"id": "citation", "label": "Citation", "type": "textarea", "required": true},
        {"id": "issuingAuthority", "label": "Issuing Authority", "type": "text", "required": true}
    ]'::jsonb,
    '[]'::jsonb
),
(
    'complaint',
    'Complaint Record',
    'Disciplinary',
    '[
        {"id": "complainantName", "label": "Complainant Name", "type": "text", "required": true},
        {"id": "officerName", "label": "Officer Name", "type": "text", "required": true},
        {"id": "complaintDate", "label": "Complaint Date", "type": "date", "required": true},
        {"id": "incidentDate", "label": "Incident Date", "type": "date", "required": true},
        {"id": "description", "label": "Description", "type": "textarea", "required": true},
        {"id": "status", "label": "Status", "type": "select", "required": true, "options": ["Pending", "Under Investigation", "Resolved", "Dismissed"]}
    ]'::jsonb,
    '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Verify the setup
SELECT 'Templates table created successfully' as status, count(*) as template_count FROM templates;
SELECT 'Documents table created successfully' as status, count(*) as document_count FROM documents;