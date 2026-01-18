/*
  # Learning Workflow Engine Schema
  
  This migration creates the core tables for a learning workflow engine
  that models educational content as directed graphs (state machines).
  
  1. New Tables
    - `tracks` - Top-level learning paths (e.g., "GenAI Fundamentals")
      - `id` (uuid, primary key)
      - `title` (text) - Display title
      - `description` (text) - Track description
      - `level` (text) - Difficulty level (beginner/intermediate/advanced)
      - `tags` (jsonb) - Array of tags for categorization
      - `published_version_id` (uuid) - Reference to active journey version
      - `created_at`, `updated_at` timestamps
      
    - `modules` - Sections within a track
      - `id` (uuid, primary key)
      - `track_id` (uuid, foreign key) - Parent track
      - `title` (text) - Module title
      - `description` (text) - Module description
      - `order_index` (integer) - Display order within track
      - `created_at`, `updated_at` timestamps
      
    - `journey_versions` - Versioned graph definitions for modules
      - `id` (uuid, primary key)
      - `module_id` (uuid, foreign key) - Parent module
      - `version` (integer) - Version number
      - `status` (text) - draft/published/archived
      - `graph_json` (jsonb) - The actual graph structure with blocks and edges
      - `created_at`, `updated_at` timestamps
      
    - `user_journey_runs` - User's active run through a journey
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Reference to auth.users
      - `journey_version_id` (uuid, foreign key) - Pinned to specific version
      - `current_block_id` (text) - Current position in graph
      - `status` (text) - not_started/in_progress/completed/abandoned
      - `started_at`, `completed_at` timestamps
      - `metadata` (jsonb) - Additional run data
      
    - `user_block_states` - User's state on each block they've visited
      - `id` (uuid, primary key)
      - `run_id` (uuid, foreign key) - Parent run
      - `block_id` (text) - Block ID from graph_json
      - `status` (text) - not_started/in_progress/completed/failed/skipped
      - `attempts_count` (integer) - Number of attempts
      - `output_json` (jsonb) - Answers, form values, etc.
      - `score` (numeric) - For quiz blocks (0-100)
      - `weak_topics` (jsonb) - Tags of concepts user struggled with
      - `time_spent_seconds` (integer) - Time on block
      - `started_at`, `completed_at` timestamps
      
  2. Security
    - Enable RLS on all tables
    - Users can only access their own journey runs and block states
    - Tracks, modules, and journey versions are publicly readable (for now)
    
  3. Indexes
    - Foreign key indexes for efficient joins
    - User lookup indexes for journey runs
*/

-- Tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  level text DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  tags jsonb DEFAULT '[]'::jsonb,
  published_version_id uuid,
  cover_image_url text,
  estimated_duration_minutes integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracks are publicly readable"
  ON tracks FOR SELECT
  TO authenticated
  USING (true);

-- Modules table
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  estimated_duration_minutes integer DEFAULT 15,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules are publicly readable"
  ON modules FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_modules_track_id ON modules(track_id);

-- Journey Versions table
CREATE TABLE IF NOT EXISTS journey_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  graph_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(module_id, version)
);

ALTER TABLE journey_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Journey versions are publicly readable"
  ON journey_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_journey_versions_module_id ON journey_versions(module_id);

-- User Journey Runs table
CREATE TABLE IF NOT EXISTS user_journey_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  journey_version_id uuid NOT NULL REFERENCES journey_versions(id) ON DELETE CASCADE,
  current_block_id text,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_journey_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journey runs"
  ON user_journey_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journey runs"
  ON user_journey_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journey runs"
  ON user_journey_runs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_journey_runs_user_id ON user_journey_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_runs_journey_version_id ON user_journey_runs(journey_version_id);

-- User Block States table
CREATE TABLE IF NOT EXISTS user_block_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES user_journey_runs(id) ON DELETE CASCADE,
  block_id text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed', 'skipped')),
  attempts_count integer DEFAULT 0,
  output_json jsonb DEFAULT '{}'::jsonb,
  score numeric(5,2),
  weak_topics jsonb DEFAULT '[]'::jsonb,
  time_spent_seconds integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(run_id, block_id)
);

ALTER TABLE user_block_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own block states"
  ON user_block_states FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_journey_runs
      WHERE user_journey_runs.id = user_block_states.run_id
      AND user_journey_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own block states"
  ON user_block_states FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_journey_runs
      WHERE user_journey_runs.id = user_block_states.run_id
      AND user_journey_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own block states"
  ON user_block_states FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_journey_runs
      WHERE user_journey_runs.id = user_block_states.run_id
      AND user_journey_runs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_journey_runs
      WHERE user_journey_runs.id = user_block_states.run_id
      AND user_journey_runs.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_user_block_states_run_id ON user_block_states(run_id);
CREATE INDEX IF NOT EXISTS idx_user_block_states_block_id ON user_block_states(block_id);

-- Add foreign key for published_version_id now that journey_versions exists
ALTER TABLE tracks 
  ADD CONSTRAINT fk_tracks_published_version 
  FOREIGN KEY (published_version_id) 
  REFERENCES journey_versions(id) 
  ON DELETE SET NULL;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_versions_updated_at
  BEFORE UPDATE ON journey_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_journey_runs_updated_at
  BEFORE UPDATE ON user_journey_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_block_states_updated_at
  BEFORE UPDATE ON user_block_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();