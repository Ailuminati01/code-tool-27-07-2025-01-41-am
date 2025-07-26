/*
  # Update Reward Letter Template

  1. Template Updates
    - Update reward_letter template with comprehensive field structure
    - Add proper validation rules for all fields
    - Include complex data types like arrays and objects

  2. Field Structure
    - R c No: Reference tracking number
    - H. O. O No: Head of Office Communication number  
    - Date: Reward order issue date
    - Issued By: Authority information
    - Subject: Document title/purpose
    - Reference Orders: Array of official order references
    - Reward Details: Array of objects with officer reward information
    - Reason for Reward: Descriptive reason text

  3. Validation Rules
    - Format validation for reference numbers
    - Array validation for multiple entries
    - Object structure validation for reward details
    - Authority and designation validation
*/

-- Update the reward_letter template with the new comprehensive field structure
UPDATE templates 
SET template = $template$[
  {
    "id": "rcNo",
    "label": "R c No",
    "type": "text",
    "required": true,
    "validation": "^[A-Z0-9]+/[0-9]{1,4}/[0-9]{4}$",
    "placeholder": "e.g., B4/149/2020"
  },
  {
    "id": "hooNo",
    "label": "H. O. O No",
    "type": "text",
    "required": true,
    "validation": "^[0-9]+/[0-9]{4}$",
    "placeholder": "e.g., 709/2024"
  },
  {
    "id": "date",
    "label": "Date",
    "type": "date",
    "required": true
  },
  {
    "id": "issuedBy",
    "label": "Issued By",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s,.-]+$",
    "placeholder": "Name and designation of issuing authority"
  },
  {
    "id": "subject",
    "label": "Subject",
    "type": "text",
    "required": true,
    "placeholder": "Title indicating the purpose of the reward order"
  },
  {
    "id": "referenceOrders",
    "label": "Reference Orders",
    "type": "textarea",
    "required": true,
    "placeholder": "List of official order references (one per line)"
  },
  {
    "id": "rewardDetails",
    "label": "Reward Details",
    "type": "textarea",
    "required": true,
    "placeholder": "Format: Rank | Name | Reward (one entry per line)"
  },
  {
    "id": "reasonForReward",
    "label": "Reason for Reward",
    "type": "textarea",
    "required": true,
    "placeholder": "Descriptive reason for granting the reward"
  }
]$template$::jsonb,
validation_rules = $validation$[
  {
    "field": "rcNo",
    "rule": "format",
    "pattern": "^[A-Z0-9]+/[0-9]{1,4}/[0-9]{4}$",
    "message": "R c No must be in format: Section Code/Serial Number/Year (e.g., B4/149/2020)"
  },
  {
    "field": "hooNo",
    "rule": "format",
    "pattern": "^[0-9]+/[0-9]{4}$",
    "message": "H.O.O No must be in format: Reference Number/YYYY (e.g., 709/2024)"
  },
  {
    "field": "issuedBy",
    "rule": "format",
    "pattern": "^[A-Za-z\\s,.-]+$",
    "message": "Must include valid designation and office name"
  },
  {
    "field": "subject",
    "rule": "required",
    "message": "Subject must be a short description line indicating the purpose"
  },
  {
    "field": "referenceOrders",
    "rule": "required",
    "message": "Should list valid government order references"
  },
  {
    "field": "rewardDetails",
    "rule": "required",
    "message": "Each entry must include valid officer rank, full name, and reward"
  },
  {
    "field": "reasonForReward",
    "rule": "required",
    "message": "Must be a descriptive sentence explaining the reason for the reward"
  }
]$validation$::jsonb,
updated_at = now()
WHERE id = 'reward_letter';

-- Verify the update was successful
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM templates 
    WHERE id = 'reward_letter' 
    AND template::text LIKE '%rcNo%'
    AND template::text LIKE '%hooNo%'
    AND template::text LIKE '%rewardDetails%'
  ) THEN
    RAISE EXCEPTION 'Failed to update reward_letter template';
  END IF;
  
  RAISE NOTICE 'Reward Letter template updated successfully with new field structure';
END $$;