/**
 * Live TMDB Season & Episode Ingestion Service
 * 
 * Fetches real ordered seasons, official season posters, episode counts,
 * and episode stills directly from TMDB API without any hardcoded assets.
 */

import { isTmdbConfigured, getTmdbDetail, getTmdbSeasonDetail } from "./tmdbAnime";
import { searchTmdbWithCascade } from "./donghuaAliasResolver";
import { supabase } from "@/lib/supabase";

export interface TmdbLiveSeason {
  id: string;
  seasonNumber: number;
  title: string;
  episodesCount: number;
  airDate: string;
  year: number;
  poster: string;
  banner: string;
  description: string;
  tmdbId: number;
  rating: number;
  status?: string;
  tag?: string;
}

export interface TmdbLiveEpisode {
  episodeNumber: number;
  title: string;
  overview: string;
  stillUrl: string;
  airDate: string;
  voteAverage: number;
}

/**
 * Fetches real ordered seasons from TMDB for any Donghua title, acronym, or TMDB ID.
 */
export async function fetchLiveTmdbSeasons(queryOrId: string | number): Promise<{ seasons: TmdbLiveSeason[]; tmdbId: number | null }> {
  if (!isTmdbConfigured() || !queryOrId) return { seasons: [], tmdbId: null };

  let tmdbId: number | null = null;
  const strQuery = String(queryOrId).trim();

  if (typeof queryOrId === "number" || /^\d+$/.test(strQuery)) {
    tmdbId = Number(queryOrId);
  } else {
    // Cascade search across acronyms and alternate English titles (e.g. Against the Gods, BTTH)
    const { results } = await searchTmdbWithCascade(strQuery);
    if (results && results.length > 0) {
      tmdbId = Number(results[0].id);
    }
  }

  if (!tmdbId) return { seasons: [], tmdbId: null };

  const raw = await getTmdbDetail(tmdbId);
  if (!raw || !Array.isArray(raw.seasons)) return { seasons: [], tmdbId };

  const backdrop = raw.backdrop_path ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}` : "";
  const mainPoster = raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : "";

  // Sort regular seasons in natural order (1, 2, 3...), and place Specials (0) at the end if present
  const sorted = [...raw.seasons].sort((a: any, b: any) => {
    if (a.season_number === 0) return 1;
    if (b.season_number === 0) return -1;
    return a.season_number - b.season_number;
  });

  const seasons: TmdbLiveSeason[] = sorted.map((s: any, idx: number) => {
    const year = s.air_date ? parseInt(s.air_date.slice(0, 4)) || 0 : (raw.first_air_date ? parseInt(raw.first_air_date.slice(0, 4)) || 0 : new Date().getFullYear());
    const poster = s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : mainPoster;
    const tag = s.season_number === 0 ? "SPECIAL EVENT" : (idx === 0 ? "BEGINNING ARC" : `SEASON ${s.season_number}`);

    return {
      id: `tmdb-s-${s.season_number}`,
      seasonNumber: s.season_number,
      title: s.name || (s.season_number === 0 ? "Specials" : `Season ${s.season_number}`),
      episodesCount: s.episode_count || 12,
      airDate: s.air_date || "",
      year,
      poster,
      banner: backdrop || poster,
      description: s.overview || raw.overview || "",
      tmdbId: tmdbId as number,
      rating: s.vote_average ? Math.round(s.vote_average * 10) / 10 : (raw.vote_average ? Math.round(raw.vote_average * 10) / 10 : 8.5),
      status: "Published",
      tag
    };
  });

  return { seasons, tmdbId };
}

/**
 * Fetches real episode details & 1080p stills for a specific season from TMDB.
 */
export async function fetchLiveTmdbSeasonEpisodes(tmdbId: number | string, seasonNumber: number): Promise<TmdbLiveEpisode[]> {
  const data = await getTmdbSeasonDetail(tmdbId, seasonNumber);
  if (!data || !Array.isArray(data.episodes)) return [];

  return data.episodes.map((ep: any) => ({
    episodeNumber: Number(ep.episode_number) || 1,
    title: ep.name && !ep.name.toLowerCase().startsWith("episode ") ? ep.name : `Episode ${ep.episode_number}`,
    overview: ep.overview || "",
    stillUrl: ep.still_path ? `https://image.tmdb.org/t/p/w780${ep.still_path}` : "",
    airDate: ep.air_date || "",
    voteAverage: ep.vote_average ? Math.round(ep.vote_average * 10) / 10 : 0
  }));
}

/**
 * Persists ingested TMDB seasons to Supabase anime_seasons table.
 */
export async function persistSeasonsToSupabase(animeIdentifier: string, seasons: TmdbLiveSeason[]): Promise<boolean> {
  try {
    // 1. Resolve numeric anime ID if string slug was passed
    let animeId: number | null = null;
    if (/^\d+$/.test(animeIdentifier)) {
      animeId = Number(animeIdentifier);
    } else {
      const { data } = await supabase.from("anime").select("id").eq("slug", animeIdentifier).maybeSingle();
      if (data?.id) animeId = data.id;
    }

    if (!animeId || seasons.length === 0) return false;

    const payload = seasons.map(s => ({
      anime_id: animeId,
      season_number: s.seasonNumber,
      title: s.title,
      poster_url: s.poster,
      banner_url: s.banner,
      release_year: s.year,
      episode_count: s.episodesCount
    }));

    const { error } = await supabase.from("anime_seasons").upsert(payload, { onConflict: "anime_id,season_number" });
    if (error) {
      console.warn("Could not upsert anime_seasons into Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Failed persisting seasons to Supabase:", err);
    return false;
  }
}
