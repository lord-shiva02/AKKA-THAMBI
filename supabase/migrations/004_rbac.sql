-- =====================================================
-- MEMOIR DIARY — Supabase RBAC & Row Level Security
-- Migration 004: Role-Based Access Control (Admin vs Viewer)
-- =====================================================

-- 1. Ensure role column exists on public.users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer'));

-- Helper Function: Check if current authenticated user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. REFRESH MEMORIES TABLE POLICIES (Admin vs Viewer)
-- Viewers: SELECT, INSERT
-- Admin: SELECT, INSERT, UPDATE, DELETE
-- =====================================================
DROP POLICY IF EXISTS "memories_select_own" ON public.memories;
DROP POLICY IF EXISTS "memories_insert_own" ON public.memories;
DROP POLICY IF EXISTS "memories_update_own" ON public.memories;
DROP POLICY IF EXISTS "memories_delete_own" ON public.memories;
DROP POLICY IF EXISTS "memories_admin_select_all" ON public.memories;
DROP POLICY IF EXISTS "memories_admin_delete_all" ON public.memories;

-- Viewers & Admins can read all public memories (Digital Library)
CREATE POLICY "memories_select_all" ON public.memories
  FOR SELECT USING (true);

-- Viewers & Admins can create new memories
CREATE POLICY "memories_insert_authenticated" ON public.memories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ONLY Admin can update memories
CREATE POLICY "memories_update_admin_only" ON public.memories
  FOR UPDATE USING (public.is_admin());

-- ONLY Admin can delete memories
CREATE POLICY "memories_delete_admin_only" ON public.memories
  FOR DELETE USING (public.is_admin());

-- =====================================================
-- 3. REFRESH MEDIA & ATTACHMENT TABLES POLICIES
-- =====================================================

-- IMAGES
DROP POLICY IF EXISTS "images_select_own" ON public.images;
DROP POLICY IF EXISTS "images_insert_own" ON public.images;
DROP POLICY IF EXISTS "images_delete_own" ON public.images;
DROP POLICY IF EXISTS "images_admin_select" ON public.images;

CREATE POLICY "images_select_all" ON public.images FOR SELECT USING (true);
CREATE POLICY "images_insert_authenticated" ON public.images FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "images_update_admin_only" ON public.images FOR UPDATE USING (public.is_admin());
CREATE POLICY "images_delete_admin_only" ON public.images FOR DELETE USING (public.is_admin());

-- VIDEOS
DROP POLICY IF EXISTS "videos_select_own" ON public.videos;
DROP POLICY IF EXISTS "videos_insert_own" ON public.videos;
DROP POLICY IF EXISTS "videos_delete_own" ON public.videos;
DROP POLICY IF EXISTS "videos_admin_select" ON public.videos;

CREATE POLICY "videos_select_all" ON public.videos FOR SELECT USING (true);
CREATE POLICY "videos_insert_authenticated" ON public.videos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "videos_update_admin_only" ON public.videos FOR UPDATE USING (public.is_admin());
CREATE POLICY "videos_delete_admin_only" ON public.videos FOR DELETE USING (public.is_admin());

-- AUDIOS
DROP POLICY IF EXISTS "audios_select_own" ON public.audios;
DROP POLICY IF EXISTS "audios_insert_own" ON public.audios;
DROP POLICY IF EXISTS "audios_delete_own" ON public.audios;
DROP POLICY IF EXISTS "audios_admin_select" ON public.audios;

CREATE POLICY "audios_select_all" ON public.audios FOR SELECT USING (true);
CREATE POLICY "audios_insert_authenticated" ON public.audios FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "audios_update_admin_only" ON public.audios FOR UPDATE USING (public.is_admin());
CREATE POLICY "audios_delete_admin_only" ON public.audios FOR DELETE USING (public.is_admin());

-- PDFS
DROP POLICY IF EXISTS "pdfs_select_own" ON public.pdfs;
DROP POLICY IF EXISTS "pdfs_insert_own" ON public.pdfs;
DROP POLICY IF EXISTS "pdfs_delete_own" ON public.pdfs;
DROP POLICY IF EXISTS "pdfs_admin_select" ON public.pdfs;

CREATE POLICY "pdfs_select_all" ON public.pdfs FOR SELECT USING (true);
CREATE POLICY "pdfs_insert_authenticated" ON public.pdfs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pdfs_update_admin_only" ON public.pdfs FOR UPDATE USING (public.is_admin());
CREATE POLICY "pdfs_delete_admin_only" ON public.pdfs FOR DELETE USING (public.is_admin());

-- FILES
DROP POLICY IF EXISTS "files_select_own" ON public.files;
DROP POLICY IF EXISTS "files_insert_own" ON public.files;
DROP POLICY IF EXISTS "files_delete_own" ON public.files;
DROP POLICY IF EXISTS "files_admin_select" ON public.files;

CREATE POLICY "files_select_all" ON public.files FOR SELECT USING (true);
CREATE POLICY "files_insert_authenticated" ON public.files FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "files_update_admin_only" ON public.files FOR UPDATE USING (public.is_admin());
CREATE POLICY "files_delete_admin_only" ON public.files FOR DELETE USING (public.is_admin());

-- SETTINGS & ADMIN LOGS (Admin only)
DROP POLICY IF EXISTS "settings_select_own" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_own" ON public.settings;
DROP POLICY IF EXISTS "settings_update_own" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_own" ON public.settings;

CREATE POLICY "settings_admin_all" ON public.settings FOR ALL USING (public.is_admin());
