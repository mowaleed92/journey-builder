/*
  # Add DELETE Policies for Content Tables
  
  This migration adds DELETE policies for tracks, modules, 
  and journey_versions tables to allow authenticated users to delete
  learning content.
  
  1. Changes
    - Add DELETE policy for tracks table
    - Add DELETE policy for modules table
    - Add DELETE policy for journey_versions table
    - Add DELETE policy for user_journey_runs table (for restart functionality)
    - Add DELETE policy for user_block_states table (for restart functionality)
    
  2. Security
    - Authenticated users can delete tracks, modules, and journey versions
    - Users can only delete their own journey runs and block states
*/

-- Allow authenticated users to delete tracks
CREATE POLICY "Authenticated users can delete tracks"
  ON tracks FOR DELETE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete modules
CREATE POLICY "Authenticated users can delete modules"
  ON modules FOR DELETE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete journey versions
CREATE POLICY "Authenticated users can delete journey versions"
  ON journey_versions FOR DELETE
  TO authenticated
  USING (true);

-- Allow users to delete their own journey runs (for restart functionality)
CREATE POLICY "Users can delete their own journey runs"
  ON user_journey_runs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to delete their own block states (for restart functionality)
CREATE POLICY "Users can delete their own block states"
  ON user_block_states FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_journey_runs
      WHERE user_journey_runs.id = user_block_states.run_id
      AND user_journey_runs.user_id = auth.uid()
    )
  );
