-- ==========================================
-- DONGHUASTREAM POSTGRESQL DATABASE SCHEMA
-- Copy and paste this script into the SQL Editor of your Supabase project.
-- ==========================================

-- Enable extension for Trigram fuzzy search (needed for typo-tolerant search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. USERS PROFILE TABLE
-- Extends the auth.users table managed by Supabase Auth
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    avatar_frame TEXT DEFAULT 'none',
    cultivation_rank TEXT DEFAULT 'Qi Condensation I',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    subscription_tier TEXT DEFAULT 'free',
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ANIME CATALOG TABLE
CREATE TABLE IF NOT EXISTS public.anime (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    original_title TEXT DEFAULT '',
    synopsis TEXT DEFAULT '',
    poster_url TEXT DEFAULT '',
    banner_url TEXT DEFAULT '',
    rating NUMERIC(3, 1) DEFAULT 0.0,
    episode_count INTEGER DEFAULT 0,
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'Ongoing', -- 'Ongoing' | 'Completed' | 'Upcoming'
    format TEXT DEFAULT '3D',      -- '3D' | '2D'
    studio TEXT DEFAULT '',
    source_material TEXT DEFAULT 'Web Novel',
    age_rating TEXT DEFAULT '13+',
    season_name TEXT DEFAULT '',
    theme_accent TEXT DEFAULT 'purple',
    ambient_glow_color TEXT DEFAULT 'hsl(280, 100%, 70%)',
    next_episode_countdown TEXT DEFAULT '',
    featured BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    custom_sections JSONB DEFAULT '[]'::jsonb, -- flexible JSON for cultivation/lore metadata
    cultivation_realms JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. GENRES TABLE
CREATE TABLE IF NOT EXISTS public.genres (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT '',
    description TEXT DEFAULT ''
);

-- 4. ANIME GENRES JUNCTION TABLE (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.anime_genres (
    anime_id INTEGER REFERENCES public.anime(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES public.genres(id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, genre_id)
);

-- 5. EPISODES TABLE
CREATE TABLE IF NOT EXISTS public.episodes (
    id SERIAL PRIMARY KEY,
    anime_id INTEGER REFERENCES public.anime(id) ON DELETE CASCADE NOT NULL,
    episode_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    thumbnail_url TEXT DEFAULT '',
    duration TEXT DEFAULT '24 min',
    air_date TIMESTAMP WITH TIME ZONE,
    is_filler BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(anime_id, episode_number)
);

-- 6. EPISODE SERVERS TABLE (Multiple video host options)
CREATE TABLE IF NOT EXISTS public.episode_servers (
    id SERIAL PRIMARY KEY,
    episode_id INTEGER REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    server_name TEXT NOT NULL, -- e.g., 'Server 1', 'Dailymotion'
    video_url TEXT NOT NULL,
    quality TEXT DEFAULT '1080p',
    priority INTEGER DEFAULT 1
);

-- 7. EPISODE SUBTITLES TABLE
CREATE TABLE IF NOT EXISTS public.episode_subtitles (
    id SERIAL PRIMARY KEY,
    episode_id INTEGER REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    language TEXT NOT NULL,       -- e.g., 'English', 'Hindi'
    language_code TEXT NOT NULL,  -- e.g., 'en', 'hi'
    subtitle_url TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false
);

-- 8. ANIME CHARACTERS TABLE
CREATE TABLE IF NOT EXISTS public.anime_characters (
    id SERIAL PRIMARY KEY,
    anime_id INTEGER REFERENCES public.anime(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Supporting', -- 'Main' | 'Supporting'
    avatar_url TEXT DEFAULT '',
    cultivation_level TEXT DEFAULT '',
    ability TEXT DEFAULT '',
    description TEXT DEFAULT '',
    relationship TEXT DEFAULT ''
);

-- 9. USER WATCHLIST TABLE
CREATE TABLE IF NOT EXISTS public.watchlist (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    anime_id INTEGER REFERENCES public.anime(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'plan_to_watch', -- 'plan_to_watch' | 'watching' | 'completed' | 'on_hold' | 'dropped'
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, anime_id)
);

-- 10. USER WATCH PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.watch_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    anime_id INTEGER REFERENCES public.anime(id) ON DELETE CASCADE NOT NULL,
    episode_id INTEGER REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    episode_number INTEGER NOT NULL,
    "current_time" NUMERIC(8, 2) DEFAULT 0.0,
    total_time NUMERIC(8, 2) DEFAULT 1440.0, -- Default standard 24 min episode in seconds
    completed BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, episode_id)
);

-- 11. USER RATINGS & REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.ratings (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    anime_id INTEGER REFERENCES public.anime(id) ON DELETE CASCADE NOT NULL,
    score INTEGER CHECK (score BETWEEN 1 AND 10) NOT NULL,
    review TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, anime_id)
);

-- 12. COMMENTS & DANMAKU TABLE
CREATE TABLE IF NOT EXISTS public.comments (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    episode_id INTEGER REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    parent_id INTEGER REFERENCES public.comments(id) ON DELETE CASCADE DEFAULT NULL, -- self-referencing for threaded replies
    content TEXT NOT NULL,
    is_spoiler BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    timestamp_seconds NUMERIC(6, 2) DEFAULT NULL, -- for Danmaku overlay timing
    is_danmaku BOOLEAN DEFAULT false,
    danmaku_color TEXT DEFAULT '#ffffff',
    danmaku_position TEXT DEFAULT 'scroll', -- 'scroll' | 'top' | 'bottom'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. SCHEDULE RELEASE TABLE
CREATE TABLE IF NOT EXISTS public.schedule (
    id SERIAL PRIMARY KEY,
    anime_id INTEGER REFERENCES public.anime(id) ON DELETE CASCADE NOT NULL,
    day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', etc.
    air_time TEXT NOT NULL,    -- '10:00 AM'
    episode_number INTEGER NOT NULL,
    air_date TIMESTAMP WITH TIME ZONE
);

-- 14. IN-APP NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'new_episode' | 'achievement' | 'comment_reply' | 'system'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT DEFAULT '',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- INDEXES & PERFORMANCE OPTIMIZATIONS
-- ==========================================

-- Fuzzy trigram index for search on anime titles
CREATE INDEX IF NOT EXISTS idx_anime_title_trgm ON public.anime USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_anime_slug ON public.anime (slug);

-- Index search on watch progress
CREATE INDEX IF NOT EXISTS idx_watch_progress_lookup ON public.watch_progress (user_id, anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_updated ON public.watch_progress (user_id, updated_at DESC);

-- Index search on episodes list
CREATE INDEX IF NOT EXISTS idx_episodes_anime_lookup ON public.episodes (anime_id, episode_number);

-- Index search on comments & danmaku timing
CREATE INDEX IF NOT EXISTS idx_comments_episode_lookup ON public.comments (episode_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_danmaku_seconds_lookup ON public.comments (episode_id, timestamp_seconds) WHERE is_danmaku = true;

-- Index search on notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id, is_read, created_at DESC);

-- ==========================================
-- AUTHENTICATION TRIGGERS & PROFILES
-- ==========================================

-- Automatically create user profiles on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, avatar_url, avatar_frame, cultivation_rank, xp, level, subscription_tier)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    'none',
    'Qi Condensation I',
    0,
    1,
    'free'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_subtitles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Users table policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.users 
  FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile." ON public.users 
  FOR UPDATE USING (auth.uid() = id);

-- 2. Anime & static tables policies (Publicly readable)
CREATE POLICY "Anime list is viewable by everyone." ON public.anime FOR SELECT USING (true);
CREATE POLICY "Genres list is viewable by everyone." ON public.genres FOR SELECT USING (true);
CREATE POLICY "Anime genres list is viewable by everyone." ON public.anime_genres FOR SELECT USING (true);
CREATE POLICY "Episodes list is viewable by everyone." ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Servers list is viewable by everyone." ON public.episode_servers FOR SELECT USING (true);
CREATE POLICY "Subtitles list is viewable by everyone." ON public.episode_subtitles FOR SELECT USING (true);
CREATE POLICY "Characters list is viewable by everyone." ON public.anime_characters FOR SELECT USING (true);
CREATE POLICY "Schedule is viewable by everyone." ON public.schedule FOR SELECT USING (true);

-- 3. Watchlist policies
CREATE POLICY "Users can view their own watchlist." ON public.watchlist 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own watchlist." ON public.watchlist 
  FOR ALL USING (auth.uid() = user_id);

-- 4. Watch progress policies
CREATE POLICY "Users can view their own watch progress." ON public.watch_progress 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own watch progress." ON public.watch_progress 
  FOR ALL USING (auth.uid() = user_id);

-- 5. Ratings policies
CREATE POLICY "Ratings are viewable by everyone." ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can manage their own ratings." ON public.ratings 
  FOR ALL USING (auth.uid() = user_id);

-- 6. Comments policies
CREATE POLICY "Comments are viewable by everyone." ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post comments." ON public.comments 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    ((select auth.jwt() ->> 'is_anonymous')::boolean IS FALSE)
  );
CREATE POLICY "Users can update/delete their own comments." ON public.comments 
  FOR ALL USING (auth.uid() = user_id);

-- 7. Notifications policies
CREATE POLICY "Users can view their own notifications." ON public.notifications 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notifications." ON public.notifications 
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- ADIM POLICY (Only users with admin role can mutate catalog)
-- ==========================================
CREATE POLICY "Admins can insert anime" ON public.anime FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can update anime" ON public.anime FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can delete anime" ON public.anime FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);

-- ==========================================
-- GUEST TO PERMANENT IDENTITY MERGE RPC
-- ==========================================
CREATE OR REPLACE FUNCTION public.merge_guest_to_permanent(guest_uuid UUID, permanent_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

-- ==========================================
-- SMART CMS & SYNC ENGINE SCHEMA UPDATES
-- ==========================================

-- 1. ADD TRACKING & LOCKS TO ANIME TABLE
ALTER TABLE public.anime 
ADD COLUMN IF NOT EXISTS locked_fields JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS anilist_id INTEGER,
ADD COLUMN IF NOT EXISTS donghua_api_slug TEXT,
ADD COLUMN IF NOT EXISTS donghub_api_slug TEXT,
ADD COLUMN IF NOT EXISTS last_sync_metadata TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sync_episodes TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sync_streams TIMESTAMP WITH TIME ZONE;

-- Add index for fast AniList/API slug lookups
CREATE INDEX IF NOT EXISTS idx_anime_anilist_id ON public.anime (anilist_id);
CREATE INDEX IF NOT EXISTS idx_anime_donghua_slug ON public.anime (donghua_api_slug);

-- 2. ADD TRACKING, LOCKS, & MULTI-URLS TO EPISODES TABLE
ALTER TABLE public.episodes 
ADD COLUMN IF NOT EXISTS locked_fields JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS donghua_api_slug TEXT,
ADD COLUMN IF NOT EXISTS donghub_api_slug TEXT,
ADD COLUMN IF NOT EXISTS streams JSONB DEFAULT '[]'::jsonb, -- Store array of multiple servers { server, url, quality, lang }
ADD COLUMN IF NOT EXISTS downloads JSONB DEFAULT '[]'::jsonb; -- Store array of download links { server, url, quality }

-- 3. CREATE SYNC_LOGS TABLE (Optional, but very useful for the Sync Dashboard)
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id SERIAL PRIMARY KEY,
    anime_id INTEGER REFERENCES public.anime(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL, -- 'METADATA', 'EPISODES', 'STREAMS', 'FULL'
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'PARTIAL'
    records_updated INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_logs_anime ON public.sync_logs(anime_id, created_at DESC);


-- ==========================================
-- ADDITIONAL ADMIN RLS POLICIES FOR CATALOG TABLES
-- ==========================================

-- Genres admin policies
CREATE POLICY "Admins can insert genres" ON public.genres FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can update genres" ON public.genres FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can delete genres" ON public.genres FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);

-- Anime Genres junction admin policies
CREATE POLICY "Admins can insert anime_genres" ON public.anime_genres FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can update anime_genres" ON public.anime_genres FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can delete anime_genres" ON public.anime_genres FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);

-- Episodes admin policies
CREATE POLICY "Admins can insert episodes" ON public.episodes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can update episodes" ON public.episodes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can delete episodes" ON public.episodes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);

-- Episode Servers admin policies
CREATE POLICY "Admins can insert episode_servers" ON public.episode_servers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can update episode_servers" ON public.episode_servers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can delete episode_servers" ON public.episode_servers FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);

-- Episode Subtitles admin policies
CREATE POLICY "Admins can insert episode_subtitles" ON public.episode_subtitles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can update episode_subtitles" ON public.episode_subtitles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can delete episode_subtitles" ON public.episode_subtitles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);

-- Anime Characters admin policies
CREATE POLICY "Admins can insert anime_characters" ON public.anime_characters FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can update anime_characters" ON public.anime_characters FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can delete anime_characters" ON public.anime_characters FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);

-- Schedule admin policies
CREATE POLICY "Admins can insert schedule" ON public.schedule FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can update schedule" ON public.schedule FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can delete schedule" ON public.schedule FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);

-- Sync Logs admin policies
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select sync_logs" ON public.sync_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can insert sync_logs" ON public.sync_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can update sync_logs" ON public.sync_logs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
CREATE POLICY "Admins can delete sync_logs" ON public.sync_logs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND subscription_tier = 'admin')
);
