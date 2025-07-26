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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_template ON templates USING GIN(template);

-- Create updated_at trigger for templates
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert built-in templates
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
  ]',
  '[]'
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
  ]',
  '[]'
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
  ]',
  '[]'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  template = EXCLUDED.template,
  validation_rules = EXCLUDED.validation_rules,
  updated_at = now();