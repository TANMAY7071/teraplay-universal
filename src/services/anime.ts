import { supabase } from "@/lib/supabase";
import { animeCatalog } from "@/data/anime";
import { getAnimeSeriesDetails } from "@/data/animeDetails";
import type { Anime } from "@/types/anime";

/**
 * Service to handle all Anime-related data requests from Supabase
 * with automatic local mock fallbacks if the database is not seeded.
 */

export function mapDbToAnime(dbRow: any): Anime {
  const isExplicitlyDraft = 
    dbRow.visibility === 'draft' || 
    dbRow.is_published === false || 
    dbRow.locked_fields?.visibility === 'draft';

  const isExplicitlyPublished = !isExplicitlyDraft;
  const visibility: 'draft' | 'published' = isExplicitlyPublished ? 'published' : 'draft';

  return {
    id: dbRow.id,
    slug: dbRow.slug,
    title: dbRow.title,
    image: dbRow.poster_url || "",
    rating: typeof dbRow.rating === 'string' ? parseFloat(dbRow.rating) : (dbRow.rating || 0.0),
    episodes: dbRow.episode_count || 0,
    year: dbRow.year,
    genre: dbRow.genres && dbRow.genres.length > 0 ? dbRow.genres[0] : "",
    genres: dbRow.genres || [],
    status: dbRow.status === 'Completed' ? 'Completed' : 'Ongoing',
    synopsis: dbRow.synopsis || "",
    tags: dbRow.tags || [],
    isNew: dbRow.is_new || false,
    featured: dbRow.featured || false,
    originalTitle: dbRow.original_title || "",
    countryOfOrigin: dbRow.country_of_origin || "CN",
    visibility: visibility,
    isPublished: isExplicitlyPublished,
    metadataStatus: dbRow.last_sync_metadata ? 'ready' : 'pending',
    episodeSyncStatus: dbRow.last_sync_episodes ? 'synced' : 'pending',
    lastMetadataSync: dbRow.last_sync_metadata,
    lastEpisodeSync: dbRow.last_sync_episodes,
    anilistId: dbRow.anilist_id,
    donghuaApiSlug: dbRow.donghua_api_slug,
    donghubApiSlug: dbRow.donghub_api_slug,
  };
}

/**
 * Resolves an anime numeric database ID from either a numeric string ID or a slug.
 */
export async function resolveAnimeId(slugOrId: string): Promise<number | null> {
  if (!slugOrId) return null;
  if (/^\d+$/.test(slugOrId)) {
    return Number(slugOrId);
  }
  const { data } = await supabase
    .from("anime")
    .select("id")
    .eq("slug", slugOrId)
    .maybeSingle();
  return data?.id ?? null;
}


