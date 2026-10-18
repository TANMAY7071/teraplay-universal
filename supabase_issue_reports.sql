-- Migration: issue_reports table for the "Report Broken Server / Audio" flow
-- (Watch.tsx player report sheet) and its admin dashboard (RequestList.tsx).

CREATE TABLE IF NOT EXISTS public.issue_reports (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    episode_id INTEGER,
    server_name TEXT,
    reason TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) may submit a report.
DROP POLICY IF EXISTS "Anyone can insert issue reports" ON public.issue_reports;
CREATE POLICY "Anyone can insert issue reports" ON public.issue_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read / manage reports, via the SECURITY DEFINER helper
-- created in supabase_schema_security_hardening.sql.
DROP POLICY IF EXISTS "Admins can select issue reports" ON public.issue_reports;
CREATE POLICY "Admins can select issue reports" ON public.issue_reports
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update issue reports" ON public.issue_reports;
CREATE POLICY "Admins can update issue reports" ON public.issue_reports
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete issue reports" ON public.issue_reports;
CREATE POLICY "Admins can delete issue reports" ON public.issue_reports
  FOR DELETE USING (public.is_admin());