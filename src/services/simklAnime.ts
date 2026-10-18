import type { Anime } from "@/types/anime";
import { anilistDonghuaMap } from "@/data/anilistDonghuaMap";

export const SIMKL_CLIENT_ID = import.meta.env.VITE_SIMKL_CLIENT_ID || "c307e7c79e68401e90815a94e89c3b76ed3a249429529f697512ea27f1f2476c";
const APP_NAME = "DonghuaStream";
const APP_VERSION = "1.0.0";
const USER_AGENT = `${APP_NAME}/${APP_VERSION}`;

const SIMKL_API_BASE = "/api/simkl";

// Logging system for the sandbox debug console
export let simklDebugLogs: string[] = [];
let debugLogListeners: ((logs: string[]) => void)[] = [];

export function registerSimklLogListener(listener: (logs: string[]) => void) {
  debugLogListeners.push(listener);
  listener([...simklDebugLogs]);
  return () => {
    debugLogListeners = debugLogListeners.filter(l => l !== listener);
  };
}

function logDebug(message: string) {
  console.log(message);
  simklDebugLogs.push(message);
  debugLogListeners.forEach(l => l([...simklDebugLogs]));
}

export function clearSimklDebugLogs() {
  simklDebugLogs = [];
  debugLogListeners.forEach(l => l([]));
}

// Universal Helper to upgrade any SIMKL image URL to high-resolution (_w.jpg) and proxy via wsrv.nl
export function getHighResSimklImage(url: string | null | undefined): string {
  if (!url || url.trim() === "") return "";
  let clean = url.trim();

  // If proxied via wsrv.nl, unwrap it first to get the underlying URL
  if (clean.includes("wsrv.nl/?url=")) {
    try {
      const match = clean.match(/url=([^&]+)/);
      if (match && match[1]) {
        clean = decodeURIComponent(match[1]);
      }
    } catch {
      // Keep clean
    }
  }

  let finalUrl = clean;
  // Transform SIMKL image paths/urls to wide high-definition JPG
  if (clean.includes("simkl.in/episodes/")) {
    const stripped = clean
      .replace(/https?:\/\/simkl\.in\/episodes\//, "")
      .replace(/\.(jpg|jpeg|png|webp)$/i, "")
      .replace(/(_m|_b|_t|_c|_small|_w)$/i, "");
    finalUrl = `https://simkl.in/episodes/${stripped}_w.jpg`;
  } else if (!clean.startsWith("http")) {
    const stripped = clean.replace(/\.(jpg|jpeg|png|webp)$/i, "").replace(/(_m|_b|_t|_c|_small|_w)$/i, "");
    finalUrl = `https://simkl.in/episodes/${stripped}_w.jpg`;
  }

  // Proxy simkl.in URLs via wsrv.nl CDN to ensure cross-origin/referrer compatibility in browsers
  if (finalUrl.includes("simkl.in")) {
    return `https://wsrv.nl/?url=${encodeURIComponent(finalUrl)}&q=90`;
  }

  return finalUrl;
}

// Helper to format Simkl image URLs safely according to official specs and proxy them via wsrv.nl
export function normalizeSimklImageUrl(
  path: string | null | undefined, 
  type: "posters" | "fanart" | "episodes" | "avatars", 
  size?: string
): string {
  if (!path) return "";
  if (path.startsWith("http")) {
    if (type === "episodes" || path.includes("simkl.in/episodes/")) {
      return getHighResSimklImage(path);
    }
    return path;
  }

  // Clean any existing extension and size suffixes
  const cleanPath = path
    .replace(/\.(jpg|jpeg|png|webp)$/i, "")
    .replace(/(_m|_b|_t|_w|_c|_medium|_large|_d)$/i, "");

  // Determine default size suffix and extension based on category
  let suffix = "";
  let ext = "webp";

  if (type === "posters") {
    suffix = size || "_m"; // _m = medium, _b = big, _t = thumbnail
  } else if (type === "fanart") {
    suffix = size || "_medium"; // _medium, _d (dark/original), _w (wide)
    if (suffix === "_d") ext = "jpg";
  } else if (type === "episodes") {
    suffix = size || "_w"; // _w = wide
  } else if (type === "avatars") {
    suffix = size || "";
    ext = "jpg"; // Avatars are always jpg
  }

  const originUrl = `https://simkl.in/${type}/${cleanPath}${suffix}.${ext}`;
  
  // Wrap in wsrv.nl proxy to prevent hotlinking and CORS blocks
  return `https://wsrv.nl/?url=${encodeURIComponent(originUrl)}&q=90`;
}

export const getPosterUrl = (poster: string) => {
  return normalizeSimklImageUrl(poster, "posters");
};

export const getFanartUrl = (fanart: string) => {
  return normalizeSimklImageUrl(fanart, "fanart");
};

export type ThumbnailSource = 'simkl' | 'installment-poster' | 'installment-banner' | 'series-poster';

export interface CanonicalEpisode {
  installmentId: string;
  simklId: number;
  simklEpisodeId?: number;
  relativeNumber: number;
  absoluteNumber: number;
  title: string;
  description?: string;
  duration?: string;
  thumbnailUrl: string;
  thumbnailSource: ThumbnailSource;
  airDate?: string;
  isAired: boolean;
  isUpcoming: boolean;
  isWatched: boolean;
}

const simklIdResolutionCache: Record<string, number> = {};

export async function resolveSimklIdForShow(
  title: string,
  anilistId?: number
): Promise<number | null> {
  const cacheKey = `ds_simkl_resolved_${title}_${anilistId || ""}`.toLowerCase().replace(/\s+/g, "_");
  if (simklIdResolutionCache[cacheKey]) {
    return simklIdResolutionCache[cacheKey];
  }

  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored && !isNaN(Number(stored))) {
      const val = Number(stored);
      simklIdResolutionCache[cacheKey] = val;
      return val;
    }
  } catch {}

  if (anilistId) {
    try {
      const searchUrl = `https://api.simkl.com/search/id?anilist=${anilistId}&client_id=${SIMKL_CLIENT_ID}`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const matchedId = data[0].ids?.simkl || data[0].id;
          if (matchedId) {
            const numId = Number(matchedId);
            simklIdResolutionCache[cacheKey] = numId;
            try { localStorage.setItem(cacheKey, String(numId)); } catch {}
            return numId;
          }
        }
      }
    } catch {}
  }

  try {
    const searchUrl = `https://api.simkl.com/search/anime?q=${encodeURIComponent(title)}&client_id=${SIMKL_CLIENT_ID}`;
    const res = await fetch(searchUrl);
    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const cleanQuery = title.toLowerCase().replace(/[^a-z0-9]/g, "");
        for (const item of results) {
          const itemTitle = (item.title || item.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          if (itemTitle.includes(cleanQuery) || cleanQuery.includes(itemTitle)) {
            const resolvedId = item.ids?.simkl || item.id;
            if (resolvedId) {
              const numId = Number(resolvedId);
              simklIdResolutionCache[cacheKey] = numId;
              try { localStorage.setItem(cacheKey, String(numId)); } catch {}
              return numId;
            }
          }
        }
      }
    }
  } catch {}

  return null;
}

