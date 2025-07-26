-- Create the templates table
CREATE TABLE IF NOT EXISTS templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  template jsonb DEFAULT '[]' NOT NULL,
  validation_rules jsonb DEFAULT '[]' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates USING btree (name);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_templates_template ON templates USING gin (template);

-- Create trigger to auto-update updated_at (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_templates_updated_at' 
    AND tgrelid = 'templates'::regclass
  ) THEN
    CREATE TRIGGER update_templates_updated_at
      BEFORE UPDATE ON templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (with IF NOT EXISTS equivalent)
DO $$
BEGIN
  -- Policy for SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'templates' 
    AND policyname = 'Users can read all templates'
  ) THEN
    CREATE POLICY "Users can read all templates"
      ON templates
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Policy for INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'templates' 
    AND policyname = 'Users can insert templates'
  ) THEN
    CREATE POLICY "Users can insert templates"
      ON templates
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  -- Policy for UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'templates' 
    AND policyname = 'Users can update templates'
  ) THEN
    CREATE POLICY "Users can update templates"
      ON templates
      FOR UPDATE
      TO authenticated
      USING (true);
  END IF;

  -- Policy for DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'templates' 
    AND policyname = 'Users can delete templates'
  ) THEN
    CREATE POLICY "Users can delete templates"
      ON templates
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;