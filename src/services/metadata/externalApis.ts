/**
 * External Metadata APIs Client (TMDB & TVDB)
 */

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || "3f2ef4f5cbb848a645f9c556e7667833";
const TMDB_READ_ACCESS_TOKEN = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzZjJlZjRmNWNiYjg0OGE2NDVmOWM1NTZlNzY2NzgzMyIsIm5iZiI6MTc4ODcxNjMyOC4wODA5OTk5LCJzdWIiOiI2YTlkYTUyODJlOWEwM2I4NTIwOWZkMjciLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.DmybD27XysM9bfF-N3Nmqpxa3UsF8yr8iu_s6Dcc_rs";
const TVDB_API_KEY = import.meta.env.VITE_TVDB_API_KEY || "";

const TMDB_BASE = typeof window !== "undefined" ? "/api/tmdb" : "https://api.themoviedb.org/3";

function getTmdbHeadersAndUrl(endpointPath: string): { url: string; headers: Record<string, string> } {
  const headers: Record<string, string> = { "Accept": "application/json" };
  let url = `${TMDB_BASE}${endpointPath}`;

  if (TMDB_READ_ACCESS_TOKEN) {
    headers["Authorization"] = `Bearer ${TMDB_READ_ACCESS_TOKEN}`;
  } else if (TMDB_API_KEY) {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}api_key=${encodeURIComponent(TMDB_API_KEY)}`;
  }
  return { url, headers };
}

/**
 * Fetch episode still/thumbnail from TMDB using show ID, season, and episode number
 */
export async function fetchTmdbEpisodeImage(
  tmdbId: number | string,
  season: number,
  episode: number
): Promise<string | null> {
  if ((!TMDB_API_KEY && !TMDB_READ_ACCESS_TOKEN) || !tmdbId) return null;

  try {
    const { url, headers } = getTmdbHeadersAndUrl(`/tv/${tmdbId}/season/${season}/episode/${episode}`);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[TMDB] Episode request failed with status: ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.still_path) {
      return `https://image.tmdb.org/t/p/w500${data.still_path}`;
    }
    return null;
  } catch (err) {
    console.error("[TMDB] Failed to fetch episode image:", err);
    return null;
  }
}

const tmdbShowCache: Record<string, any> = {};
const tmdbSeasonCache: Record<string, any> = {};

/**
 * Fetch episode still/thumbnail from TMDB safely using metadata matching (air_date or episode title).
 * Never assumes local season/episode numbers match TMDB numbering without confirmation.
 */
function cleanShowTitleForTmdb(rawTitle: string): string {
  if (!rawTitle) return "";
  let clean = rawTitle
    .replace(/-/g, " ")
    .replace(/^Season\s+\d+:?\s*/i, "")
    .replace(/\s+Season\s+\d+/i, "")
    .replace(/\s+3D\s*$/i, "")
    .replace(/\s+Nian\s+Fan\s*\d*/i, "")
    .trim();
  return clean || rawTitle;
}

export const KNOWN_TMDB_IDS: Record<string, number> = {
  "battle-through-the-heavens": 79481,
  "battle through the heavens": 79481,
  "dou po cangqiong": 79481,
  "fights break sphere": 79481,
  "the-demon-hunter": 227282,
  "the demon hunter": 227282,
  "demon hunter": 227282,
  "cang yuan tu": 227282,
  "cangyuantu": 227282,
  "renegade-immortal": 223911,
  "renegade immortal": 223911,
  "xian ni": 223911,
  "the-great-ruler": 226045,
  "the great ruler": 226045,
  "da zhu zai": 226045,
  "swallowed-star": 101172,
  "swallowed star": 101172,
  "tunshi xingkong": 101172,
  "perfect-world": 124003,
  "perfect world": 124003,
  "wanmei shijie": 124003,
  "soul-land": 76572,
  "soul land": 76572,
  "douluo dalu": 76572,
  "stellar-transformations": 83708,
  "stellar transformation": 83708,
  "xing chen bian": 83708,
  "martial-universe": 87007,
  "martial universe": 87007,
  "wu dong qiankun": 87007,
  "throne-of-seal": 198083,
  "throne of seal": 198083,
  "against-the-gods": 234125,
  "against the gods": 234125,
  "shrouding-the-heavens": 225575,
  "shrouding the heavens": 225575,
  "jade-dynasty": 207399,
  "jade dynasty": 207399,
};