export const getEpisodeImgUrl = (img: string) => {
  return getHighResSimklImage(img);
};

export interface NormalizedMedia {
  id: string;
  title: string;
  poster: string | null;
  fanart: string | null;
  thumbnail: string | null;
  description?: string;
  year?: number;
  status?: string;
  genres?: string[];
  externalIds?: Record<string, string | null>;
}

export function normalizeSimklMedia(raw: any): NormalizedMedia {
  if (!raw) {
    return {
      id: "",
      title: "Unknown",
      poster: null,
      fanart: null,
      thumbnail: null
    };
  }

  // Extract ID
  const id = String(raw.ids?.simkl ?? raw.ids?.simkl_id ?? raw.id ?? "");

  // Extract Title
  const title = raw.title ?? raw.name ?? raw.show?.title ?? "Unknown";

  // Normalize Images
  const poster = raw.poster ? normalizeSimklImageUrl(raw.poster, "posters") : null;
  const fanart = raw.fanart ? normalizeSimklImageUrl(raw.fanart, "fanart") : null;
  const thumbnail = (raw.img || raw.image || raw.poster) 
    ? normalizeSimklImageUrl(raw.img || raw.image || raw.poster, "episodes") 
    : null;

  // External ID mappings
  const externalIds: Record<string, string | null> = {};
  if (raw.ids) {
    Object.entries(raw.ids).forEach(([k, v]) => {
      if (k !== "simkl" && k !== "simkl_id") {
        externalIds[k] = v ? String(v) : null;
      }
    });
  }

  return {
    id,
    title,
    poster,
    fanart,
    thumbnail,
    description: raw.overview ?? raw.description ?? "",
    year: raw.year ? Number(raw.year) : undefined,
    status: raw.status ?? undefined,
    genres: raw.genres ?? [],
    externalIds
  };
}

