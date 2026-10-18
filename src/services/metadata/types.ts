export interface MediaShow {
  id?: number;
  title: string;
  slug: string;
  anilist_id?: number;
  mal_id?: number;
  simkl_id?: number;
  poster_url?: string;
  banner_url?: string;
  description?: string;
  genres?: string[];
  status?: string;
  year?: number;
}

export interface MediaSeason {
  id?: number;
  anime_id: number;
  season_number: number;
  title?: string;
  anilist_id?: number;
  simkl_id?: number;
  poster_url?: string;
  banner_url?: string;
  episode_count?: number;
  release_year?: number;
}

export interface MediaEpisode {
  id?: number;
  season_id?: number;
  episode_number: number;
  title?: string;
  overview?: string;
  air_date?: string | null;
  runtime?: number;
  anilist_episode_id?: number;
  simkl_episode_id?: number;
  thumbnail_url?: string;
  thumbnail_source?: string;
  stream_url?: string;
  download_url?: string;
  sync_status?: string;
}
