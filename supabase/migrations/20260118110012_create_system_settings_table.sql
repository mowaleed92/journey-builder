/*
  # Create System Settings Table

  1. New Tables
    - `system_settings`
      - `id` (uuid, primary key)
      - `setting_key` (text, unique) - The identifier for the setting (e.g., 'ai_content_model')
      - `setting_value` (text) - The current value (e.g., 'gpt-4o')
      - `description` (text) - Human-readable description of the setting
      - `category` (text) - Grouping category (e.g., 'ai', 'general')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `system_settings` table
    - Add policy for authenticated users to read settings
    - Add policy for authenticated users to update settings (admin access in production would be more restricted)
  
  3. Initial Data
    - Insert default AI model settings for content generation and help functionality
*/

-- Create the system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Authenticated users can read settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update settings
CREATE POLICY "Authenticated users can update settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert settings
CREATE POLICY "Authenticated users can insert settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default AI model settings
INSERT INTO system_settings (setting_key, setting_value, description, category)
VALUES 
  ('ai_content_model', 'gpt-4o', 'AI model used for content generation in AI Studio', 'ai'),
  ('ai_help_model', 'gpt-4o-mini', 'AI model used for student help and assistance', 'ai')
ON CONFLICT (setting_key) DO NOTHING;

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();