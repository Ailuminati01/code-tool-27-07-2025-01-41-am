/*
  # Update Probation Letter Template

  1. Template Updates
    - Update probation_letter template with comprehensive field structure
    - Add all required fields for probation letter processing
    - Include proper validation rules

  2. Field Structure
    - Basic information fields (name, service class, dates)
    - Assessment fields (character, conduct, performance)
    - Officer details (reporting, countersigning, HOD)
    - Probation-specific fields (tests, punishments, remarks)
*/

-- Update the probation_letter template with the comprehensive new field structure
UPDATE templates 
SET template = $template$[
  {
    "id": "serviceClassCategory",
    "label": "Service Class Category",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s]+$",
    "placeholder": "e.g., Reserve Inspector of Police"
  },
  {
    "id": "nameOfProbationer",
    "label": "Name of Probationer",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s\\.]+$",
    "placeholder": "Full name with valid initials"
  },
  {
    "id": "dateOfRegularization",
    "label": "Date of Regularization",
    "type": "date",
    "required": true
  },
  {
    "id": "periodOfProbationPrescribed",
    "label": "Period of Probation Prescribed",
    "type": "text",
    "required": true,
    "placeholder": "e.g., one year, two years"
  },
  {
    "id": "leaveTakenDuringProbation",
    "label": "Leave Taken During Probation",
    "type": "text",
    "required": true,
    "placeholder": "From: DD-MM-YYYY To: DD-MM-YYYY or NIL"
  },
  {
    "id": "dateOfCompletionOfProbation",
    "label": "Date of Completion of Probation",
    "type": "date",
    "required": true
  },
  {
    "id": "testsToBePassedDuringProbation",
    "label": "Tests to be Passed During Probation",
    "type": "textarea",
    "required": true,
    "placeholder": "Define tests or enter NIL if none"
  },
  {
    "id": "punishmentsDuringProbation",
    "label": "Punishments During Probation",
    "type": "textarea",
    "required": true,
    "placeholder": "Define punishments or enter NIL if none"
  },
  {
    "id": "pendingPROE",
    "label": "Pending PR/OE",
    "type": "textarea",
    "required": true,
    "placeholder": "Full reasoning of pending PR/OE or NIL if none"
  },
  {
    "id": "characterAndConduct",
    "label": "Character and Conduct",
    "type": "select",
    "required": true,
    "options": ["Satisfactory", "Good", "Excellent"]
  },
  {
    "id": "firingPracticeCompleted",
    "label": "Firing Practice Completed",
    "type": "select",
    "required": true,
    "options": ["YES", "NO"]
  },
  {
    "id": "remarksOfICOfficer",
    "label": "Remarks of I/C Officer",
    "type": "textarea",
    "required": true,
    "placeholder": "Clear statement of recommendation"
  },
  {
    "id": "remarksOfCommandant",
    "label": "Remarks of Commandant",
    "type": "textarea",
    "required": true,
    "placeholder": "Final remarks regarding probation"
  },
  {
    "id": "remarksOfDIG",
    "label": "Remarks of DIG",
    "type": "textarea",
    "required": true,
    "placeholder": "Opinion confirming or disagreeing with earlier recommendations"
  },
  {
    "id": "adgpOrders",
    "label": "ADGP Orders",
    "type": "textarea",
    "required": true,
    "placeholder": "Final order and status including effective dates"
  },
  {
    "id": "dateOfBirth",
    "label": "Date of Birth",
    "type": "date",
    "required": true
  },
  {
    "id": "salary",
    "label": "Salary",
    "type": "number",
    "required": true,
    "placeholder": "Monthly salary in Indian Rupees"
  },
  {
    "id": "qualification",
    "label": "Qualification",
    "type": "text",
    "required": true,
    "placeholder": "e.g., B.Tech (CSE)"
  },
  {
    "id": "acceptanceOfSelfAppraisalReport",
    "label": "Acceptance of Self Appraisal Report – Part-I",
    "type": "select",
    "required": true,
    "options": ["Accepted", "Not Accepted"]
  },
  {
    "id": "assessmentOfPerformance",
    "label": "Assessment of Officer's Performance During the Year",
    "type": "select",
    "required": true,
    "options": ["Satisfactory", "Good", "Excellent"]
  },
  {
    "id": "reportingOfficerDate",
    "label": "Reporting Officer - Date",
    "type": "date",
    "required": false
  },
  {
    "id": "reportingOfficerName",
    "label": "Reporting Officer - Name",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s\\.]+$"
  },
  {
    "id": "reportingOfficerDesignation",
    "label": "Reporting Officer - Designation",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s]+$"
  },
  {
    "id": "countersigningOfficerDate",
    "label": "Countersigning Officer - Date",
    "type": "text",
    "required": false,
    "placeholder": "DD-MM-YYYY or Not Found"
  },
  {
    "id": "countersigningOfficerName",
    "label": "Countersigning Officer - Name",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s\\.]+$"
  },
  {
    "id": "countersigningOfficerDesignation",
    "label": "Countersigning Officer - Designation",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s]+$"
  },
  {
    "id": "countersigningOfficerRemarks",
    "label": "Countersigning Officer - Remarks",
    "type": "textarea",
    "required": true,
    "placeholder": "e.g., I agree with Remarks of the reporting officer"
  },
  {
    "id": "hodOpinion",
    "label": "Head of Department Opinion",
    "type": "text",
    "required": true,
    "placeholder": "e.g., Probation Declared"
  },
  {
    "id": "hodDate",
    "label": "Head of Department - Date",
    "type": "date",
    "required": false
  },
  {
    "id": "hodName",
    "label": "Head of Department - Name",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s\\.]+$"
  },
  {
    "id": "hodDesignation",
    "label": "Head of Department - Designation",
    "type": "text",
    "required": true,
    "validation": "^[A-Za-z\\s]+$"
  }
]$template$::jsonb,
validation_rules = $validation$[
  {
    "field": "serviceClassCategory",
    "rule": "format",
    "pattern": "^[A-Za-z\\s]+$",
    "message": "Must be a valid designation like Reserve Inspector of Police"
  },
  {
    "field": "nameOfProbationer",
    "rule": "format",
    "pattern": "^[A-Za-z\\s\\.]+$",
    "message": "Should only contain alphabets and valid initials"
  },
  {
    "field": "leaveTakenDuringProbation",
    "rule": "format",
    "message": "Must include From and To dates or NIL"
  },
  {
    "field": "testsToBePassedDuringProbation",
    "rule": "nil_or_content",
    "message": "If none, value must be NIL else define the tests which need to be passed"
  },
  {
    "field": "punishmentsDuringProbation",
    "rule": "nil_or_content",
    "message": "If none, value must be NIL else define the punishment during probation"
  },
  {
    "field": "pendingPROE",
    "rule": "nil_or_content",
    "message": "If none, value must be NIL else mention the full reasoning of the pending PR or OE"
  },
  {
    "field": "characterAndConduct",
    "rule": "enum",
    "values": ["Satisfactory", "Good", "Excellent"],
    "message": "Common values are: Satisfactory, Good, Excellent"
  },
  {
    "field": "firingPracticeCompleted",
    "rule": "enum",
    "values": ["YES", "NO"],
    "message": "Accepted values: YES, NO"
  },
  {
    "field": "remarksOfICOfficer",
    "rule": "required",
    "message": "Must be a clear statement of recommendation"
  },
  {
    "field": "remarksOfCommandant",
    "rule": "required",
    "message": "Must be a recommendation statement"
  },
  {
    "field": "remarksOfDIG",
    "rule": "required",
    "message": "Should confirm or disagree with earlier recommendations"
  },
  {
    "field": "adgpOrders",
    "rule": "required",
    "message": "Must include effective dates and A list inclusion if mentioned"
  },
  {
    "field": "dateOfBirth",
    "rule": "date_format",
    "format": "DD-MM-YYYY",
    "message": "Must be a valid date in DD-MM-YYYY format"
  },
  {
    "field": "salary",
    "rule": "positive_number",
    "message": "Salary must be a positive number in Indian Rupees"
  },
  {
    "field": "qualification",
    "rule": "format",
    "message": "Degree with specialization. Example: B.Tech (CSE)"
  },
  {
    "field": "acceptanceOfSelfAppraisalReport",
    "rule": "enum",
    "values": ["Accepted", "Not Accepted"],
    "message": "Accepted values: Accepted, Not Accepted"
  },
  {
    "field": "assessmentOfPerformance",
    "rule": "enum",
    "values": ["Satisfactory", "Good", "Excellent"],
    "message": "Typical values: Satisfactory, Good, Excellent"
  },
  {
    "field": "reportingOfficerName",
    "rule": "format",
    "pattern": "^[A-Za-z\\s\\.]+$",
    "message": "Name of the Reporting Officer"
  },
  {
    "field": "reportingOfficerDesignation",
    "rule": "format",
    "pattern": "^[A-Za-z\\s]+$",
    "message": "Officer Designation"
  },
  {
    "field": "countersigningOfficerName",
    "rule": "format",
    "pattern": "^[A-Za-z\\s\\.]+$",
    "message": "Name of the Countersigning Officer"
  },
  {
    "field": "countersigningOfficerDesignation",
    "rule": "format",
    "pattern": "^[A-Za-z\\s]+$",
    "message": "Officer Designation"
  },
  {
    "field": "countersigningOfficerRemarks",
    "rule": "required",
    "message": "Remarks given by the Countersigning Officer"
  },
  {
    "field": "hodOpinion",
    "rule": "required",
    "message": "Final status regarding probation. Example: Probation Declared"
  },
  {
    "field": "hodName",
    "rule": "format",
    "pattern": "^[A-Za-z\\s\\.]+$",
    "message": "Name of the Head of Department"
  },
  {
    "field": "hodDesignation",
    "rule": "format",
    "pattern": "^[A-Za-z\\s]+$",
    "message": "Officer Designation"
  }
]$validation$::jsonb,
updated_at = now()
WHERE id = 'probation_letter';

-- Verify the update was successful
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM templates 
    WHERE id = 'probation_letter' 
    AND template::text LIKE '%serviceClassCategory%'
  ) THEN
    RAISE EXCEPTION 'Failed to update probation_letter template';
  END IF;
  
  RAISE NOTICE 'Probation Letter template updated successfully with comprehensive field structure';
END $$;