-- =====================================================
-- MEMOIR DIARY — Supabase Realtime Configuration
-- Migration 003: Enable Realtime on memories table
-- =====================================================

-- Enable realtime for the memories table
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;

-- Also enable realtime for activity logs (for admin dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
