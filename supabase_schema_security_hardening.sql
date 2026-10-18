-- ===================================================
-- SECURITY HARDENING MIGRATION
-- Run this in the Supabase SQL Editor (once).
--
-- Fixes:
--   1. Admin self-promotion: any user could UPDATE their own
--      public.users row and set subscription_tier = 'admin'.
--   2. merge_guest_to_permanent accepted arbitrary UUIDs and could
--      copy + delete ANY user's watch data (SECURITY DEFINER).
--   3. anime_seasons had no RLS -> public write.
--   4. users.email was readable by anonymous callers.
--   5. comments.content had no length cap.
-- ===================================================

-- ---------------------------------------------------
-- 1. BLOCK PRIVILEGED-FIELD CHANGES ON SELF-UPDATE
-- ---------------------------------------------------
-- RLS is row-level only, so "auth.uid() = id" lets a user edit every
-- column of their own row. This trigger pins the privileged columns:
-- only admins (or the service role, which bypasses RLS) may change them.
CREATE OR REPLACE FUNCTION public.protect_user_privileged_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- The service role (edge functions, admin scripts) bypasses RLS and
  -- carries no auth.uid(); let it manage tiers.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier <> OLD.subscription_tier
     OR NEW.xp <> OLD.xp
     OR NEW.level <> OLD.level THEN
    IF EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND subscription_tier = 'admin'
    ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only admins can change subscription_tier, xp, or level';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_user_privileged_columns_trigger ON public.users;
CREATE TRIGGER protect_user_privileged_columns_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_privileged_columns();

-- ---------------------------------------------------
-- 2. HARDEN merge_guest_to_permanent
-- ---------------------------------------------------
-- The caller may only merge data INTO their own account, and only from
-- an anonymous guest account. Prevents using the RPC as a data-theft /
-- data-deletion primitive against other users.
CREATE OR REPLACE FUNCTION public.merge_guest_to_permanent(guest_uuid UUID, permanent_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF permanent_uuid <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: you can only merge data into your own account';
  END IF;

  IF guest_uuid = permanent_uuid THEN
    RAISE EXCEPTION 'Cannot merge an account into itself';
  END IF;

  -- The source account must be an anonymous guest.
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = guest_uuid AND is_anonymous = true
  ) THEN
    RAISE EXCEPTION 'Not authorized: source account is not an anonymous guest';
  END IF;

  -- 1. Merge watch progress
  INSERT INTO public.watch_progress (user_id, anime_id, episode_id, episode_number, "current_time", total_time, completed, updated_at)
  SELECT permanent_uuid, anime_id, episode_id, episode_number, "current_time", total_time, completed, updated_at
  FROM public.watch_progress
  WHERE user_id = guest_uuid
  ON CONFLICT (user_id, episode_id)
  DO UPDATE SET
    "current_time" = GREATEST(watch_progress."current_time", EXCLUDED."current_time"),
    completed = watch_progress.completed OR EXCLUDED.completed,
    updated_at = GREATEST(watch_progress.updated_at, EXCLUDED.updated_at);

  -- 2. Merge watchlist
  INSERT INTO public.watchlist (user_id, anime_id, status, added_at)
  SELECT permanent_uuid, anime_id, status, added_at
  FROM public.watchlist
  WHERE user_id = guest_uuid
  ON CONFLICT (user_id, anime_id)
  DO NOTHING;

  -- 3. Merge user preferences/settings
  UPDATE public.users pu
  SET preferences = COALESCE(pu.preferences, '{}'::jsonb) || COALESCE(gu.preferences, '{}'::jsonb)
  FROM public.users gu
  WHERE gu.id = guest_uuid AND pu.id = permanent_uuid;

  -- 4. Delete the guest account data in public schema
  DELETE FROM public.watch_progress WHERE user_id = guest_uuid;
  DELETE FROM public.watchlist WHERE user_id = guest_uuid;
  DELETE FROM public.users WHERE id = guest_uuid;
END;
$$;