export async function fetchAnimeCatalog(filters?: {
  search?: string;
  genre?: string;
  status?: string;
  format?: string;
  limit?: number;
  offset?: number;
  includeDrafts?: boolean;
}, signal?: AbortSignal): Promise<Anime[]> {
  try {
    let query = supabase.from("anime").select("*");
    if (signal) {
      query = query.abortSignal(signal);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.format) {
      query = query.eq("format", filters.format);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,synopsis.ilike.%${filters.search}%`);
    }

    const limit = filters?.limit ?? 500;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      // Map database schema to frontend type
      let results = data.map(mapDbToAnime);

      // Enforce public isolation: strictly require visibility === 'published'
      if (!filters?.includeDrafts) {
        results = results.filter((item) => item.visibility === 'published' && item.isPublished === true);
      }

      // Filter by genre client-side if many-to-many junction is not fully populated
      if (filters?.genre) {
        results = results.filter((item) =>
          item.genres.map((g) => g.toLowerCase()).includes(filters.genre!.toLowerCase())
        );
      }
      return results;
    }
  } catch (err) {
    console.warn("Supabase fetchAnimeCatalog failed, using local fallback:", err);
  }

  // Local Mock Fallback
  let results = animeCatalog.map(a => ({
    ...a,
    visibility: 'published' as const,
    isPublished: true,
    countryOfOrigin: 'CN'
  }));

  if (!filters?.includeDrafts) {
    results = results.filter((item) => item.visibility === 'published' && item.isPublished === true);
  }

  if (filters?.genre) {
    results = results.filter((item) =>
      item.genres.map((g) => g.toLowerCase()).includes(filters.genre!.toLowerCase())
    );
  }
  if (filters?.status) {
    results = results.filter((item) => item.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (item) => item.title.toLowerCase().includes(q) || item.synopsis.toLowerCase().includes(q)
    );
  }
  return results.slice(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 50));
}

export async function fetchAnimeBySlug(slugOrId: string, signal?: AbortSignal, options?: { includeDrafts?: boolean }): Promise<Anime | null> {
  const catalogMatch = animeCatalog.find((item) => item.slug.toLowerCase() === slugOrId.toLowerCase() || String(item.id) === slugOrId);
  const targetSlug = catalogMatch?.slug || slugOrId;

  try {
    let query = supabase.from("anime").select("*");
    if (catalogMatch) {
      query = query.eq("slug", targetSlug);
    } else if (/^\d+$/.test(slugOrId)) {
      query = query.eq("id", Number(slugOrId));
    } else {
      query = query.eq("slug", slugOrId);
    }
    if (signal) {
      query = query.abortSignal(signal);
    }
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (data) {
      const anime = mapDbToAnime(data);
      if (!options?.includeDrafts && (anime.visibility !== 'published' || anime.isPublished !== true)) {
        return null;
      }
      return anime;
    }
  } catch (err) {
    console.warn(`Supabase fetchAnimeBySlug failed for ${slugOrId}, using local fallback:`, err);
  }

  // Local Mock Fallback
  if (catalogMatch) {
    const anime: Anime = {
      ...catalogMatch,
      visibility: 'published',
      isPublished: true,
      countryOfOrigin: 'CN',
    };
    if (!options?.includeDrafts && (anime.visibility !== 'published' || anime.isPublished !== true)) {
      return null;
    }
    return anime;
  }
  return null;
}

export async function fetchRelatedAnime(animeId: number, limit = 4, signal?: AbortSignal): Promise<Anime[]> {
  try {
    // Get genre list of the anime
    let currentQuery = supabase.from("anime").select("genres").eq("id", animeId);
    if (signal) {
      currentQuery = currentQuery.abortSignal(signal);
    }
    const { data: current } = await currentQuery.maybeSingle();
 
    if (current && current.genres && current.genres.length > 0) {
      let query = supabase
        .from("anime")
        .select("*")
        .neq("id", animeId)
        .contains("genres", [current.genres[0]])
        .limit(limit);
      if (signal) {
        query = query.abortSignal(signal);
      }
      const { data, error } = await query;
 
      if (error) throw error;
      if (data && data.length > 0) return data.map(mapDbToAnime);
    }
  } catch (err) {
    console.warn(`Supabase fetchRelatedAnime failed for ID ${animeId}, using local fallback:`, err);
  }

  // Local Mock Fallback
  const current = animeCatalog.find((item) => item.id === animeId);
  if (!current) return animeCatalog.slice(0, limit);
  
  return animeCatalog
    .filter((item) => item.id !== animeId && item.genres.some((g) => current.genres.includes(g)))
    .slice(0, limit);
}

export interface Character {
  name: string;
  role: string;
  avatar_url: string;
  cultivation_level?: string;
  ability?: string;
  description?: string;
  relationship?: string;
}

export async function fetchCharacters(animeId: number, signal?: AbortSignal): Promise<Character[]> {
  try {
    let query = supabase.from("anime_characters").select("*").eq("anime_id", animeId);
    if (signal) {
      query = query.abortSignal(signal);
    }
    const { data, error } = await query;

    if (error) throw error;
    if (data && data.length > 0) {
      return data.map(c => ({
        name: c.name,
        role: c.role,
        avatar_url: c.avatar_url,
        cultivation_level: c.cultivation_level,
        ability: c.ability,
        description: c.description,
        relationship: c.relationship
      }));
    }
  } catch (err) {
    console.warn(`Supabase fetchCharacters failed for ID ${animeId}, using local fallback:`, err);
  }

  // Local Mock Fallback
  const current = animeCatalog.find((item) => item.id === animeId);
  const details = getAnimeSeriesDetails(animeId, current?.title ?? "");
  return details.characters.map((c) => ({
    name: c.name,
    role: c.role,
    avatar_url: c.avatar,
    cultivation_level: c.cultivation,
    ability: c.ability,
    description: c.description,
    relationship: c.relationship
  }));
}

export interface Realm {
  rank: string;
  description: string;
}

export async function fetchCultivationRealms(animeId: number, signal?: AbortSignal): Promise<Realm[]> {
  try {
    let query = supabase.from("anime").select("cultivation_realms").eq("id", animeId);
    if (signal) {
      query = query.abortSignal(signal);
    }
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (data && data.cultivation_realms && (data.cultivation_realms as any).length > 0) {
      return data.cultivation_realms as Realm[];
    }
  } catch (err) {
    console.warn(`Supabase fetchCultivationRealms failed for ID ${animeId}, using local fallback:`, err);
  }

  // Local Mock Fallback
  const current = animeCatalog.find((item) => item.id === animeId);
  const details = getAnimeSeriesDetails(animeId, current?.title ?? "");
  return details.cultivationRealms;
}

const RATINGS_KEY = "donghua-ratings";

function getLocalRatings(): Record<number, number> {
  try {
    const data = localStorage.getItem(RATINGS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setLocalRatings(ratings: Record<number, number>) {
  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  window.dispatchEvent(new Event("storage"));
}

export async function fetchUserRatings(userId?: string): Promise<Record<number, number>> {
  if (!userId) {
    return getLocalRatings();
  }

  try {
    const { data, error } = await supabase
      .from("ratings")
      .select("anime_id, score")
      .eq("user_id", userId);

    if (error) throw error;
    if (data) {
      const ratingsMap: Record<number, number> = {};
      data.forEach((item) => {
        ratingsMap[item.anime_id] = item.score;
      });
      setLocalRatings(ratingsMap);
      return ratingsMap;
    }
  } catch (err) {
    console.warn("Supabase fetchUserRatings failed, falling back to local:", err);
  }

  return getLocalRatings();
}

export async function saveUserRating(animeId: number, score: number, userId?: string): Promise<void> {
  const local = getLocalRatings();
  local[animeId] = score;
  setLocalRatings(local);

  if (!userId) return;

  try {
    const { error } = await supabase
      .from("ratings")
      .upsert({ user_id: userId, anime_id: animeId, score }, { onConflict: "user_id,anime_id" });

    if (error) throw error;
  } catch (err) {
    console.error("Supabase saveUserRating failed:", err);
  }
}

// ==========================================
// CALENDAR WATCHABILITY (Q8/Q13/Q19/Q26/Q27)
// ==========================================

// Q13c: "today" is computed in one configured timezone, not the visitor's
// browser clock and not the server's UTC.
export function getSiteTimezone(): string {
  return (import.meta.env.VITE_TZ as string) || "Asia/Kolkata";
}

// YYYY-MM-DD for "today" in the site timezone (en-CA yields ISO ordering)
export function getSiteTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: getSiteTimezone() }).format(new Date());
}

export function getSiteTodayWeekday(): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: getSiteTimezone() }).format(new Date());
}

// Date part (YYYY-MM-DD) of an arbitrary timestamp, in the site timezone
export function getSiteDateISO(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: getSiteTimezone() }).format(new Date(dateStr));
  } catch {
    return "";
  }
}

interface WatchabilityData {
  animeIdsWithEpisodes: Set<number>;
  serverKeys: Set<string>; // `${animeId}:${episodeNumber}`
}

let watchabilityCache: { data: WatchabilityData; at: number } | null = null;
const WATCHABILITY_TTL = 5 * 60 * 1000;

// Q19a: lightweight Set-based data for the has-episodes filter and the
// Q27(d) per-episode server check. Fetched at most once per 5 minutes.
async function getWatchabilityData(): Promise<WatchabilityData | null> {
  if (watchabilityCache && Date.now() - watchabilityCache.at < WATCHABILITY_TTL) {
    return watchabilityCache.data;
  }
  try {
    const [epsRes, srvRes] = await Promise.all([
      supabase.from("episodes").select("anime_id"),
      supabase.from("episode_servers").select("episode_id, episode:episodes(episode_number, anime_id)"),
    ]);
    if (epsRes.error) {
      // Q15: on query failure, skip the episode-existence check (fail open)
      console.warn("Watchability: episodes fetch failed, skipping existence filter:", epsRes.error.message);
      return null;
    }
    const animeIdsWithEpisodes = new Set<number>();
    (epsRes.data || []).forEach((r: any) => animeIdsWithEpisodes.add(r.anime_id));

    const serverKeys = new Set<string>();
    (srvRes.data || []).forEach((r: any) => {
      const ep = Array.isArray(r.episode) ? r.episode[0] : r.episode;
      if (ep && ep.anime_id != null) serverKeys.add(`${ep.anime_id}:${ep.episode_number}`);
    });

    const data: WatchabilityData = { animeIdsWithEpisodes, serverKeys };
    watchabilityCache = { data, at: Date.now() };
    return data;
  } catch (err) {
    console.warn("Watchability data fetch failed, skipping filters:", err);
    return null;
  }
}

// Q26/Q27/Q31: per-item availability state.
//   available          → slug (Sanka resolution capability) or a server row for this episode
//   link pending       → no source yet, but the airing is in the future
//   source unavailable → no source and it already aired (or has no date)
type WatchState = "available" | "pending" | "unavailable";

function computeWatchState(item: any, watchability: WatchabilityData | null): WatchState {
  const animeData = Array.isArray(item.anime) ? item.anime[0] : item.anime;
  if (animeData?.donghua_api_slug) return "available";
  if (watchability?.serverKeys.has(`${item.anime_id}:${item.episode_number}`)) return "available";
  if (item.air_date && new Date(item.air_date).getTime() > Date.now()) return "pending";
  return "unavailable";
}

function isDraftAnime(animeData: any): boolean {
  return animeData?.locked_fields?.visibility === "draft" || animeData?.locked_fields?.is_published === false;
}

export async function fetchSchedule(): Promise<any[]> {
  try {
    const watchability = await getWatchabilityData();
    const { data, error } = await supabase
      .from("schedule")
      .select(`
        id,
        day_of_week,
        air_time,
        episode_number,
        air_date,
        anime:anime_id (
          id,
          slug,
          title,
          poster_url,
          banner_url,
          status,
          rating,
          synopsis,
          studio,
          genres,
          episode_count,
          donghua_api_slug,
          locked_fields
        )
      `);

    if (error) throw error;

    const filtered = (data || []).filter((item: any) => {
      const animeData = Array.isArray(item.anime) ? item.anime[0] : item.anime;
      if (!animeData) return false;
      if (isDraftAnime(animeData)) return false;
      // Q1a/Q7a: only shows that actually have episodes in the DB
      if (watchability && !watchability.animeIdsWithEpisodes.has(item.anime_id)) return false;
      return true;
    });

    return filtered.map((item: any) => ({
      ...item,
      watchState: computeWatchState(item, watchability),
    }));
  } catch (err) {
    console.warn("Supabase fetchSchedule failed, using local mock data:", err);
    throw err;
  }
}

export async function fetchTodayReleases(): Promise<{
  id: number;
  anime: Anime;
  episodeNumber: number;
  airTime: string;
  releaseStatus: 'released' | 'upcoming';
  releaseDateTime?: string;
  watchState?: WatchState;
}[]> {
  try {
    // Q9c/Q13c: date-first matching in the site timezone, weekday fallback for
    // rows that don't have air_date yet (pre-backfill legacy rows).
    const todayISO = getSiteTodayISO();
    const todayDay = getSiteTodayWeekday();

    const watchability = await getWatchabilityData();

    const { data, error } = await supabase
      .from("schedule")
      .select(`
        id,
        day_of_week,
        air_time,
        episode_number,
        air_date,
        anime:anime_id (
          id,
          slug,
          title,
          poster_url,
          banner_url,
          status,
          rating,
          synopsis,
          studio,
          genres,
          episode_count,
          donghua_api_slug,
          locked_fields
        )
      `);

    if (error) throw error;

    if (data && data.length > 0) {
      const results = (data || [])
        .filter((item: any) => {
          const animeData = Array.isArray(item.anime) ? item.anime[0] : item.anime;
          if (!animeData) return false;
          if (isDraftAnime(animeData)) return false;
          if (watchability && !watchability.animeIdsWithEpisodes.has(item.anime_id)) return false;
          // Q9c: rows with a real air_date match today's DATE in site TZ;
          // legacy rows fall back to the stored weekday name.
          if (item.air_date) {
            return getSiteDateISO(item.air_date) === todayISO;
          }
          return item.day_of_week === todayDay;
        })
        .map((item: any) => {
          const rawTime = (item.air_time || "12:00 PM").replace(/^at\s+/i, '').trim();
          let formattedTime = rawTime;
          // Format 24h to 12h if needed
          if (/^\d{1,2}:\d{2}$/.test(rawTime)) {
            const [h, m] = rawTime.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            formattedTime = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
          }

          // Determine whether time has passed today
          let releaseStatus: 'released' | 'upcoming' = 'released';
          try {
            const parts = formattedTime.split(' ');
            if (parts.length === 2) {
              const [hours, mins] = parts[0].split(':').map(Number);
              const ampm = parts[1];
              let targetHour = hours;
              if (ampm === 'PM' && targetHour < 12) targetHour += 12;
              if (ampm === 'AM' && targetHour === 12) targetHour = 0;
              const releaseTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, mins);
              releaseStatus = now >= releaseTimeToday ? 'released' : 'upcoming';
            }
          } catch {
            releaseStatus = 'released';
          }

          const animeData = Array.isArray(item.anime) ? item.anime[0] : item.anime;
          const animeObj = mapDbToAnime(animeData);
          const epNum = item.episode_number || animeObj.episodes || 1;

          return {
            id: Number(item.id),
            anime: animeObj,
            episodeNumber: epNum,
            airTime: formattedTime,
            releaseStatus,
            releaseDateTime: item.air_date || undefined,
            watchState: computeWatchState(item, watchability)
          };
        });

      // Sort by air time ascending
      results.sort((a, b) => a.airTime.localeCompare(b.airTime));
      if (results.length > 0) return results;
    }
  } catch (err) {
    console.warn("Supabase fetchTodayReleases failed, fallback to local:", err);
  }

  // Fallback from catalog
  const catalog = await fetchAnimeCatalog();
  return catalog.slice(0, 6).map((anime, idx) => {
    const times = ["10:00 AM", "12:30 PM", "02:00 PM", "04:30 PM", "06:00 PM", "08:30 PM"];
    return {
      id: Number(anime.id) || (idx + 1),
      anime,
      episodeNumber: anime.episodes || 1,
      airTime: times[idx % times.length],
      releaseStatus: 'released' as const,
    };
  });
}
