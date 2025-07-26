/*
  # Update Earned Leave Letter Template

  1. Template Updates
    - Update the earned_leave template with new field structure
    - Replace existing fields with the specified JSON format fields
    - Maintain proper validation and data types

  2. Fields Updated
    - R c No. (string, required)
    - H.O.D No. (string, required) 
    - PC No. or HC No or ARSI No (string, conditional)
    - Name (string, required)
    - Date (date, required)
    - Number of Days (integer, required)
    - Leave From Date (date, required)
    - Leave To Date (date, required)
    - Leave Reason (string, required)
*/

-- Update the earned_leave template with the new field structure
UPDATE templates 
SET template = '[
  {
    "id": "rcNo",
    "label": "R c No.",
    "type": "text",
    "required": true,
    "validation": "^[A-Z0-9]+/[0-9]{1,4}/[0-9]{4}$",
    "placeholder": "e.g., B4/149/2020"
  },
  {
    "id": "hodNo", 
    "label": "H.O.D No.",
    "type": "text",
    "required": true,
    "validation": "^[0-9]{1,4}/[0-9]{4}$",
    "placeholder": "e.g., 72/2020"
  },
  {
    "id": "serviceNo",
    "label": "PC No. or HC No or ARSI No",
    "type": "text", 
    "required": false,
    "validation": "^(PC-|HC|ARSI)[0-9]{1,4}$",
    "placeholder": "e.g., PC-1158, HC123, ARSI456"
  },
  {
    "id": "name",
    "label": "Name",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s\\.]+$",
    "placeholder": "e.g., S. Praveen Kumar"
  },
  {
    "id": "date",
    "label": "Date",
    "type": "date",
    "required": true
  },
  {
    "id": "numberOfDays",
    "label": "Number of Days",
    "type": "number",
    "required": true,
    "validation": "^[1-9][0-9]*$"
  },
  {
    "id": "leaveFromDate",
    "label": "Leave From Date", 
    "type": "date",
    "required": true
  },
  {
    "id": "leaveToDate",
    "label": "Leave To Date",
    "type": "date", 
    "required": true
  },
  {
    "id": "leaveReason",
    "label": "Leave Reason",
    "type": "textarea",
    "required": true,
    "placeholder": "Reason for availing leave"
  }
]'::jsonb,
validation_rules = '[
  {
    "field": "rcNo",
    "rule": "format",
    "pattern": "^[A-Z0-9]+/[0-9]{1,4}/[0-9]{4}$",
    "message": "R c No. must be in format: Section Code/Serial Number/Year (e.g., B4/149/2020)"
  },
  {
    "field": "hodNo", 
    "rule": "format",
    "pattern": "^[0-9]{1,4}/[0-9]{4}$",
    "message": "H.O.D No. must be in format: Serial Number/Year (e.g., 72/2020)"
  },
  {
    "field": "serviceNo",
    "rule": "conditional_required",
    "condition": "designation in [\"PC\", \"HC\", \"ARSI\"]",
    "message": "Service number is required for PC, HC, or ARSI designations"
  },
  {
    "field": "serviceNo",
    "rule": "format", 
    "pattern": "^(PC-|HC|ARSI)[0-9]{1,4}$",
    "message": "Service number must begin with PC-, HC, or ARSI followed by 1-4 digits"
  },
  {
    "field": "name",
    "rule": "format",
    "pattern": "^[A-Za-z\\s\\.]+$", 
    "message": "Name must contain only alphabets, spaces, and periods"
  },
  {
    "field": "numberOfDays",
    "rule": "range",
    "min": 1,
    "max": 365,
    "message": "Number of days must be between 1 and 365"
  },
  {
    "field": "leaveToDate",
    "rule": "date_after",
    "compare_field": "leaveFromDate",
    "message": "Leave To Date must be after Leave From Date"
  }
]'::jsonb,
updated_at = now()
WHERE id = 'earned_leave';

-- Verify the update was successful
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM templates 
    WHERE id = 'earned_leave' 
    AND template::text LIKE '%rcNo%'
  ) THEN
    RAISE EXCEPTION 'Failed to update earned_leave template';
  END IF;
  
  RAISE NOTICE 'Earned Leave Letter template updated successfully with new field structure';
END $$;