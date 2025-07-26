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

-- Create indexes for templates table
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates USING btree (name);

-- Create indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs USING btree (action);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users USING btree (username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users USING btree (role);
CREATE INDEX IF NOT EXISTS idx_users_station ON users USING btree (station);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones for documents
DROP POLICY IF EXISTS "Users can read own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

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

-- Drop existing policies if they exist, then create new ones for templates
DROP POLICY IF EXISTS "Authenticated users can read templates" ON templates;
DROP POLICY IF EXISTS "Authenticated users can create templates" ON templates;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON templates;
DROP POLICY IF EXISTS "Authenticated users can delete templates" ON templates;

CREATE POLICY "Authenticated users can read templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create templates"
  ON templates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates"
  ON templates
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete templates"
  ON templates
  FOR DELETE
  TO authenticated
  USING (true);

-- Drop existing policies if they exist, then create new ones for audit_logs
DROP POLICY IF EXISTS "Users can read own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

CREATE POLICY "Users can read own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Drop existing policies if they exist, then create new ones for users
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

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