// Rate-limiting queue for POST requests (1 request per second max)
class RateLimiter {
  private lastRequestTime = 0;
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  async enqueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const delay = Math.max(0, 1000 - (now - this.lastRequestTime));
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      const request = this.queue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request().catch(() => {});
      }
    }

    this.processing = false;
  }
}

export const postLimiter = new RateLimiter();

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Base helper for Simkl requests to append required query params and headers
async function fetchSimklApi(endpoint: string, accessToken?: string, options: RequestInit = {}): Promise<any> {
  const isServer = typeof window === "undefined";
  const baseUrl = isServer 
    ? "https://api.simkl.com" 
    : (import.meta.env.DEV ? window.location.origin + SIMKL_API_BASE : SIMKL_API_BASE);
  
  const urlObj = new URL(baseUrl + endpoint);
  
  // Enforce required query parameters
  urlObj.searchParams.set("client_id", SIMKL_CLIENT_ID);
  urlObj.searchParams.set("app-name", APP_NAME);
  urlObj.searchParams.set("app-version", APP_VERSION);

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  headers.set("simkl-api-key", SIMKL_CLIENT_ID);

  // Enforce descriptive User-Agent header (only outside standard browser contexts to prevent header console errors)
  if (isServer) {
    headers.set("User-Agent", USER_AGENT);
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const cleanUrlForLog = endpoint.split("?")[0];
  const method = options.method || "GET";
  const cacheKey = urlObj.toString();

  // Request deduplication & caching for GET requests
  if (method === "GET") {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logDebug(`[Cache Hit] GET ${cleanUrlForLog}`);
      return cached.data;
    }
  }

  logDebug(`${method} ${cleanUrlForLog}`);

  // Create AbortController for a 10-second timeout limit
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(urlObj.toString(), {
      ...options,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    const responseText = await response.text();
    logDebug(`Status: ${response.status}`);
    
    if (!response.ok) {
      logDebug(`↳ Response: ${responseText}`);
      throw new Error(`SIMKL API ${response.status}: ${responseText || response.statusText}`);
    }

    try {
      const parsedData = JSON.parse(responseText);
      
      // Save successful GET requests to the cache
      if (method === "GET") {
        apiCache.set(cacheKey, { data: parsedData, timestamp: Date.now() });
      }
      
      return parsedData;
    } catch {
      throw new Error("SIMKL returned invalid JSON");
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      logDebug(`↳ Error: Request timed out after 10 seconds`);
      throw new Error("SIMKL API request timed out after 10 seconds");
    }
    logDebug(`↳ Fetch Error: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// SEARCH BY ID (STAGE 5)
// -------------------------------------------------------------
export async function searchSimklById(ids: { anilist?: string; anidb?: string; mal?: string; tvdb?: string; tmdb?: string }): Promise<string | null> {
  const priorities: (keyof typeof ids)[] = ["anilist", "anidb", "mal", "tvdb", "tmdb"];
  for (const provider of priorities) {
    const value = ids[provider];
    if (value) {
      try {
        logDebug(`↳ Searching Simkl by external ID (${provider}=${value})...`);
        const items = await fetchSimklApi(`/search/id?${provider}=${encodeURIComponent(value)}`);
        if (items && items.length > 0) {
          const simklId = items[0].ids?.simkl || items[0].ids?.simkl_id;
          if (simklId) {
            logDebug(`↳ Found matched Simkl ID: ${simklId}`);
            return String(simklId);
          }
        }
      } catch (e) {
        logDebug(`↳ Search by ${provider} ID failed.`);
      }
    }
  }
  return null;
}

// -------------------------------------------------------------
// PHASE 1: INITIAL SYNC STRATEGY
// -------------------------------------------------------------
export async function initialSyncSimkl(accessToken: string): Promise<{ shows: any; movies: any; anime: any }> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  console.log("[Simkl Sync] Starting Phase 1 Initial Sync (Sequential)...");

  const shows = await fetchSimklApi("/sync/shows", accessToken);
  await sleep(500);

  const movies = await fetchSimklApi("/sync/movies", accessToken);
  await sleep(500);

  const anime = await fetchSimklApi("/sync/anime", accessToken);

  return { shows, movies, anime };
}

// -------------------------------------------------------------
// PHASE 2: CONTINUOUS SYNC LOOP
// -------------------------------------------------------------
export async function checkActivitiesSimkl(accessToken: string): Promise<any> {
  return fetchSimklApi("/sync/activities", accessToken);
}

export async function syncAllItemsSimkl(accessToken: string, dateFrom: string): Promise<any> {
  return fetchSimklApi(`/sync/all-items/?date_from=${encodeURIComponent(dateFrom)}`, accessToken);
}

// -------------------------------------------------------------
// SIMKL POST ACTIONS (WITH AUTOMATIC THROTTLING)
// -------------------------------------------------------------
export async function addSimklHistory(accessToken: string, payload: any): Promise<any> {
  return postLimiter.enqueue(() => 
    fetchSimklApi("/sync/history", accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

// -------------------------------------------------------------
// SEARCH & LOGS FOR EXPERIMENTAL SANDBOX
// -------------------------------------------------------------
export async function searchSimklAnime(query: string): Promise<any[]> {
  try {
    logDebug(`Simkl Search for "${query}"`);
    const raw = await fetchSimklApi(`/search/anime?q=${encodeURIComponent(query)}`);
    if (!Array.isArray(raw)) {
      throw new Error("Invalid SIMKL search response");
    }
    // If anime search returned 0 results, try TV (some donghua are listed as TV shows)
    if (raw.length === 0) {
      logDebug(`↳ Anime search empty, trying /search/tv for "${query}"...`);
      const tvRaw = await fetchSimklApi(`/search/tv?q=${encodeURIComponent(query)}`);
      if (Array.isArray(tvRaw) && tvRaw.length > 0) {
        logDebug(`↳ Found ${tvRaw.length} TV results for "${query}"`);
        return tvRaw;
      }
    }
    return raw;
  } catch (error) {
    console.error(`[SIMKL] Search failed for "${query}"`, error);
    throw error;
  }
}

export function normalizeSimklResult(item: any) {
  return {
    id: String(item?.ids?.simkl ?? item?.ids?.simkl_id ?? ""),
    title: item?.title ?? item?.name ?? item?.show?.title ?? "",
    year: item?.year ?? (item?.release_date ? parseInt(item.release_date.slice(0, 4)) : null),
    ids: item?.ids ?? {},
    raw: item,
  };
}

export async function searchSimkl(query: string): Promise<Anime[]> {
  try {
    const items = await searchSimklAnime(query);

    if (!Array.isArray(items)) {
      return [];
    }

    const results: Anime[] = [];

    for (const item of items) {
      const simklId =
        item?.ids?.simkl ??
        item?.ids?.simkl_id;

      if (!simklId) continue;

      // Search response is lightweight, so fetch the real details.
      let details: any = null;

      try {
        details = await getSimklDetail(String(simklId));
      } catch (error) {
        console.warn(
          `[SIMKL] Failed to enrich search result ${simklId}`,
          error
        );
      }

      const title =
        details?.title ??
        item?.title ??
        item?.name ??
        item?.show?.title ??
        "";

      const episodes =
        Number(
          details?.episodes_count ??
          item?.episodes_count ??
          item?.show?.episodes_count ??
          0
        );

      const rating =
        Number(
          details?.ratings?.simkl?.rating ??
          item?.ratings?.simkl?.rating ??
          item?.show?.ratings?.simkl?.rating ??
          0
        );

      const poster = getPosterUrl(
        details?.poster ??
        item?.poster ??
        item?.show?.poster
      );

      results.push({
        id: Number(simklId),
        slug: String(simklId),
        title,
        image: poster,
        rating,
        episodes,
        year:
          Number(
            details?.year ??
            item?.year ??
            0
          ),
        genre: "Anime",
        genres:
          details?.genres ??
          item?.genres ??
          [],
        status:
          details?.status ??
          item?.status ??
          "Unknown",
        synopsis:
          details?.overview ??
          item?.overview ??
          item?.show?.overview ??
          "",
        tags: [],
        isNew: false,
        featured: false,
        countryOfOrigin: details?.country || item?.country || item?.show?.country || undefined,
      });
    }

    return results;
  } catch (error) {
    console.error("[SIMKL SEARCH FAILED]", error);
    throw error;
  }
}

/**
 * Fetch trending/most-watched anime from Simkl.
 * Uses /anime/best/most-watched endpoint which requires no auth.
 */
export async function getSimklTrending(): Promise<any[]> {
  try {
    logDebug(`Fetching Simkl trending anime...`);
    const raw = await fetchSimklApi("/anime/best/most-watched");
    if (Array.isArray(raw) && raw.length > 0) {
      logDebug(`↳ Loaded ${raw.length} trending anime from Simkl`);
      return raw;
    }
    logDebug(`↳ Trending response empty or not an array`);
    return [];
  } catch (e) {
    logDebug(`↳ Failed to fetch trending: ${e instanceof Error ? e.message : e}`);
    return [];
  }
}

export async function getSimklDetail(id: string): Promise<any> {
  try {
    logDebug(`↳ Trying /anime/${id}...`);
    const raw = await fetchSimklApi(`/anime/${id}?extended=full`);
    const coverage = generateSimklCoverage(raw);
    const loadedCount = coverage.filter(f => f.hasData).length;
    logDebug(`↓\nMetadata Fields Loaded: ${loadedCount}/18`);
    return raw;
  } catch (err) {
    logDebug(`↳ /anime/${id} failed. Trying /shows/${id}...`);
    try {
      const raw = await fetchSimklApi(`/shows/${id}?extended=full`);
      const coverage = generateSimklCoverage(raw);
      const loadedCount = coverage.filter(f => f.hasData).length;
      logDebug(`↓\nMetadata Fields Loaded: ${loadedCount}/18`);
      return raw;
    } catch (showsErr) {
      logDebug(`↳ /shows/${id} failed. Trying /movies/${id}...`);
      try {
        const raw = await fetchSimklApi(`/movies/${id}?extended=full`);
        const coverage = generateSimklCoverage(raw);
        const loadedCount = coverage.filter(f => f.hasData).length;
        logDebug(`↓\nMetadata Fields Loaded: ${loadedCount}/18`);
        return raw;
      } catch (moviesErr) {
        logDebug(`↳ All detail endpoints failed for ID ${id}`);
        return null;
      }
    }
  }
}

export async function getSimklEpisodes(id: string): Promise<any[]> {
  try {
    logDebug(`↳ Trying /anime/episodes/${id}...`);
    const raw = await fetchSimklApi(`/anime/episodes/${id}?extended=full`);
    logDebug(`↓\nEpisodes Loaded from /anime/episodes/${id}`);
    
    if (raw && raw.length > 0) {
      console.log("[SIMKL FIRST EPISODE RAW]", JSON.stringify(raw[0], null, 2));
      logDebug(`FIRST EPISODE:\n${JSON.stringify(raw[0], null, 2)}`);
    }

    if (!Array.isArray(raw)) {
      logDebug("↳ SIMKL episode response is not an array");
      return [];
    }

    const normalized = raw.map((ep: any) => {
      const rawImgVal = ep.image ?? ep.img ?? ep.thumbnail ?? ep.poster ?? ep.images?.thumbnail ?? ep.images?.poster ?? "";
      const imgVal = getEpisodeImgUrl(rawImgVal);
      return {
        ...ep,
        season: Number(ep.season ?? ep.tvdb?.season ?? ep.ids?.tvdb?.season ?? 1),
        episode: Number(ep.episode ?? ep.episode_number ?? ep.number ?? 0),
        title: ep.title ?? ep.name ?? `Episode ${ep.episode ?? ep.number ?? ""}`,
        overview: ep.overview ?? ep.description ?? "",
        img: imgVal,
        image: imgVal,
        air_date: ep.air_date ?? ep.date ?? null,
      };
    });

    logDebug(`↳ Normalized ${normalized.length} episodes`);
    logDebug(`↳ Thumbnail coverage: ${normalized.filter((ep) => !!ep.image).length}/${normalized.length}`);
    return normalized;
  } catch (err) {
    logDebug(`↳ /anime/episodes/${id} failed. Trying /shows/episodes/${id}...`);
    try {
      const raw = await fetchSimklApi(`/shows/episodes/${id}?extended=full`);
      if (raw && raw.length > 0) {
        console.log("[SIMKL FIRST EPISODE RAW]", JSON.stringify(raw[0], null, 2));
        logDebug(`FIRST EPISODE:\n${JSON.stringify(raw[0], null, 2)}`);
      }
      if (!Array.isArray(raw)) return [];
      return raw.map((ep: any) => {
        const rawImgVal = ep.image ?? ep.img ?? ep.thumbnail ?? ep.poster ?? ep.images?.thumbnail ?? ep.images?.poster ?? "";
        const imgVal = getEpisodeImgUrl(rawImgVal);
        return {
          ...ep,
          season: Number(ep.season ?? ep.tvdb?.season ?? 1),
          episode: Number(ep.episode ?? ep.episode_number ?? ep.number ?? 0),
          title: ep.title ?? ep.name ?? `Episode ${ep.episode ?? ep.number ?? ""}`,
          img: imgVal,
          image: imgVal,
          overview: ep.overview ?? ep.description ?? "",
          air_date: ep.air_date ?? ep.date ?? null,
        };
      });
    } catch {
      logDebug(`↳ SIMKL episode fallback failed.`);
      return [];
    }
  }
}

export function generateSimklCoverage(raw: any, dbAnime?: any): any[] {
  const getVal = (val: any, fallbackVal?: any) => {
    const finalVal = (val !== undefined && val !== null && val !== "") ? val : fallbackVal;
    return (finalVal !== undefined && finalVal !== null && finalVal !== "" ? String(finalVal) : "Missing from Simkl response");
  };
  const hasVal = (val: any, fallbackVal?: any) => {
    const finalVal = (val !== undefined && val !== null && val !== "") ? val : fallbackVal;
    return (finalVal !== undefined && finalVal !== null && finalVal !== "" && finalVal !== "Missing from Simkl response");
  };

  return [
    { field: "Title", traktValue: getVal(raw.title, dbAnime?.title), hasData: hasVal(raw.title, dbAnime?.title) },
    { field: "Original Title", traktValue: getVal(raw.title_en || raw.original_title), hasData: hasVal(raw.title_en || raw.original_title) },
    { field: "Overview", traktValue: getVal(raw.overview, dbAnime?.synopsis), hasData: hasVal(raw.overview, dbAnime?.synopsis) },
    { field: "Genres", traktValue: raw.genres && raw.genres.length > 0 ? raw.genres.join(", ") : (dbAnime?.genres?.length ? dbAnime.genres.join(", ") : "Missing from Simkl response"), hasData: !!(raw.genres && raw.genres.length > 0 || dbAnime?.genres?.length) },
    { field: "Status", traktValue: getVal(raw.status, dbAnime?.status), hasData: hasVal(raw.status, dbAnime?.status) },
    { field: "Runtime", traktValue: getVal(raw.runtime), hasData: hasVal(raw.runtime) },
    { field: "Episode Count", traktValue: getVal(raw.episodes_count || raw.total_episodes, dbAnime?.episodes), hasData: hasVal(raw.episodes_count || raw.total_episodes, dbAnime?.episodes) },
    { field: "Season Count", traktValue: getVal(raw.seasons_count), hasData: hasVal(raw.seasons_count) },
    { field: "Poster Image", traktValue: raw.poster ? getPosterUrl(raw.poster) : (dbAnime?.image || "Missing from Simkl response"), hasData: !!(raw.poster || dbAnime?.image) },
    { field: "Fanart Image", traktValue: raw.fanart ? getFanartUrl(raw.fanart) : (dbAnime?.banner_url || "Missing from Simkl response"), hasData: !!(raw.fanart || dbAnime?.banner_url) },
    { field: "Rating", traktValue: getVal(raw.ratings?.simkl?.rating, dbAnime?.rating), hasData: hasVal(raw.ratings?.simkl?.rating, dbAnime?.rating) },
    { field: "Votes", traktValue: getVal(raw.ratings?.simkl?.votes), hasData: hasVal(raw.ratings?.simkl?.votes) },
    { field: "Release Year", traktValue: getVal(raw.year, dbAnime?.year), hasData: hasVal(raw.year, dbAnime?.year) },
    { field: "Simkl ID", traktValue: getVal(raw.ids?.simkl, dbAnime?.simkl_id), hasData: hasVal(raw.ids?.simkl, dbAnime?.simkl_id) },
    { field: "TMDB ID", traktValue: getVal(raw.ids?.tmdb, dbAnime?.tmdb_id), hasData: hasVal(raw.ids?.tmdb, dbAnime?.tmdb_id) },
    { field: "TVDB ID", traktValue: getVal(raw.ids?.tvdb, dbAnime?.tvdb_id), hasData: hasVal(raw.ids?.tvdb, dbAnime?.tvdb_id) },
    { field: "AniList ID", traktValue: getVal(raw.ids?.anilist, dbAnime?.anilist_id), hasData: hasVal(raw.ids?.anilist, dbAnime?.anilist_id) },
    { field: "MAL ID", traktValue: getVal(raw.ids?.mal, dbAnime?.mal_id), hasData: hasVal(raw.ids?.mal, dbAnime?.mal_id) },
  ];
}

/**
 * Update the Watchlist status of an Anime on Simkl.
 * Gated by RateLimiter queue (1 request per second max).
 */
export async function updateSimklWatchlistStatus(
  accessToken: string,
  aniListIdOrSimklId: string | number,
  status: "watching" | "plantowatch" | "completed" | "hold" | "dropped",
  isAniListId = true
): Promise<any> {
  const idKey = isAniListId ? "anilist" : "simkl";
  const payload = {
    to: status,
    anime: [
      {
        ids: {
          [idKey]: Number(aniListIdOrSimklId)
        }
      }
    ]
  };

  return postLimiter.enqueue(() =>
    fetchSimklApi("/sync/add-to-list", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

/**
 * Sync an episode watch event to Simkl history.
 * Gated by RateLimiter queue (1 request per second max).
 */
export async function addSimklEpisodeToHistory(
  accessToken: string,
  aniListIdOrSimklId: string | number,
  episodeNumber: number,
  isAniListId = true
): Promise<any> {
  const idKey = isAniListId ? "anilist" : "simkl";
  const payload = {
    anime: [
      {
        ids: {
          [idKey]: Number(aniListIdOrSimklId)
        },
        episodes: [
          {
            number: episodeNumber,
            watched_at: new Date().toISOString()
          }
        ]
      }
    ]
  };

  return postLimiter.enqueue(() =>
    fetchSimklApi("/sync/history", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

/**
 * Remove an episode watch event from Simkl history.
 * Gated by RateLimiter queue (1 request per second max).
 */
export async function removeSimklEpisodeFromHistory(
  accessToken: string,
  aniListIdOrSimklId: string | number,
  episodeNumber: number,
  isAniListId = true
): Promise<any> {
  const idKey = isAniListId ? "anilist" : "simkl";
  const payload = {
    anime: [
      {
        ids: {
          [idKey]: Number(aniListIdOrSimklId)
        },
        episodes: [
          {
            number: episodeNumber
          }
        ]
      }
    ]
  };

  return postLimiter.enqueue(() =>
    fetchSimklApi("/sync/history/remove", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

/**
 * Fetch the user's full anime watchlist and history from Simkl.
 */
export async function fetchSimklWatchlist(accessToken: string): Promise<any> {
  return fetchSimklApi("/sync/all-items/anime?extended=full&episode_watched_at=yes", accessToken);
}

/**
 * Report scrobble playback status to Simkl.
 * Gated by RateLimiter queue (1 request per second max).
 */
export async function scrobbleSimkl(
  accessToken: string,
  action: "start" | "pause" | "stop",
  aniListIdOrSimklId: string | number,
  episodeNumber: number,
  progressPercent: number, // 0 to 100
  isAniListId = true
): Promise<any> {
  const idKey = isAniListId ? "anilist" : "simkl";
  const payload = {
    show: {
      ids: {
        [idKey]: Number(aniListIdOrSimklId)
      }
    },
    episode: {
      number: episodeNumber
    },
    progress: Math.min(100, Math.max(0, progressPercent))
  };

  return postLimiter.enqueue(() =>
    fetchSimklApi(`/scrobble/${action}`, accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

/**
 * Perform a delta-check sync of the user's Simkl watchlist.
 * Checks /sync/activities first. If unchanged, skips pulling the full watchlist.
 */
export async function syncUserLibraryWithSimkl(accessToken: string): Promise<{
  synced: boolean;
  message: string;
  watchlist?: any[];
}> {
  try {
    // 1. Fetch activities
    const activities = await fetchSimklApi("/sync/activities", accessToken);
    const latestTimestamp = activities?.anime?.all || activities?.all || "";
    
    if (!latestTimestamp) {
      return { synced: false, message: "Could not retrieve activity timestamps." };
    }

    // 2. Compare with last sync timestamp
    const lastSync = localStorage.getItem("simkl_last_sync_timestamp");
    if (lastSync && lastSync === latestTimestamp) {
      // Return cached watchlist if available
      const cached = localStorage.getItem("simkl_cached_watchlist");
      return { 
        synced: false, 
        message: "Watchlist is already up to date. No changes detected.",
        watchlist: cached ? JSON.parse(cached) : []
      };
    }

    // 3. Pull full watchlist
    const watchlistRes = await fetchSimklWatchlist(accessToken);
    const watchlistItems = watchlistRes?.anime || [];

    // Save timestamp
    localStorage.setItem("simkl_last_sync_timestamp", latestTimestamp);

    // Save cached watchlist to localStorage for fast page loads
    localStorage.setItem("simkl_cached_watchlist", JSON.stringify(watchlistItems));

    return {
      synced: true,
      message: `Successfully synchronized ${watchlistItems.length} items from Simkl.`,
      watchlist: watchlistItems
    };
  } catch (err: any) {
    console.error("Simkl library sync failed:", err);
    return { synced: false, message: err.message || "Synchronization failed." };
  }
}

export function mapSimklToLocalStatus(status: string): string {
  switch (status) {
    case "plantowatch": return "plan_to_watch";
    case "watching": return "watching";
    case "completed": return "completed";
    case "hold": return "on_hold";
    case "dropped": return "dropped";
    default: return "plan_to_watch";
  }
}

export function mapLocalToSimklStatus(status: string): "watching" | "plantowatch" | "completed" | "hold" | "dropped" {
  switch (status) {
    case "plan_to_watch": return "plantowatch";
    case "watching": return "watching";
    case "completed": return "completed";
    case "on_hold": return "hold";
    case "dropped": return "dropped";
    default: return "plantowatch";
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Fetch and map upcoming anime calendar releases from Simkl static CDN.
 */
export async function getSimklCalendarSchedule(): Promise<any[]> {
  try {
    const res = await fetch("https://data.simkl.in/calendar/anime.json");
    if (!res.ok) throw new Error("Failed to fetch Simkl calendar");
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    // Filter items within 3 days ago to 7 days from now to keep it relevant and performant
    const nowEpoch = Date.now();
    const startLimit = nowEpoch - 3 * 24 * 60 * 60 * 1000;
    const endLimit = nowEpoch + 7 * 24 * 60 * 60 * 1000;

    return data
      .filter((item: any) => {
        if (!item.date) return false;
        const time = new Date(item.date).getTime();
        return time >= startLimit && time <= endLimit;
      })
      .map((item: any, idx: number) => {
        const airingDate = new Date(item.date);
        const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(airingDate);
        const airTime = airingDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });

        const aniListId = Number(item.anime?.ids?.anilist || 0);
        let localId = aniListId || Math.abs(hashCode(String(item.anime?.ids?.simkl || idx)));
        for (const [lId, aId] of Object.entries(anilistDonghuaMap)) {
          if (aId === aniListId) {
            localId = Number(lId);
            break;
          }
        }

        const posterUrl = item.anime?.poster 
          ? normalizeSimklImageUrl(item.anime.poster, "posters")
          : "";

        return {
          id: item.anime?.ids?.simkl || idx,
          day_of_week: dayOfWeek,
          air_time: airTime,
          episode_number: item.episode || 1,
          anime: {
            id: localId,
            slug: String(localId),
            title: item.title || item.anime?.title || "Unknown Title",
            poster_url: posterUrl,
            status: "Ongoing",
            rating: item.anime?.ratings?.simkl?.rating ? Number(item.anime.ratings.simkl.rating) : 0,
            synopsis: item.anime?.overview || "",
            studio: "Simkl",
            genres: item.anime?.genres || []
          }
        };
      });
  } catch (err) {
    console.error("[SimklAnime] Failed to fetch calendar schedule:", err);
    return [];
  }
}



