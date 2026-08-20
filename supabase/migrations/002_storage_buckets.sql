-- =====================================================
-- MEMOIR DIARY — Supabase Storage Buckets
-- Migration 002: Create 6 Storage Buckets with Policies
-- =====================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-recordings', 'voice-recordings', true) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- Pattern: Users can upload/read/delete their own files
-- Files are stored under: {bucket}/{user_id}/{filename}
-- =====================================================

-- IMAGES bucket
CREATE POLICY "images_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- VIDEOS bucket
CREATE POLICY "videos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "videos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "videos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- AUDIO bucket
CREATE POLICY "audio_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "audio_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio');

CREATE POLICY "audio_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- PDFS bucket
CREATE POLICY "pdfs_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "pdfs_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'pdfs');

CREATE POLICY "pdfs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- FILES bucket
CREATE POLICY "files_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "files_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'files');

CREATE POLICY "files_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- VOICE-RECORDINGS bucket
CREATE POLICY "voice_recordings_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "voice_recordings_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'voice-recordings');

CREATE POLICY "voice_recordings_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'voice-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
