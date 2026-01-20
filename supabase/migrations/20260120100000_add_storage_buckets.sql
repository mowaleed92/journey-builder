-- Migration: Create storage buckets for videos and cover photos
-- This migration creates storage buckets and RLS policies for:
-- 1. videos - for recorded video content
-- 2. cover-photos - for track cover images

-- Create storage buckets for videos and cover photos
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('videos', 'videos', true),
  ('cover-photos', 'cover-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for videos bucket

-- Users can upload their own videos (path must start with their user ID)
CREATE POLICY "Users can upload own videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own videos
CREATE POLICY "Users can view own videos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own videos
CREATE POLICY "Users can update own videos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own videos
CREATE POLICY "Users can delete own videos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for cover-photos bucket

-- Authenticated users can upload cover photos
CREATE POLICY "Authenticated users can upload cover photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'cover-photos' AND 
  auth.role() = 'authenticated'
);

-- Anyone can view cover photos (public bucket)
CREATE POLICY "Anyone can view cover photos" ON storage.objects
FOR SELECT USING (bucket_id = 'cover-photos');

-- Authenticated users can update cover photos
CREATE POLICY "Authenticated users can update cover photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'cover-photos' AND 
  auth.role() = 'authenticated'
);

-- Authenticated users can delete cover photos
CREATE POLICY "Authenticated users can delete cover photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'cover-photos' AND 
  auth.role() = 'authenticated'
);
