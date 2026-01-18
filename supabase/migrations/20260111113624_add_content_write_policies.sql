/*
  # Add Write Policies for Content Tables
  
  This migration adds INSERT and UPDATE policies for tracks, modules, 
  and journey_versions tables to allow authenticated users to create
  and manage learning content.
  
  1. Changes
    - Add INSERT policy for tracks table
    - Add UPDATE policy for tracks table
    - Add INSERT policy for modules table
    - Add UPDATE policy for modules table
    - Add INSERT policy for journey_versions table
    - Add UPDATE policy for journey_versions table
    
  2. Security
    - All authenticated users can create and modify content
    - This allows for initial seeding and future admin functionality
*/

CREATE POLICY "Authenticated users can create tracks"
  ON tracks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tracks"
  ON tracks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create modules"
  ON modules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update modules"
  ON modules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create journey versions"
  ON journey_versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update journey versions"
  ON journey_versions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);