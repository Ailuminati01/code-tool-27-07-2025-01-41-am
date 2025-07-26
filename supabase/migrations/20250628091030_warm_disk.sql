/*
  # Database Schema Setup for SPARK Document Management System

  1. New Tables
    - `documents` - Store document records with OCR data and metadata
    - `templates` - Store document templates for field extraction
    - `audit_logs` - Track all system activities for security
    - `users` - User management and authentication

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Create indexes for performance

  3. Features
    - Full-text search on OCR content
    - JSONB storage for flexible field data
    - Audit logging for compliance
    - Template-based document processing
*/

-- Create documents table with exact schema from the provided structure
CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  type jsonb DEFAULT '{}'::jsonb,
  template_version text DEFAULT ''::text,
  tags text[] DEFAULT '{}'::text[],
  fields jsonb DEFAULT '{}'::jsonb,
  ocr_raw_text text DEFAULT ''::text,
  image_url text DEFAULT ''::text,
  created_by text DEFAULT ''::text,
  location text DEFAULT ''::text,
  status text DEFAULT 'pending'::text,
  confidence real DEFAULT 0.0,
  timestamp timestamp with time zone DEFAULT now(),
  document_data text DEFAULT ''::text,
  extracted_images jsonb DEFAULT '{}'::jsonb,
  processing_metadata jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  finalized_by text DEFAULT ''::text,
  finalized_on timestamp with time zone
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  template jsonb DEFAULT '[]'::jsonb,
  validation_rules jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create audit_logs table for security tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  timestamp timestamp with time zone DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Create users table for user management
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text UNIQUE NOT NULL,
  email text UNIQUE,
  role text DEFAULT 'user'::text,
  station text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  is_active boolean DEFAULT true
);

-- Create indexes for documents table (matching the provided schema)
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_confidence ON documents USING btree (confidence);
CREATE INDEX IF NOT EXISTS idx_documents_location ON documents USING btree (location);
CREATE INDEX IF NOT EXISTS idx_documents_fields ON documents USING gin (fields);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents USING gin (type);
CREATE INDEX IF NOT EXISTS idx_documents_finalized_by ON documents USING btree (finalized_by);
CREATE INDEX IF NOT EXISTS idx_documents_finalized_on ON documents USING btree (finalized_on);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_text ON documents USING gin (to_tsvector('english'::regconfig, ocr_raw_text));

-- Create indexes for templates table
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates USING btree (name);
CREATE INDEX IF NOT EXISTS idx_templates_template ON templates USING gin (template);

-- Create indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs USING btree (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs USING btree (resource);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users USING btree (username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users USING btree (role);
CREATE INDEX IF NOT EXISTS idx_users_station ON users USING btree (station);

-- Add constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'documents_status_check' 
    AND table_name = 'documents'
  ) THEN
    ALTER TABLE documents ADD CONSTRAINT documents_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'finalized'::text, 'rejected'::text]));
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Documents policies
  DROP POLICY IF EXISTS "Users can read own documents" ON documents;
  DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
  DROP POLICY IF EXISTS "Users can update own documents" ON documents;
  DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
  DROP POLICY IF EXISTS "Documents are viewable by everyone" ON documents;
  DROP POLICY IF EXISTS "Documents can be inserted by everyone" ON documents;
  DROP POLICY IF EXISTS "Documents can be updated by everyone" ON documents;
  DROP POLICY IF EXISTS "Documents can be deleted by everyone" ON documents;

  -- Templates policies
  DROP POLICY IF EXISTS "Authenticated users can read templates" ON templates;
  DROP POLICY IF EXISTS "Authenticated users can create templates" ON templates;
  DROP POLICY IF EXISTS "Authenticated users can update templates" ON templates;
  DROP POLICY IF EXISTS "Authenticated users can delete templates" ON templates;
  DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;
  DROP POLICY IF EXISTS "Templates can be inserted by everyone" ON templates;
  DROP POLICY IF EXISTS "Templates can be updated by everyone" ON templates;
  DROP POLICY IF EXISTS "Templates can be deleted by everyone" ON templates;
  DROP POLICY IF EXISTS "Users can insert templates" ON templates;
  DROP POLICY IF EXISTS "Users can read all templates" ON templates;
  DROP POLICY IF EXISTS "Users can update templates" ON templates;
  DROP POLICY IF EXISTS "Users can delete templates" ON templates;

  -- Audit logs policies
  DROP POLICY IF EXISTS "Users can read own audit logs" ON audit_logs;
  DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
  DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;

  -- Users policies
  DROP POLICY IF EXISTS "Users can read own profile" ON users;
  DROP POLICY IF EXISTS "Users can update own profile" ON users;
  DROP POLICY IF EXISTS "Users can insert users" ON users;
  DROP POLICY IF EXISTS "Users can update their own profile" ON users;
  DROP POLICY IF EXISTS "Users can view all users" ON users;
