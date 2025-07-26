/*
  # Update Punishment Letter Template

  1. Template Updates
    - Update punishment_letter template with comprehensive field structure
    - Add 7 specific fields for punishment documentation
    - Include proper validation rules and formatting

  2. Field Structure
    - R c. No: Reference number with complex format validation
    - D. O No: Departmental Order Number
    - Order Date: Date punishment order was issued
    - Punishment Awarded: Type and details of punishment
    - Delinquency Description: Details of misconduct
    - Issued By: Authority who issued the order
    - Issued Date: Final issuance date

  3. Validation Rules
    - Complex format validation for reference numbers
    - Date format validation
    - Required field enforcement
    - Proper punishment documentation standards
*/

-- Update the punishment_letter template with the new comprehensive field structure
UPDATE templates 
SET template = $template$[
  {
    "id": "rcNo",
    "label": "R c. No",
    "type": "text",
    "required": true,
    "validation": "^[0-9]+/[A-Z0-9]+/PR-[0-9]+/[0-9]{2}-[0-9]{2}$",
    "placeholder": "e.g., 123/B4/PR-309/23-24"
  },
  {
    "id": "doNo",
    "label": "D. O No",
    "type": "text",
    "required": true,
    "validation": "^[0-9]+/[0-9]{4}$",
    "placeholder": "e.g., 709/2024"
  },
  {
    "id": "orderDate",
    "label": "Order Date",
    "type": "date",
    "required": true
  },
  {
    "id": "punishmentAwarded",
    "label": "Punishment Awarded",
    "type": "textarea",
    "required": true,
    "placeholder": "PP I or PP II followed by duration and conditions"
  },
  {
    "id": "delinquencyDescription",
    "label": "Delinquency Description",
    "type": "textarea",
    "required": true,
    "placeholder": "Details of misconduct with w.e.f. date of violation"
  },
  {
    "id": "issuedBy",
    "label": "Issued By",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s,.-]+$",
    "placeholder": "Designation and Unit"
  },
  {
    "id": "issuedDate",
    "label": "Issued Date",
    "type": "date",
    "required": true
  }
]$template$::jsonb,
validation_rules = $validation$[
  {
    "field": "rcNo",
    "rule": "format",
    "pattern": "^[0-9]+/[A-Z0-9]+/PR-[0-9]+/[0-9]{2}-[0-9]{2}$",
    "message": "R c. No must contain reference number/section code/PR-serial number/year range (e.g., 123/B4/PR-309/23-24)"
  },
  {
    "field": "doNo",
    "rule": "format",
    "pattern": "^[0-9]+/[0-9]{4}$",
    "message": "D. O No must be in format: Reference Number/YYYY (e.g., 709/2024)"
  },
  {
    "field": "orderDate",
    "rule": "date_format",
    "format": "DD/MM/YY or DD-MM-YYYY",
    "message": "Order date must be in DD/MM/YY or DD-MM-YYYY format"
  },
  {
    "field": "punishmentAwarded",
    "rule": "required",
    "message": "Should clearly indicate punishment level (PP I or PP II), duration, and clause"
  },
  {
    "field": "delinquencyDescription",
    "rule": "required",
    "message": "Should contain details of violation and w.e.f. date of violation"
  },
  {
    "field": "issuedBy",
    "rule": "format",
    "pattern": "^[A-Za-z\\s,.-]+$",
    "message": "Should include officer rank and unit details"
  },
  {
    "field": "issuedDate",
    "rule": "date_format",
    "format": "DD/MM/YY or DD-MM-YYYY",
    "message": "Issued date must be in DD/MM/YY or DD-MM-YYYY format"
  },
  {
    "field": "issuedDate",
    "rule": "date_after_or_equal",
    "compare_field": "orderDate",
    "message": "Issued Date must be on or after Order Date"
  }
]$validation$::jsonb,
updated_at = now()
WHERE id = 'punishment_letter';

-- Verify the update was successful
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM templates 
    WHERE id = 'punishment_letter' 
    AND template::text LIKE '%rcNo%'
    AND template::text LIKE '%delinquencyDescription%'
  ) THEN
    RAISE EXCEPTION 'Failed to update punishment_letter template';
  END IF;
  
  RAISE NOTICE 'Punishment Letter template updated successfully with new field structure';
END $$;