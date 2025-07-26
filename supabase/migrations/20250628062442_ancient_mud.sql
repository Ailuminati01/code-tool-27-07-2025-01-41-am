-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    template JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    type JSONB NOT NULL,
    template_version TEXT NOT NULL DEFAULT 'v1.0',
    tags TEXT[] DEFAULT '{}',
    fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    ocr_raw_text TEXT NOT NULL DEFAULT '',
    image_url TEXT DEFAULT '',
    created_by TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'finalized', 'rejected')),
    confidence REAL NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    document_data TEXT DEFAULT '',
    extracted_images JSONB DEFAULT '[]'::jsonb,
    processing_metadata JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    finalized_by TEXT,
    finalized_on TIMESTAMPTZ
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    station TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates USING btree (name);
CREATE INDEX IF NOT EXISTS idx_templates_template ON templates USING gin (template);

CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_documents_fields ON documents USING gin (fields);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents USING gin (type);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_text ON documents USING gin (to_tsvector('english', ocr_raw_text));
CREATE INDEX IF NOT EXISTS idx_documents_location ON documents USING btree (location);
CREATE INDEX IF NOT EXISTS idx_documents_confidence ON documents USING btree (confidence);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs USING btree (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs USING btree (resource);

CREATE INDEX IF NOT EXISTS idx_users_username ON users USING btree (username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users USING btree (role);
CREATE INDEX IF NOT EXISTS idx_users_station ON users USING btree (station);

-- Enable Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
-- Templates policies
DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;
DROP POLICY IF EXISTS "Templates can be inserted by everyone" ON templates;
DROP POLICY IF EXISTS "Templates can be updated by everyone" ON templates;
DROP POLICY IF EXISTS "Templates can be deleted by everyone" ON templates;
DROP POLICY IF EXISTS "Users can read all templates" ON templates;
DROP POLICY IF EXISTS "Users can insert templates" ON templates;
DROP POLICY IF EXISTS "Users can update templates" ON templates;
DROP POLICY IF EXISTS "Users can delete templates" ON templates;

CREATE POLICY "Templates are viewable by everyone"
    ON templates
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Templates can be inserted by everyone"
    ON templates
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Templates can be updated by everyone"
    ON templates
    FOR UPDATE
    TO public
    USING (true);

CREATE POLICY "Templates can be deleted by everyone"
    ON templates
    FOR DELETE
    TO public
    USING (true);

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

-- Documents policies
DROP POLICY IF EXISTS "Documents are viewable by everyone" ON documents;
DROP POLICY IF EXISTS "Documents can be inserted by everyone" ON documents;
DROP POLICY IF EXISTS "Documents can be updated by everyone" ON documents;
DROP POLICY IF EXISTS "Documents can be deleted by everyone" ON documents;

CREATE POLICY "Documents are viewable by everyone"
    ON documents
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Documents can be inserted by everyone"
    ON documents
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Documents can be updated by everyone"
    ON documents
    FOR UPDATE
    TO public
    USING (true);

CREATE POLICY "Documents can be deleted by everyone"
    ON documents
    FOR DELETE
    TO public
    USING (true);

-- Audit logs policies
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

CREATE POLICY "Users can view their own audit logs"
    ON audit_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid()::text);

CREATE POLICY "System can insert audit logs"
    ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY "Users can view all users"
    ON users
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert users"
    ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
    ON users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid()::text);

-- Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates
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