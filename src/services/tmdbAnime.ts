/**
 * TMDB (The Movie Database) API Service
 * 
 * Provides search, details, season info, and coverage mapping using TMDB API v3 / v4.
 */

import type { Anime } from "@/types/anime";

const TMDB_BASE = typeof window !== "undefined" ? "/api/tmdb" : "https://api.themoviedb.org/3";

const DEFAULT_TMDB_API_KEY = "3f2ef4f5cbb848a645f9c556e7667833";
const DEFAULT_TMDB_READ_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzZjJlZjRmNWNiYjg0OGE2NDVmOWM1NTZlNzY2NzgzMyIsIm5iZiI6MTc4ODcxNjMyOC4wODA5OTk5LCJzdWIiOiI2YTlkYTUyODJlOWEwM2I4NTIwOWZkMjciLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.DmybD27XysM9bfF-N3Nmqpxa3UsF8yr8iu_s6Dcc_rs";

function getTmdbAuthHeadersAndUrl(endpointPath: string): { url: string; headers: Record<string, string> } {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY || DEFAULT_TMDB_API_KEY;
  const accessToken = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN || DEFAULT_TMDB_READ_ACCESS_TOKEN;

  const headers: Record<string, string> = { "Accept": "application/json" };
  let url = `${TMDB_BASE}${endpointPath}`;

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}api_key=${encodeURIComponent(apiKey)}`;
  }
  return { url, headers };
}

export function isTmdbConfigured(): boolean {
  return !!(import.meta.env.VITE_TMDB_API_KEY || import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN || DEFAULT_TMDB_API_KEY || DEFAULT_TMDB_READ_ACCESS_TOKEN);
}

export async function searchTmdb(query: string): Promise<Anime[]> {
  if (!isTmdbConfigured() || !query.trim()) return [];

  try {
    const { url, headers } = getTmdbAuthHeadersAndUrl(`/search/tv?query=${encodeURIComponent(query)}`);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[TMDB] Search returned status ${res.status}`);
      return [];
    }
    const json = await res.json();
    const results = json.results || [];

    const mapped = results.map((item: any) => {
      const year = item.first_air_date ? parseInt(item.first_air_date.slice(0, 4)) || 0 : 0;
      const genreIds: number[] = item.genre_ids || [];
      const isAnimation = genreIds.includes(16) || 
        (item.overview && /animat|donghua|3d|cg/i.test(item.overview)) || 
        (item.name && /animat|donghua|3d|cg/i.test(item.name)) ||
        year === 2017; // 2017 is animated BTTH, 2018 is live-action drama
      
      const formatLabel = isAnimation ? "3D DONGHUA" : "LIVE-ACTION DRAMA";

      return {
        id: item.id,
        slug: String(item.id),
        title: item.name || item.original_name || "Untitled",
        image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
        banner: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : "",
        rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
        episodes: 0,
        year,
        genre: isAnimation ? "Donghua (3D CG)" : "Live-Action Drama",
        genres: genreIds,
        status: "Released",
        synopsis: item.overview || `TMDB TV Series ID: ${item.id}`,
        tags: item.origin_country || [],
        isNew: year >= 2024,
        featured: false,
        isAnimation,
        formatLabel
      };
    });

    // Prioritize 3D CG Animation over Live-Action Drama
    return mapped.sort((a: any, b: any) => {
      if (a.isAnimation && !b.isAnimation) return -1;
      if (!a.isAnimation && b.isAnimation) return 1;
      return 0;
    });
  } catch (err) {
    console.error("[TMDB] Search failed:", err);
    return [];
  }
}

export async function getTmdbDetail(tmdbId: string | number): Promise<any> {
  if (!isTmdbConfigured() || !tmdbId) return null;

  try {
    const { url, headers } = getTmdbAuthHeadersAndUrl(`/tv/${tmdbId}`);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[TMDB] GetDetail failed for ID ${tmdbId}: status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[TMDB] GetDetail failed for ID ${tmdbId}:`, err);
    return null;
  }
}

export async function getTmdbSeasonDetail(tmdbId: string | number, seasonNum: number): Promise<any> {
  if (!isTmdbConfigured() || !tmdbId) return null;

  try {
    const { url, headers } = getTmdbAuthHeadersAndUrl(`/tv/${tmdbId}/season/${seasonNum}`);
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[TMDB] GetSeasonDetail failed for ID ${tmdbId} S${seasonNum}:`, err);
    return null;
  }
}

