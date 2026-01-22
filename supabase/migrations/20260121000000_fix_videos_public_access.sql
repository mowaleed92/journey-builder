-- Migration: Fix videos bucket public access
-- The videos bucket is marked as public=true, but the SELECT policy was restricting access
-- to only authenticated users viewing their own videos. This prevents the browser from
-- loading videos via public URLs.

-- Allow anyone to view videos in the public bucket
-- This is consistent with how the bucket is configured (public=true)
CREATE POLICY "Anyone can view videos in public bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'videos');
