-- Create update_updated_at_column function
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
  status text NOT NULL CHECK (status IN ('pending', 'finalized', 'rejected')),
  confidence real NOT NULL DEFAULT 0,
  timestamp timestamptz NOT NULL DEFAULT now(),
  document_data text DEFAULT '',
  extracted_images jsonb DEFAULT '[]'::jsonb,
  processing_metadata jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  finalized_by text,
  finalized_on timestamptz
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text UNIQUE NOT NULL,
  email text UNIQUE,
  role text NOT NULL DEFAULT 'user',
  station text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz,
  is_active boolean DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones for templates
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

-- Drop existing policies if they exist and create new ones for documents
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

-- Drop existing policies if they exist and create new ones for audit_logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

CREATE POLICY "Users can view their own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Drop existing policies if they exist and create new ones for users
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert users" ON users;

CREATE POLICY "Users can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = (auth.uid())::text);

CREATE POLICY "Users can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for templates
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates USING btree (name);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_templates_template ON templates USING gin (template);

-- Create indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents USING gin (type);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_location ON documents USING btree (location);
CREATE INDEX IF NOT EXISTS idx_documents_confidence ON documents USING btree (confidence);
CREATE INDEX IF NOT EXISTS idx_documents_fields ON documents USING gin (fields);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_text ON documents USING gin (to_tsvector('english'::regconfig, ocr_raw_text));

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs USING btree (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs USING btree (resource);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_username ON users USING btree (username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users USING btree (role);
CREATE INDEX IF NOT EXISTS idx_users_station ON users USING btree (station);

-- Drop existing triggers if they exist and create new ones
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

-- Insert default templates (using ON CONFLICT to avoid duplicates)
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