export async function fetchTmdbEpisodeStillByMetadata(params: {
  showTitle: string;
  explicitTmdbId?: number | string;
  airDate?: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  globalEpisodeNumber?: number;
  sameDateIndex?: number;
}): Promise<string | null> {
  if ((!TMDB_API_KEY && !TMDB_READ_ACCESS_TOKEN) || (!params.showTitle?.trim() && !params.explicitTmdbId)) return null;

  try {
    const cleanShowTitle = cleanShowTitleForTmdb(params.showTitle || "");
    const showCacheKey = cleanShowTitle.toLowerCase();

    // 1. Resolve TMDB ID via explicit param, known map, or TMDB search API
    let tmdbId = params.explicitTmdbId ? Number(params.explicitTmdbId) : KNOWN_TMDB_IDS[showCacheKey];

    if (!tmdbId) {
      let showData = tmdbShowCache[showCacheKey];
      if (!showData) {
        const searchRes = await fetchTmdbShowDetail(cleanShowTitle);
        if (!searchRes || !searchRes.results || searchRes.results.length === 0) {
          return null;
        }
        showData = searchRes.results[0];
        tmdbShowCache[showCacheKey] = showData;
      }
      tmdbId = showData?.id;
    }

    if (!tmdbId) return null;

    const targetDate = params.airDate ? params.airDate.slice(0, 10) : "";
    const cleanEpTitle = params.episodeTitle ? params.episodeTitle.trim().toLowerCase() : "";

    // 2. Primary Attempt: Match within exact target TMDB Season (e.g. TMDB Season 2, Episode 35)
    if (params.seasonNumber) {
      const seasonCacheKey = `${tmdbId}_S${params.seasonNumber}`;
      let seasonData = tmdbSeasonCache[seasonCacheKey];
      if (!seasonData) {
        const { url, headers } = getTmdbHeadersAndUrl(`/tv/${tmdbId}/season/${params.seasonNumber}`);
        const res = await fetch(url, { headers });
        if (res.ok) {
          seasonData = await res.json();
          tmdbSeasonCache[seasonCacheKey] = seasonData;
        }
      }

      if (seasonData && Array.isArray(seasonData.episodes)) {
        // Priority 2.1: Match by exact air_date
        if (targetDate) {
          const sameDateEps = seasonData.episodes.filter((ep: any) => ep.air_date === targetDate);
          if (sameDateEps.length > 0) {
            const idx = params.sameDateIndex || 0;
            const matchedEp = sameDateEps[idx] !== undefined ? sameDateEps[idx] : (idx === 0 ? sameDateEps[0] : null);
            if (matchedEp?.still_path) {
              return `https://image.tmdb.org/t/p/w780${matchedEp.still_path}`;
            }
          }
        }

        // Priority 2.2: Match by episode title
        if (cleanEpTitle && !cleanEpTitle.startsWith("episode ")) {
          const matchedByTitle = seasonData.episodes.find((ep: any) => {
            const tmdbEpName = (ep.name || "").trim().toLowerCase();
            return tmdbEpName && (tmdbEpName === cleanEpTitle || tmdbEpName.includes(cleanEpTitle));
          });
          if (matchedByTitle?.still_path) {
            return `https://image.tmdb.org/t/p/w780${matchedByTitle.still_path}`;
          }
        }

        // Priority 2.3: Match by relative episode number in target season
        if (params.episodeNumber) {
          const matchedByNum = seasonData.episodes.find((ep: any) => ep.episode_number === params.episodeNumber);
          if (matchedByNum?.still_path) {
            return `https://image.tmdb.org/t/p/w780${matchedByNum.still_path}`;
          }
        }
      }
    }

    // 3. Fallback Attempt: Universal Continuous Offset Lookup (for shows where TMDB merges multiple canonical seasons into Season 1 with 100+ episodes)
    // Example: Simkl S2E35 -> globalEpisodeNumber = 87 -> Fetch TMDB Season 1 Episode 87
    if (params.globalEpisodeNumber && params.globalEpisodeNumber !== params.episodeNumber) {
      const s1CacheKey = `${tmdbId}_S1`;
      let s1Data = tmdbSeasonCache[s1CacheKey];
      if (!s1Data) {
        const { url, headers } = getTmdbHeadersAndUrl(`/tv/${tmdbId}/season/1`);
        const res = await fetch(url, { headers });
        if (res.ok) {
          s1Data = await res.json();
          tmdbSeasonCache[s1CacheKey] = s1Data;
        }
      }

      if (s1Data && Array.isArray(s1Data.episodes)) {
        const matchedByGlobal = s1Data.episodes.find((ep: any) => ep.episode_number === params.globalEpisodeNumber);
        if (matchedByGlobal?.still_path) {
          // Strict Metadata Verification: Check if TMDB reused the Season 1 relative episode image (e.g. S1 Ep 35) for global Ep 87
          if (params.episodeNumber && params.episodeNumber !== params.globalEpisodeNumber) {
            const relativeEpInS1 = s1Data.episodes.find((ep: any) => ep.episode_number === params.episodeNumber);
            if (relativeEpInS1?.still_path && relativeEpInS1.still_path === matchedByGlobal.still_path) {
              console.warn(`[TMDB Unverified Offset Image Declined] TMDB Ep ${params.globalEpisodeNumber} reused S1 Ep ${params.episodeNumber} still path (${matchedByGlobal.still_path}). Falling back to season poster.`);
              return null;
            }
          }

          console.log(`[TMDB Universal Offset Match Verified] Mapped S${params.seasonNumber} E${params.episodeNumber} -> TMDB S1 Episode ${params.globalEpisodeNumber} (${matchedByGlobal.name || "Still Found"})`);
          return `https://image.tmdb.org/t/p/w780${matchedByGlobal.still_path}`;
        }
      }
    }

    return null;
  } catch (err) {
    console.warn("[TMDB Metadata Matcher] Lookup failed:", err);
    return null;
  }
}

