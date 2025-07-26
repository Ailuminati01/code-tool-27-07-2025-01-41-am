-- Update the medical_leave template with the new field structure
UPDATE templates 
SET template = '[
  {
    "id": "name",
    "label": "Name",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s\\.]+$",
    "placeholder": "Full name of the personnel"
  },
  {
    "id": "dateOfSubmission",
    "label": "Date of Submission",
    "type": "date",
    "required": true
  },
  {
    "id": "coyBelongsTo",
    "label": "Coy Belongs to",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z0-9\\s]+$",
    "placeholder": "e.g., A Coy, B Coy, HQ Coy"
  },
  {
    "id": "rank",
    "label": "Rank",
    "type": "select",
    "required": true,
    "options": ["PC", "HC", "SI", "ASI", "Inspector", "DSP", "SP", "DIG", "IG", "ADGP", "DGP"]
  },
  {
    "id": "leaveReason",
    "label": "Leave Reason",
    "type": "textarea",
    "required": true,
    "placeholder": "Descriptive sentence explaining the medical purpose"
  },
  {
    "id": "phoneNumber",
    "label": "Phone Number",
    "type": "text",
    "required": true,
    "validation": "^[6-9][0-9]{9}$",
    "placeholder": "10-digit mobile number"
  },
  {
    "id": "unitAndDistrict",
    "label": "Unit and District",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z0-9\\s\\.,]+$",
    "placeholder": "e.g., 5th Bn. APSP, Vizianagaram"
  }
]'::jsonb,
validation_rules = '[
  {
    "field": "name",
    "rule": "format",
    "pattern": "^[A-Za-z\\s\\.]+$",
    "message": "Name should contain only alphabets, periods (.) and spaces. No digits or special characters."
  },
  {
    "field": "coyBelongsTo",
    "rule": "format",
    "pattern": "^[A-Za-z0-9\\s]+$",
    "message": "Company field should clearly indicate the unit/company affiliation (e.g., A Coy, B Coy, HQ Coy)"
  },
  {
    "field": "phoneNumber",
    "rule": "format",
    "pattern": "^[6-9][0-9]{9}$",
    "message": "Must be a valid 10-digit Indian mobile number starting with 6-9"
  },
  {
    "field": "unitAndDistrict",
    "rule": "format",
    "pattern": "^[A-Za-z0-9\\s\\.,]+$",
    "message": "Must include both unit name and valid district name (e.g., 5th Bn. APSP, Vizianagaram)"
  },
  {
    "field": "leaveReason",
    "rule": "required",
    "message": "Leave reason must be a descriptive sentence explaining the medical purpose"
  }
]'::jsonb,
updated_at = now()
WHERE id = 'medical_leave';

-- Verify the update was successful
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM templates 
    WHERE id = 'medical_leave' 
    AND template::text LIKE '%dateOfSubmission%'
  ) THEN
    RAISE EXCEPTION 'Failed to update medical_leave template';
  END IF;
  
  RAISE NOTICE 'Medical Leave Letter template updated successfully with new field structure';
END $$;