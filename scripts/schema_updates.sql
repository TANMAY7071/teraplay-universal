-- Run this in your Supabase SQL Editor

ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS trailer_url TEXT;
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS series_group TEXT;
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS season_order INT DEFAULT 1;
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS is_current_season BOOLEAN DEFAULT false;

-- Create an index to optimize querying for the active season poster
CREATE INDEX IF NOT EXISTS idx_anime_series_group ON public.anime (series_group, is_current_season);

-- Add JSONB metadata and episode-level trailers
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS rich_metadata JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS youtube_trailer_id TEXT;