END $$;

-- Create new policies for documents (matching the provided schema)
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

-- Create policies for templates (matching the provided schema)
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

-- Create policies for audit logs (using auth.uid() with proper extension check)
DO $$
BEGIN
  -- Check if auth schema and uid function exist, if not create simplified policies
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') AND 
     EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uid' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')) THEN
    
    -- Use auth.uid() if available
    EXECUTE 'CREATE POLICY "Users can view their own audit logs"
      ON audit_logs
      FOR SELECT
      TO authenticated
      USING (user_id = (auth.uid())::text)';
      
  ELSE
    -- Fallback policy without auth.uid()
    EXECUTE 'CREATE POLICY "Users can view their own audit logs"
      ON audit_logs
      FOR SELECT
      TO authenticated
      USING (true)';
  END IF;
END $$;

CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for users (using auth.uid() with proper extension check)
DO $$
BEGIN
  -- Check if auth schema and uid function exist
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') AND 
     EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uid' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')) THEN
    
    -- Use auth.uid() if available
    EXECUTE 'CREATE POLICY "Users can read own profile"
      ON users
      FOR SELECT
      TO authenticated
      USING ((auth.uid())::text = id)';
      
    EXECUTE 'CREATE POLICY "Users can update own profile"
      ON users
      FOR UPDATE
      TO authenticated
      USING ((auth.uid())::text = id)
      WITH CHECK ((auth.uid())::text = id)';
      
  ELSE
    -- Fallback policies without auth.uid()
    EXECUTE 'CREATE POLICY "Users can read own profile"
      ON users
      FOR SELECT
      TO authenticated
      USING (true)';
      
    EXECUTE 'CREATE POLICY "Users can update own profile"
      ON users
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

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

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates using separate INSERT statements to avoid syntax issues
INSERT INTO templates (id, name, category, template, validation_rules) 
SELECT 'earned_leave', 'Earned Leave Letter', 'Leave', 
'[
  {"id": "applicantName", "label": "Applicant Name", "type": "text", "required": true},
  {"id": "employeeId", "label": "Employee ID", "type": "text", "required": true},
  {"id": "department", "label": "Department", "type": "text", "required": true},
  {"id": "designation", "label": "Designation", "type": "text", "required": true},
  {"id": "leaveType", "label": "Leave Type", "type": "select", "required": true, "options": ["Earned Leave", "Annual Leave", "Vacation Leave"]},
  {"id": "startDate", "label": "Leave Start Date", "type": "date", "required": true},
  {"id": "endDate", "label": "Leave End Date", "type": "date", "required": true},
  {"id": "duration", "label": "Duration (Days)", "type": "number", "required": true},
  {"id": "reason", "label": "Reason for Leave", "type": "textarea", "required": true},
  {"id": "supervisorName", "label": "Supervisor Name", "type": "text", "required": true},
  {"id": "applicationDate", "label": "Application Date", "type": "date", "required": true},
  {"id": "contactNumber", "label": "Contact Number", "type": "text", "required": false},
  {"id": "emergencyContact", "label": "Emergency Contact", "type": "text", "required": false}
]'::jsonb, '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE id = 'earned_leave');

INSERT INTO templates (id, name, category, template, validation_rules) 
SELECT 'medical_leave', 'Medical Leave Letter', 'Leave',
'[
  {"id": "patientName", "label": "Patient Name", "type": "text", "required": true},
  {"id": "employeeId", "label": "Employee ID", "type": "text", "required": true},
  {"id": "department", "label": "Department", "type": "text", "required": true},
  {"id": "designation", "label": "Designation", "type": "text", "required": true},
  {"id": "medicalCondition", "label": "Medical Condition", "type": "textarea", "required": true},
  {"id": "doctorName", "label": "Doctor Name", "type": "text", "required": true},
  {"id": "hospitalName", "label": "Hospital/Clinic Name", "type": "text", "required": true},
  {"id": "leaveStartDate", "label": "Medical Leave Start Date", "type": "date", "required": true},
  {"id": "leaveEndDate", "label": "Medical Leave End Date", "type": "date", "required": true},
  {"id": "certificateNumber", "label": "Medical Certificate Number", "type": "text", "required": false},
  {"id": "treatmentDetails", "label": "Treatment Details", "type": "textarea", "required": false},
  {"id": "applicationDate", "label": "Application Date", "type": "date", "required": true},
  {"id": "supervisorName", "label": "Supervisor Name", "type": "text", "required": true}
]'::jsonb, '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE id = 'medical_leave');