-- ---------------------------------------------------
-- 3. ENABLE RLS ON anime_seasons (guarded)
-- ---------------------------------------------------
-- If the seasons migration hasn't run yet, skip this section instead of
-- erroring: one missing table must not roll back the whole migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'anime_seasons'
  ) THEN
    EXECUTE 'ALTER TABLE public.anime_seasons ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'anime_seasons') THEN
      EXECUTE 'CREATE POLICY "Seasons are viewable by everyone." ON public.anime_seasons FOR SELECT USING (true)';
      EXECUTE 'CREATE POLICY "Admins can insert anime_seasons" ON public.anime_seasons FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = ''admin'')
      )';
      EXECUTE 'CREATE POLICY "Admins can update anime_seasons" ON public.anime_seasons FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = ''admin'')
      )';
      EXECUTE 'CREATE POLICY "Admins can delete anime_seasons" ON public.anime_seasons FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = ''admin'')
      )';
    END IF;
  ELSE
    RAISE NOTICE 'anime_seasons does not exist yet — run supabase_schema_seasons_migration.sql first, then re-run this file';
  END IF;
END $$;

-- ---------------------------------------------------
-- 4. HIDE users.email FROM OTHER USERS
-- ---------------------------------------------------
-- Column-level SELECT grants are table-wide, so they cannot express
-- "my own email only" — and the app requires email in .select("*") on
-- sign-in (AuthContext.fetchProfile). The privacy boundary therefore
-- moves to RLS, which IS row-scoped: only the owner and admins can
-- read users rows.
--
-- NOTE: the policy must NOT query public.users inline — a
-- self-referential policy raises "infinite recursion detected in
-- policy". The standard fix is a SECURITY DEFINER helper, whose inner
-- query runs as the table owner and bypasses RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND subscription_tier = 'admin'
  );
$$;

REVOKE ALL ON public.users FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.users;
DROP POLICY IF EXISTS "Users can read own profile." ON public.users;
CREATE POLICY "Users can read own profile." ON public.users
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can update their own profile." ON public.users;
CREATE POLICY "Users can update their own profile." ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- GRANT INSERT needs a matching WITH CHECK policy or the fallback profile
-- upsert (AuthContext.fetchProfile) fails with 42501. The normal path is the
-- handle_new_user() trigger; this covers the degraded fallback path.
DROP POLICY IF EXISTS "Users can insert own profile." ON public.users;
CREATE POLICY "Users can insert own profile." ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Public profile info for OTHER users (comment/danmaku embeds need
-- username + avatar + rank). Implemented as a SECURITY DEFINER RPC rather
-- than a view: PostgREST cannot reliably infer embed relationships through
-- views, and a failed embed would silently fall back to mock comments.
-- Deliberate, minimal exposure — email and preferences are NOT returned.
-- (CREATE OR REPLACE handles re-runs; never DROP this function — dependent
-- views/functions would make the drop fail.)
DROP VIEW IF EXISTS public.public_profiles;
CREATE OR REPLACE FUNCTION public.comments_with_profiles(p_episode_id integer)
RETURNS TABLE (
  id integer, user_id uuid, episode_id integer, parent_id integer,
  content text, is_spoiler boolean, likes_count integer,
  timestamp_seconds numeric, is_danmaku boolean,
  danmaku_color text, danmaku_position text, created_at timestamptz,
  username text, avatar_url text, cultivation_rank text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.user_id, c.episode_id, c.parent_id, c.content,
         c.is_spoiler, c.likes_count, c.timestamp_seconds, c.is_danmaku,
         c.danmaku_color, c.danmaku_position, c.created_at,
         u.username, u.avatar_url, u.cultivation_rank
  FROM public.comments c
  LEFT JOIN public.users u ON u.id = c.user_id
  WHERE c.episode_id = p_episode_id
  ORDER BY c.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.comments_with_profiles(integer) TO anon, authenticated;

-- ---------------------------------------------------
-- 5. CAP COMMENT CONTENT LENGTH (idempotent)
-- ---------------------------------------------------
-- Postgres has no ADD CONSTRAINT IF NOT EXISTS; without the drop-and-readd
-- this section throws "constraint already exists" on re-run and rolls back
-- the whole transaction.
DO $$
BEGIN
  ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_content_length;
  ALTER TABLE public.comments
    ADD CONSTRAINT comments_content_length CHECK (char_length(content) <= 2000);
END $$;

-- PostgREST caches its schema graph; force a reload so the new RPC and
-- policies are visible immediately.
NOTIFY pgrst, 'reload schema';
