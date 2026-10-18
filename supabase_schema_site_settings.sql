-- ===================================================
-- SITE SETTINGS MIGRATION
-- Run this in the Supabase SQL Editor (once), after
-- supabase_schema_security_hardening.sql.
--
-- Gives the admin panel a real, DB-backed place for the site name
-- (and future general settings) instead of hardcoded strings.
-- ===================================================

-- Singleton row: CHECK guarantees only id = 1 can ever exist.
CREATE TABLE IF NOT EXISTS public.site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    site_name TEXT NOT NULL DEFAULT 'DonghuaStream',
    tagline TEXT NOT NULL DEFAULT 'Watch Donghua Online',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed the row (runs as SQL-editor/service-role, bypasses RLS).
INSERT INTO public.site_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are viewable by everyone." ON public.site_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins can update site_settings" ON public.site_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
  );
CREATE POLICY "Admins can insert site_settings" ON public.site_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
  );

-- PostgREST caches its schema graph; force a reload so the new table is
-- visible immediately.
NOTIFY pgrst, 'reload schema';