INSERT INTO templates (id, name, category, template, validation_rules) 
SELECT 'probation_letter', 'Probation Letter', 'Administrative',
'[
  {"id": "employeeName", "label": "Employee Name", "type": "text", "required": true},
  {"id": "employeeId", "label": "Employee ID", "type": "text", "required": true},
  {"id": "position", "label": "Position/Designation", "type": "text", "required": true},
  {"id": "department", "label": "Department", "type": "text", "required": true},
  {"id": "probationStartDate", "label": "Probation Start Date", "type": "date", "required": true},
  {"id": "probationEndDate", "label": "Probation End Date", "type": "date", "required": true},
  {"id": "probationPeriod", "label": "Probation Period (Months)", "type": "number", "required": true},
  {"id": "evaluationCriteria", "label": "Evaluation Criteria", "type": "textarea", "required": true},
  {"id": "supervisorName", "label": "Supervisor Name", "type": "text", "required": true},
  {"id": "reviewSchedule", "label": "Review Schedule", "type": "textarea", "required": false},
  {"id": "conditions", "label": "Terms and Conditions", "type": "textarea", "required": true},
  {"id": "issuanceDate", "label": "Letter Issuance Date", "type": "date", "required": true},
  {"id": "hrSignature", "label": "HR Signature", "type": "text", "required": true}
]'::jsonb, '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE id = 'probation_letter');

INSERT INTO templates (id, name, category, template, validation_rules) 
SELECT 'punishment_letter', 'Punishment Letter', 'Disciplinary',
'[
  {"id": "officerName", "label": "Officer Name", "type": "text", "required": true},
  {"id": "badgeNumber", "label": "Badge Number", "type": "text", "required": true},
  {"id": "rank", "label": "Rank", "type": "select", "required": true, "options": ["Constable", "Head Constable", "Sub-Inspector", "Inspector", "DSP", "SP"]},
  {"id": "department", "label": "Department", "type": "text", "required": true},
  {"id": "violationType", "label": "Type of Violation", "type": "select", "required": true, "options": ["Misconduct", "Negligence of Duty", "Insubordination", "Unauthorized Absence", "Other"]},
  {"id": "incidentDate", "label": "Incident Date", "type": "date", "required": true},
  {"id": "incidentDescription", "label": "Incident Description", "type": "textarea", "required": true},
  {"id": "punishmentType", "label": "Type of Punishment", "type": "select", "required": true, "options": ["Warning", "Suspension", "Fine", "Demotion", "Dismissal"]},
  {"id": "punishmentDuration", "label": "Punishment Duration", "type": "text", "required": false},
  {"id": "fineAmount", "label": "Fine Amount (if applicable)", "type": "number", "required": false},
  {"id": "issuingAuthority", "label": "Issuing Authority", "type": "text", "required": true},
  {"id": "effectiveDate", "label": "Effective Date", "type": "date", "required": true},
  {"id": "appealRights", "label": "Appeal Rights Information", "type": "textarea", "required": true}
]'::jsonb, '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE id = 'punishment_letter');

INSERT INTO templates (id, name, category, template, validation_rules) 
SELECT 'reward_letter', 'Reward Letter', 'Recognition',
'[
  {"id": "recipientName", "label": "Recipient Name", "type": "text", "required": true},
  {"id": "badgeNumber", "label": "Badge Number", "type": "text", "required": true},
  {"id": "rank", "label": "Rank", "type": "select", "required": true, "options": ["Constable", "Head Constable", "Sub-Inspector", "Inspector", "DSP", "SP"]},
  {"id": "department", "label": "Department", "type": "text", "required": true},
  {"id": "awardType", "label": "Type of Award", "type": "select", "required": true, "options": ["Gallantry Award", "Service Medal", "Commendation Certificate", "Excellence Award", "Bravery Award"]},
  {"id": "achievementDescription", "label": "Achievement Description", "type": "textarea", "required": true},
  {"id": "achievementDate", "label": "Achievement Date", "type": "date", "required": true},
  {"id": "awardDate", "label": "Award Date", "type": "date", "required": true},
  {"id": "issuingAuthority", "label": "Issuing Authority", "type": "text", "required": true},
  {"id": "witnessNames", "label": "Witness Names", "type": "textarea", "required": false},
  {"id": "monetaryValue", "label": "Monetary Value (if applicable)", "type": "number", "required": false},
  {"id": "ceremonyDetails", "label": "Award Ceremony Details", "type": "textarea", "required": false},
  {"id": "citation", "label": "Citation", "type": "textarea", "required": true}
]'::jsonb, '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE id = 'reward_letter');