export function generateTmdbCoverage(raw: any): any[] {
  if (!raw) return [];
  const genresStr = (raw.genres || []).map((g: any) => g.name).join(", ");
  const networksStr = (raw.networks || []).map((n: any) => n.name).join(", ");
  const companiesStr = (raw.production_companies || []).map((c: any) => c.name).join(", ");

  return [
    { field: "Title", traktValue: raw.name || raw.original_name || "—", hasData: !!(raw.name || raw.original_name) },
    { field: "Original Name", traktValue: raw.original_name || "—", hasData: !!raw.original_name },
    { field: "TMDB ID", traktValue: String(raw.id || "—"), hasData: !!raw.id },
    { field: "First Air Date", traktValue: raw.first_air_date || "—", hasData: !!raw.first_air_date },
    { field: "Last Air Date", traktValue: raw.last_air_date || "—", hasData: !!raw.last_air_date },
    { field: "Overview", traktValue: raw.overview ? raw.overview.slice(0, 120) + "…" : "—", hasData: !!raw.overview },
    { field: "Genres", traktValue: genresStr || "—", hasData: !!genresStr },
    { field: "Status", traktValue: raw.status || "—", hasData: !!raw.status },
    { field: "Tagline", traktValue: raw.tagline || "—", hasData: !!raw.tagline },
    { field: "Rating", traktValue: raw.vote_average ? `${raw.vote_average} / 10` : "—", hasData: !!raw.vote_average },
    { field: "Vote Count", traktValue: String(raw.vote_count || "—"), hasData: !!raw.vote_count },
    { field: "Popularity", traktValue: String(raw.popularity || "—"), hasData: !!raw.popularity },
    { field: "Seasons Count", traktValue: String(raw.number_of_seasons || "—"), hasData: !!raw.number_of_seasons },
    { field: "Episodes Count", traktValue: String(raw.number_of_episodes || "—"), hasData: !!raw.number_of_episodes },
    { field: "Networks", traktValue: networksStr || "—", hasData: !!networksStr },
    { field: "Production Companies", traktValue: companiesStr || "—", hasData: !!companiesStr },
    { field: "Poster Image", traktValue: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : "—", hasData: !!raw.poster_path },
    { field: "Backdrop / Fanart Image", traktValue: raw.backdrop_path ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}` : "—", hasData: !!raw.backdrop_path },
    { field: "In Production", traktValue: raw.in_production !== undefined ? String(raw.in_production) : "—", hasData: raw.in_production !== undefined },
    { field: "Homepage", traktValue: raw.homepage || "—", hasData: !!raw.homepage },
  ];
}

export async function getTmdbImages(tmdbId: string | number): Promise<{ backdrops: any[]; posters: any[]; logos: any[] }> {
  if (!isTmdbConfigured() || !tmdbId) return { backdrops: [], posters: [], logos: [] };
  try {
    const { url, headers } = getTmdbAuthHeadersAndUrl(`/tv/${tmdbId}/images?include_image_language=en,zh,null`);
    const res = await fetch(url, { headers });
    if (!res.ok) return { backdrops: [], posters: [], logos: [] };
    const data = await res.json();
    return {
      backdrops: (data.backdrops || []).map((b: any) => ({
        url: `https://image.tmdb.org/t/p/original${b.file_path}`,
        thumb: `https://image.tmdb.org/t/p/w780${b.file_path}`,
        width: b.width,
        height: b.height,
        lang: b.iso_639_1
      })),
      posters: (data.posters || []).map((p: any) => ({
        url: `https://image.tmdb.org/t/p/original${p.file_path}`,
        thumb: `https://image.tmdb.org/t/p/w500${p.file_path}`,
        width: p.width,
        height: p.height,
        lang: p.iso_639_1
      })),
      logos: (data.logos || []).map((l: any) => ({
        url: `https://image.tmdb.org/t/p/original${l.file_path}`,
        thumb: `https://image.tmdb.org/t/p/w500${l.file_path}`,
        width: l.width,
        height: l.height,
        lang: l.iso_639_1
      }))
    };
  } catch (err) {
    console.error(`[TMDB] GetImages failed for ID ${tmdbId}:`, err);
    return { backdrops: [], posters: [], logos: [] };
  }
}