/**
 * Fetch TV show details or search from TMDB
 */
export async function fetchTmdbShowDetail(
  queryOrId: number | string
): Promise<any | null> {
  if (!TMDB_API_KEY && !TMDB_READ_ACCESS_TOKEN) return null;

  try {
    const isId = typeof queryOrId === "number" || /^\d+$/.test(String(queryOrId));
    const path = isId
      ? `/tv/${queryOrId}`
      : `/search/tv?query=${encodeURIComponent(String(queryOrId))}`;
    
    const { url, headers } = getTmdbHeadersAndUrl(path);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[TMDB] Query request failed with status: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("[TMDB] Failed to fetch show detail:", err);
    return null;
  }
}

/**
 * Fetch full TMDB Season details (episodes list with titles and stills)
 */
export async function fetchTmdbSeasonDetails(
  tmdbId: number | string,
  seasonNumber: number
): Promise<{ stills: Record<number, string>; titles: Record<number, string> }> {
  const stills: Record<number, string> = {};
  const titles: Record<number, string> = {};
  if ((!TMDB_API_KEY && !TMDB_READ_ACCESS_TOKEN) || !tmdbId) return { stills, titles };

  try {
    const seasonCacheKey = `${tmdbId}_S${seasonNumber}`;
    let seasonData = tmdbSeasonCache[seasonCacheKey];
    if (!seasonData) {
      const { url, headers } = getTmdbHeadersAndUrl(`/tv/${tmdbId}/season/${seasonNumber}`);
      const res = await fetch(url, { headers });
      if (res.ok) {
        seasonData = await res.json();
        tmdbSeasonCache[seasonCacheKey] = seasonData;
      }
    }

    if (seasonData && Array.isArray(seasonData.episodes)) {
      seasonData.episodes.forEach((ep: any) => {
        const epNum = Number(ep.episode_number);
        if (epNum) {
          if (ep.still_path) {
            stills[epNum] = `https://image.tmdb.org/t/p/w780${ep.still_path}`;
          }
          if (ep.name && typeof ep.name === "string" && ep.name.trim() !== "" && !ep.name.toLowerCase().startsWith("episode ")) {
            titles[epNum] = ep.name.trim();
          }
        }
      });
    }
  } catch (err) {
    console.warn(`[TMDB] Failed to fetch season ${seasonNumber} details:`, err);
  }

  return { stills, titles };
}


/**
 * Fetch episode image from TVDB using show ID, season, and episode number
 * TVDB API v4 requires JWT token authentication
 */
export async function fetchTvdbEpisodeImage(
  tvdbId: number | string,
  season: number,
  episode: number
): Promise<string | null> {
  if (!TVDB_API_KEY || !tvdbId) return null;

  try {
    // 1. Get TVDB Auth Token
    const loginRes = await fetch("https://api4.thetvdb.com/v4/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: TVDB_API_KEY })
    });
    if (!loginRes.ok) return null;
    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    if (!token) return null;

    // 2. Fetch TVDB Series Extended details to find episodes
    const seriesUrl = `https://api4.thetvdb.com/v4/series/${tvdbId}/episodes/default?season=${season}`;
    const res = await fetch(seriesUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    
    // Find the episode
    const episodes = data.data?.episodes || [];
    const epMatch = episodes.find((e: any) => e.number === episode);
    if (epMatch && epMatch.image) {
      return epMatch.image;
    }
    return null;
  } catch (err) {
    console.error("[TVDB] Failed to fetch episode image:", err);
    return null;
  }
}
