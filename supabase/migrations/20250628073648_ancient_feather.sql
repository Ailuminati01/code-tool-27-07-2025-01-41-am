/*
  # Add missing finalized columns to documents table

  1. Changes
    - Add `finalized_by` column (text, nullable) to track who finalized the document
    - Add `finalized_on` column (timestamptz, nullable) to track when the document was finalized

  2. Security
    - No RLS changes needed as these are additional data fields
    - Existing policies will cover these new columns

  3. Notes
    - These columns are nullable as not all documents may be finalized
    - Uses IF NOT EXISTS to prevent errors if columns already exist
*/

-- Add finalized_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'finalized_by'
  ) THEN
    ALTER TABLE documents ADD COLUMN finalized_by text;
  END IF;
END $$;

-- Add finalized_on column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'finalized_on'
  ) THEN
    ALTER TABLE documents ADD COLUMN finalized_on timestamptz;
  END IF;
END $$;

-- Add index for finalized_by for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_finalized_by ON documents (finalized_by);

-- Add index for finalized_on for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_finalized_on ON documents (finalized_on);