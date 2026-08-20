-- =====================================================
-- MEMOIR DIARY — Supabase PostgreSQL Schema
-- Migration 001: Initial Schema (13 Tables + RLS)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- =====================================================
-- 1. USERS TABLE
-- Extends Supabase auth.users with profile data
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  auth_type TEXT DEFAULT 'email',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "users_admin_select_all" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 2. MEMORIES TABLE
-- Core diary entries with soft-delete support
-- =====================================================
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Memory',
  text_content TEXT,
  ai_story TEXT,
  transcript TEXT,
  mood JSONB, -- { mood, emoji, label }
  tags TEXT[] DEFAULT '{}',
  favorite BOOLEAN DEFAULT FALSE,
  date TEXT,
  time TEXT,
  day TEXT,
  month TEXT,
  year TEXT,
  timezone TEXT,
  device TEXT,
  browser TEXT,
  screen_resolution TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memories_user_id ON public.memories(user_id);
CREATE INDEX idx_memories_created_at ON public.memories(created_at DESC);
CREATE INDEX idx_memories_is_deleted ON public.memories(is_deleted);
CREATE INDEX idx_memories_title_trgm ON public.memories USING GIN (title gin_trgm_ops);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memories_select_own" ON public.memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "memories_insert_own" ON public.memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "memories_update_own" ON public.memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "memories_delete_own" ON public.memories
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "memories_admin_select_all" ON public.memories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "memories_admin_delete_all" ON public.memories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 3. VOICE TRANSCRIPTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.voice_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  audio_url TEXT,
  storage_path TEXT,
  original_transcript TEXT,
  corrected_transcript TEXT,
  ai_story TEXT,
  duration INTEGER DEFAULT 0,
  mime_type TEXT,
  language TEXT DEFAULT 'en-US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_transcripts_memory ON public.voice_transcripts(memory_id);

ALTER TABLE public.voice_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_transcripts_select_own" ON public.voice_transcripts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "voice_transcripts_insert_own" ON public.voice_transcripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "voice_transcripts_update_own" ON public.voice_transcripts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "voice_transcripts_delete_own" ON public.voice_transcripts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "voice_transcripts_admin_select" ON public.voice_transcripts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 4. AI STORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  story_text TEXT NOT NULL,
  model_used TEXT DEFAULT 'built-in',
  tone TEXT DEFAULT 'emotional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_stories_memory ON public.ai_stories(memory_id);

ALTER TABLE public.ai_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_stories_select_own" ON public.ai_stories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_stories_insert_own" ON public.ai_stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_stories_update_own" ON public.ai_stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ai_stories_delete_own" ON public.ai_stories
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "ai_stories_admin_select" ON public.ai_stories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 5. TRANSLATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  language_name TEXT,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_translations_memory ON public.translations(memory_id);
CREATE UNIQUE INDEX idx_translations_memory_lang ON public.translations(memory_id, language_code);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translations_select_own" ON public.translations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "translations_insert_own" ON public.translations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "translations_update_own" ON public.translations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "translations_delete_own" ON public.translations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "translations_admin_select" ON public.translations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 6. IMAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT,
  size BIGINT DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_images_memory ON public.images(memory_id);

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "images_select_own" ON public.images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "images_insert_own" ON public.images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "images_delete_own" ON public.images
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "images_admin_select" ON public.images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 7. VIDEOS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT,
  size BIGINT DEFAULT 0,
  mime_type TEXT,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_videos_memory ON public.videos(memory_id);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "videos_select_own" ON public.videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "videos_insert_own" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "videos_delete_own" ON public.videos
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "videos_admin_select" ON public.videos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 8. AUDIOS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT,
  size BIGINT DEFAULT 0,
  mime_type TEXT,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audios_memory ON public.audios(memory_id);

ALTER TABLE public.audios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audios_select_own" ON public.audios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "audios_insert_own" ON public.audios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "audios_delete_own" ON public.audios
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "audios_admin_select" ON public.audios
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 9. PDFS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pdfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT,
  size BIGINT DEFAULT 0,
  mime_type TEXT DEFAULT 'application/pdf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pdfs_memory ON public.pdfs(memory_id);

ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdfs_select_own" ON public.pdfs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pdfs_insert_own" ON public.pdfs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pdfs_delete_own" ON public.pdfs
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "pdfs_admin_select" ON public.pdfs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 10. FILES TABLE (Generic / Other Files)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT,
  size BIGINT DEFAULT 0,
  mime_type TEXT,
  category TEXT DEFAULT 'document',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_memory ON public.files(memory_id);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files_select_own" ON public.files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "files_insert_own" ON public.files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "files_delete_own" ON public.files
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "files_admin_select" ON public.files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 11. LOCATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID UNIQUE NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  state TEXT,
  country TEXT,
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_memory ON public.locations(memory_id);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select_own" ON public.locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "locations_insert_own" ON public.locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "locations_delete_own" ON public.locations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "locations_admin_select" ON public.locations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 12. SETTINGS TABLE (per-user key-value)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_settings_user_key ON public.settings(user_id, key);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_own" ON public.settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "settings_insert_own" ON public.settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "settings_update_own" ON public.settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "settings_delete_own" ON public.settings
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 13. ACTIVITY LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_select_own" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "activity_logs_insert_own" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_logs_admin_select" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "activity_logs_admin_delete" ON public.activity_logs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- HELPER FUNCTION: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- HELPER FUNCTION: Auto-create user profile on signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, auth_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
