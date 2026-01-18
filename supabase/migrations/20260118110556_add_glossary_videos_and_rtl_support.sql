/*
  # Add Glossary Terms, Video Recording, and RTL Support

  1. New Tables
    - `glossary_terms`
      - `id` (uuid, primary key)
      - `term` (text) - The English technical term
      - `term_normalized` (text) - Lowercase version for matching
      - `track_id` (uuid, optional) - Associated track for context
      - `module_id` (uuid, optional) - Associated module for context
      - `arabic_explanation` (text) - AI-generated Arabic explanation
      - `context_snippet` (text) - The surrounding text used for context
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `recorded_videos`
      - `id` (uuid, primary key)
      - `title` (text) - Video title for library management
      - `description` (text, optional) - Video description
      - `storage_path` (text) - Path in Supabase storage
      - `duration_seconds` (integer) - Video duration
      - `recording_type` (text) - 'camera', 'screen', 'camera_screen'
      - `thumbnail_path` (text, optional) - Thumbnail image path
      - `user_id` (uuid) - Creator/owner
      - `is_public` (boolean) - Whether shared in library
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Schema Updates
    - Add `direction` column to tracks for RTL support
    - Add `primary_language` column to tracks

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies for authenticated users

  4. Indexes
    - Index on glossary_terms for fast term lookup
    - Index on recorded_videos for user queries
*/

-- Create glossary_terms table
CREATE TABLE IF NOT EXISTS glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  term_normalized text NOT NULL,
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  arabic_explanation text NOT NULL,
  context_snippet text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(term_normalized, track_id, module_id)
);

-- Create recorded_videos table
CREATE TABLE IF NOT EXISTS recorded_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  storage_path text NOT NULL,
  duration_seconds integer DEFAULT 0,
  recording_type text NOT NULL CHECK (recording_type IN ('camera', 'screen', 'camera_screen')),
  thumbnail_path text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add direction to tracks for RTL support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tracks' AND column_name = 'direction'
  ) THEN
    ALTER TABLE tracks ADD COLUMN direction text DEFAULT 'rtl' CHECK (direction IN ('rtl', 'ltr'));
  END IF;
END $$;

-- Add primary_language to tracks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tracks' AND column_name = 'primary_language'
  ) THEN
    ALTER TABLE tracks ADD COLUMN primary_language text DEFAULT 'ar';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE glossary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE recorded_videos ENABLE ROW LEVEL SECURITY;

-- Glossary terms policies (readable by all authenticated, writable by system)
CREATE POLICY "Authenticated users can read glossary terms"
  ON glossary_terms
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert glossary terms"
  ON glossary_terms
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update glossary terms"
  ON glossary_terms
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Recorded videos policies
CREATE POLICY "Users can read own videos"
  ON recorded_videos
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can insert own videos"
  ON recorded_videos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own videos"
  ON recorded_videos
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own videos"
  ON recorded_videos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_glossary_terms_lookup 
  ON glossary_terms(term_normalized, track_id, module_id);

CREATE INDEX IF NOT EXISTS idx_glossary_terms_track 
  ON glossary_terms(track_id);

CREATE INDEX IF NOT EXISTS idx_glossary_terms_module 
  ON glossary_terms(module_id);

CREATE INDEX IF NOT EXISTS idx_recorded_videos_user 
  ON recorded_videos(user_id);

CREATE INDEX IF NOT EXISTS idx_recorded_videos_public 
  ON recorded_videos(is_public) WHERE is_public = true;

-- Add updated_at trigger for glossary_terms
CREATE TRIGGER update_glossary_terms_updated_at
  BEFORE UPDATE ON glossary_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for recorded_videos
CREATE TRIGGER update_recorded_videos_updated_at
  BEFORE UPDATE ON recorded_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();