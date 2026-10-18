/**
 * Unified Metadata Provider
 * 
 * Delegates to either the default (Supabase + local) services,
 * the Trakt API services, the AniList GraphQL services, or Sanka APIs based on VITE_METADATA_PROVIDER.
 * 
 * This is the ONLY file that useAnimeQueries.ts needs to import from.
 * All existing service files remain completely untouched.
 */

import { isTraktEnabled } from "@/config/trakt";

// Default providers (existing)
import * as defaultAnime from "@/services/anime";
import * as defaultEpisodes from "@/services/episodes";

// Trakt provider (new)
import * as traktAnime from "@/services/traktAnime";

// AniList provider (new)
import * as anilistAnime from "@/services/anilistAnime";
import { getAniListId, getCleanCoverUrl } from "@/data/anilistDonghuaMap";
import { findUniverseBySlug } from "@/data/universeData";

// Sanka providers (new)
import * as sankaAnime from "@/services/sankaAnime";

// OMDb provider (new)
import * as omdbAnime from "@/services/omdbAnime";

// Bangumi provider (new)
import * as bangumiAnime from "@/services/bangumiAnime";

// Fandom/MediaWiki provider (new)
import * as fandomAnime from "@/services/fandomAnime";

// Simkl provider (new)
import * as simklAnime from "@/services/simklAnime";
import { isChineseDonghua } from "@/services/donghuaFilter";
import type { Anime } from "@/types/anime";
import type { EpisodeMetadata, VideoServer, SubtitleTrack } from "@/services/episodes";
import type { Character, Realm } from "@/services/anime";

// ─── Re-export types so consumers don't need to change imports ───
export type { EpisodeMetadata, VideoServer, SubtitleTrack } from "@/services/episodes";
export type { Character, Realm } from "@/services/anime";

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

// ─── Provider Feature Flags ─────────────────────────────────

export function isAniListEnabled(): boolean {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";
  return provider === "anilist" || provider === "default";
}

export function isSankaDonghuaEnabled(): boolean {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";
  return provider === "sanka-donghua";
}

export function isSankaDonghubEnabled(): boolean {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";
  return provider === "sanka-donghub";
}

export function isOmdbEnabled(): boolean {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";
  return provider === "omdb";
}

export function isBangumiEnabled(): boolean {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";
  return provider === "bangumi";
}

export function isFandomEnabled(): boolean {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";
  return provider === "fandom";
}

export function isSimklEnabled(): boolean {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";
  return provider === "simkl" || provider === "default";
}

// ─── Catalog Queries ────────────────────────────────────────

export async function fetchAnimeCatalog(
  filters?: { search?: string; genre?: string; year?: number; status?: string; limit?: number },
  signal?: AbortSignal
): Promise<Anime[]> {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";

  if (provider === "trakt" && isTraktEnabled()) {
    return traktAnime.traktGetCatalog(filters?.limit || 20);
  }

  if (provider === "sanka-donghua") {
    return sankaAnime.searchSankaDonghua(filters?.search || "a");
  }

  if (provider === "sanka-donghub") {
    return sankaAnime.searchSankaDonghub(filters?.search || "a");
  }

  if (provider === "omdb") {
    return omdbAnime.searchOmdb(filters?.search || "soul");
  }

  if (provider === "bangumi") {
    return bangumiAnime.searchBangumi(filters?.search || "soul");
  }

  if (provider === "fandom") {
    const sub = localStorage.getItem("fandom-subdomain") || "soulland";
    return fandomAnime.searchFandom(sub, filters?.search || "soul");
  }

  if (provider === "simkl") {
    return simklAnime.searchSimkl(filters?.search || "soul");
  }

  // Default mode: query Supabase catalog first
  const dbCatalog = await defaultAnime.fetchAnimeCatalog(filters, signal);
  const rawList = (dbCatalog && dbCatalog.length > 0) ? dbCatalog : await defaultAnime.fetchAnimeCatalog(filters, signal);

  return rawList.map(anime => {
    const cleanCover = getCleanCoverUrl(anime.slug) || (anime.anilistId ? getCleanCoverUrl(anime.anilistId) : getCleanCoverUrl(anime.id));
    if (cleanCover) {
      return { ...anime, image: cleanCover };
    }
    return anime;
  });
}

// ─── Anime Detail Query ─────────────────────────────────────

export async function fetchAnimeBySlug(
  slugOrId: string,
  signal?: AbortSignal
): Promise<Anime | null> {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";

  if (provider === "trakt" && isTraktEnabled()) {
    return traktAnime.traktGetShowBySlug(slugOrId);
  }

  // 1. Fetch normalized Supabase data (last-known-good cache)
  const dbAnime = await defaultAnime.fetchAnimeBySlug(slugOrId, signal);

  // 2. Fetch external details from AniList as primary catalog
  let aniListAnime: Anime | null = null;
  if (isAniListEnabled()) {
    try {
      const numericId = Number(slugOrId);
      let aniListId: number | null = null;
      if (!isNaN(numericId)) {
        aniListId = getAniListId(numericId) || numericId;
      } else if (dbAnime?.anilistId) {
        aniListId = dbAnime.anilistId;
      } else if (dbAnime) {
        aniListId = getAniListId(dbAnime.id);
      }
      
      if (aniListId) {
        aniListAnime = await anilistAnime.anilistGetShow(aniListId, signal);
      } else {
        const searchTitle = dbAnime?.originalTitle || dbAnime?.title || slugOrId;
        const searchResults = await anilistAnime.anilistSearchShows(searchTitle, 1, signal);
        if (searchResults && searchResults.length > 0) {
          aniListAnime = searchResults[0];
        }
      }
    } catch (e) {
      console.warn("[MetadataProvider] AniList fetch failed:", e);
    }
  }

  // 3. Simkl lookup (mainly for fallback images and IDs)
  let simklAnimeData: any = null;
  if (isSimklEnabled()) {
    try {
      const aniListId = aniListAnime?.anilistId || dbAnime?.anilistId || (dbAnime ? getAniListId(dbAnime.id) : null);
      let simklId: string | null = dbAnime?.simklId ? String(dbAnime.simklId) : null;
      if (!simklId && aniListId) {
        simklId = await simklAnime.searchSimklById({ anilist: String(aniListId) });
      }
      if (!simklId) {
        const searchTitle = dbAnime?.title || aniListAnime?.title || slugOrId;
        const results = await simklAnime.searchSimkl(searchTitle);
        if (results && results.length > 0) {
          simklId = String(results[0].id);
        }
      }
      if (simklId) {
        simklAnimeData = await simklAnime.getSimklDetail(simklId);
      }
    } catch (e) {
      console.warn("[MetadataProvider] Simkl fetch failed:", e);
    }
  }

  // If we have neither dbAnime nor external data, check Universe registry or default catalog fallbacks
  if (!dbAnime && !aniListAnime && !simklAnimeData) {
    // Check static Universe registry for installment slugs or titles
    const uni = findUniverseBySlug(slugOrId);
    if (uni) {
      return {
        id: typeof uni.id === "number" ? uni.id : Math.abs(hashCode(uni.slug)),
        slug: uni.slug,
        title: uni.title,
        image: uni.cover || "",
        banner: uni.banner || uni.cover || "",
        rating: uni.statistics?.score || 9.0,
        episodes: uni.statistics?.totalEpisodes || 157,
        year: 2024,
        genre: uni.genres?.[0] || "Cultivation",
        genres: uni.genres || [],
        status: "Ongoing",
        synopsis: uni.description || "",
        tags: uni.genres || [],
        isNew: false,
        featured: true,
      };
    }

    if (isSankaDonghuaEnabled()) {
      const sankaSlug = dbAnime?.donghuaApiSlug || slugOrId;
      try {
        const raw = await sankaAnime.getSankaDonghuaDetail(sankaSlug, signal);
        if (raw) {
          return {
            id: Math.abs(hashCode(sankaSlug)),
            slug: sankaSlug,
            title: raw.title,
            originalTitle: raw.alter_title || undefined,
            image: raw.poster,
            rating: parseFloat(raw.rating) || 0,
            episodes: parseInt(raw.episodes_count) || 0,
            year: parseInt(raw.season) || 0,
            genre: raw.genres?.[0]?.name || "Donghua",
            genres: (raw.genres || []).map((g: any) => g.name),
            status: raw.status === "Ongoing" ? "Ongoing" : "Completed",
            synopsis: raw.synopsis || "",
            tags: (raw.genres || []).map((g: any) => g.name).slice(0, 4),
            isNew: false,
            featured: false,
          };
        }
      } catch {}
    }
    const defaultRes = await defaultAnime.fetchAnimeBySlug(slugOrId, signal);
    if (defaultRes) return defaultRes;

    // Additional fuzzy fallback against local catalog
    const localCatalogRes = (await defaultAnime.fetchAnimeCatalog({}, signal)).find(a =>
      a.slug === slugOrId ||
      String(a.id) === slugOrId ||
      a.slug.toLowerCase().includes(slugOrId.toLowerCase()) ||
      slugOrId.toLowerCase().includes(a.slug.toLowerCase())
    );
    if (localCatalogRes) return localCatalogRes;

    return null;
  }

  // Field-level fallback resolution:
  // Poster: AniList -> Supabase existing value -> Simkl
  let resolvedPoster = "";
  if (aniListAnime?.image) {
    resolvedPoster = aniListAnime.image;
  } else if (dbAnime?.image) {
    resolvedPoster = dbAnime.image;
  } else if (simklAnimeData?.poster) {
    resolvedPoster = simklAnime.getHighResSimklImage(simklAnimeData.poster);
  }

  // Banner: AniList -> Supabase existing value -> Simkl
  let resolvedBanner = "";
  if (aniListAnime?.banner) {
    resolvedBanner = aniListAnime.banner;
  } else if (dbAnime?.banner) {
    resolvedBanner = dbAnime.banner;
  } else if (simklAnimeData?.fanart) {
    resolvedBanner = simklAnime.getHighResSimklImage(simklAnimeData.fanart);
  }

  const resolvedTitle = aniListAnime?.title || dbAnime?.title || simklAnimeData?.title || slugOrId;
  const resolvedOriginalTitle = aniListAnime?.originalTitle || dbAnime?.originalTitle || simklAnimeData?.title_zh || simklAnimeData?.title_cn;

  return {
    id: dbAnime?.id ?? aniListAnime?.id ?? Math.abs(hashCode(slugOrId)),
    slug: dbAnime?.slug ?? aniListAnime?.slug ?? slugOrId,
    title: resolvedTitle,
    originalTitle: resolvedOriginalTitle,
    image: resolvedPoster,
    banner: resolvedBanner,
    rating: aniListAnime?.rating ?? dbAnime?.rating ?? simklAnimeData?.ratings?.simkl?.rating ?? 0,
    episodes: aniListAnime?.episodes ?? dbAnime?.episodes ?? simklAnimeData?.episodes_count ?? 0,
    year: aniListAnime?.year ?? dbAnime?.year ?? simklAnimeData?.year ?? 0,
    genre: aniListAnime?.genre ?? dbAnime?.genre ?? (simklAnimeData?.genres?.[0] || "Donghua"),
    genres: aniListAnime?.genres ?? dbAnime?.genres ?? simklAnimeData?.genres ?? [],
    status: aniListAnime?.status ?? dbAnime?.status ?? (simklAnimeData?.status === "airing" ? "Ongoing" : "Completed"),
    synopsis: aniListAnime?.synopsis ?? dbAnime?.synopsis ?? simklAnimeData?.overview ?? "",
    tags: aniListAnime?.tags ?? dbAnime?.tags ?? simklAnimeData?.genres ?? [],
    isNew: dbAnime?.isNew ?? false,
    featured: dbAnime?.featured ?? false,
    simklId: dbAnime?.simklId ?? simklAnimeData?.id,
    anilistId: dbAnime?.anilistId ?? aniListAnime?.id,
  };
}

// ─── Related Anime ───────────────────────────────────────

export async function fetchRelatedAnime(
  animeId: number,
  limit = 4,
  signal?: AbortSignal
): Promise<Anime[]> {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";

  if (provider === "trakt" && isTraktEnabled()) {
    return traktAnime.traktGetRelated(animeId, limit);
  }

  const all = await fetchAnimeCatalog({ limit: 50 }, signal);
  return all.filter((a) => a.id !== animeId).slice(0, limit);
}

// ─── Characters Query ─────────────────────────────────────

export async function fetchCharacters(
  animeId: number,
  signal?: AbortSignal
): Promise<Character[]> {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";

  if (provider === "trakt" && isTraktEnabled()) {
    return traktAnime.traktGetCharacters(animeId);
  }

  // Try Supabase first
  const dbChars = await defaultAnime.fetchCharacters(animeId, signal);
  if (dbChars && dbChars.length > 0) return dbChars;

  // AniList fallback for characters
  if (isAniListEnabled()) {
    try {
      const aniListId = getAniListId(animeId) || animeId;
      const chars = await anilistAnime.anilistGetCharacters(aniListId, signal);
      if (chars && chars.length > 0) return chars;
    } catch (e) {
      console.warn("[MetadataProvider] AniList characters fetch failed:", e);
    }
  }

  return defaultAnime.fetchCharacters(animeId, signal);
}

// ─── Episodes Query ───────────────────────────────────────

export async function fetchEpisodes(
  animeId: number,
  signal?: AbortSignal
): Promise<EpisodeMetadata[]> {
  const provider = localStorage.getItem("donghua-metadata-provider") || import.meta.env.VITE_METADATA_PROVIDER || "default";

  if (provider === "trakt" && isTraktEnabled()) {
    return traktAnime.traktGetEpisodes(animeId);
  }

  if (provider === "sanka-donghua") {
    const localAnime = await defaultAnime.fetchAnimeBySlug(String(animeId), signal);
    const slugKey = localAnime?.donghuaApiSlug || String(animeId);
    const eps = await sankaAnime.getSankaDonghuaEpisodes(slugKey, signal);
    if (eps.length > 0) return eps;
  }

  // Default mode: Priority hierarchy for episode metadata
  // 1. Database episodes (Supabase)
  let dbEps: EpisodeMetadata[] = [];
  try {
    dbEps = await defaultEpisodes.fetchEpisodes(animeId);
  } catch (err) {
    console.warn("[MetadataProvider] Supabase episode fetch failed, falling back to providers:", err);
  }

  // 2. Fetch from Simkl (primary for episodes)
  let simklEps: any[] = [];
  const localAnime = await defaultAnime.fetchAnimeBySlug(String(animeId), signal);
  const aniListId = localAnime ? (getAniListId(localAnime.id) || localAnime.anilistId) : null;
  const simklId = localAnime?.simklId || (aniListId ? await simklAnime.searchSimklById({ anilist: String(aniListId) }) : null);

  if (isSimklEnabled() && simklId) {
    try {
      const fetched = await simklAnime.getSimklEpisodes(simklId);
      if (fetched && fetched.length > 0) {
        simklEps = fetched;
      }
    } catch (e) {
      console.warn("[MetadataProvider] Simkl episodes empty or failed:", e);
    }
  }

  // 3. Fetch from AniList (for fallback dates/titles)
  let aniListEps: any[] = [];
  if (isAniListEnabled() && aniListId) {
    try {
      const fetched = await anilistAnime.anilistGetAllEpisodes(animeId, aniListId, signal);
      if (fetched && fetched.length > 0) {
        aniListEps = fetched;
      }
    } catch (e) {
      console.warn("[MetadataProvider] AniList episodes empty or failed:", e);
    }
  }

  // 4. Combine results with field-specific fallbacks
  const maxEpsCount = Math.max(simklEps.length, dbEps.length, aniListEps.length);
  if (maxEpsCount > 0) {
    const combined: EpisodeMetadata[] = [];
    for (let i = 1; i <= maxEpsCount; i++) {
      const simklEp = simklEps.find(e => e.episode === i);
      const dbEp = dbEps.find(e => e.episode_number === i);
      const aniListEp = aniListEps.find(e => e.episode_number === i);

      if (!simklEp && !dbEp && !aniListEp) continue;

      // Resolve Title
      const title = simklEp?.title || dbEp?.title || aniListEp?.title || `Episode ${i}`;

      // Resolve Thumbnail
      // Episode image: Simkl -> existing Supabase value -> season/series fallback
      let thumbnail = "";
      if (simklEp?.img) {
        thumbnail = simklAnime.getHighResSimklImage(simklEp.img);
      } else if (dbEp?.thumbnail_url) {
        thumbnail = dbEp.thumbnail_url;
      } else {
        thumbnail = localAnime?.image || ""; // fallback to series poster
      }

      // Resolve Air Date
      // Episode air date: Simkl -> AniList -> existing Supabase value
      let airDate = "";
      if (simklEp?.date) {
        airDate = simklEp.date;
      } else if (aniListEp?.air_date) {
        airDate = aniListEp.air_date;
      } else if (dbEp?.air_date) {
        airDate = dbEp.air_date;
      }

      combined.push({
        id: dbEp?.id || animeId * 1000 + i,
        anime_id: animeId,
        episode_number: i,
        title,
        description: simklEp?.overview || dbEp?.description || aniListEp?.description || `Watch episode ${i} of this Donghua.`,
        thumbnail_url: thumbnail,
        duration: dbEp?.duration || "24 min",
        is_filler: dbEp?.is_filler || false,
        air_date: airDate,
        air_time: simklEp?.air_time || dbEp?.air_time || undefined,
        simklId: simklEp?.id || dbEp?.simklId || undefined,
        simkl_id: simklEp?.id || dbEp?.simkl_id || undefined,
      });
    }
    return combined;
  }

  // Optional emergency fallback to Sanka if everything else failed
  if (isSankaDonghuaEnabled() && localAnime?.donghuaApiSlug) {
    try {
      const results = await sankaAnime.getSankaDonghuaEpisodes(localAnime.donghuaApiSlug, signal);
      if (results.length > 0) return results;
    } catch {}
  }

  return defaultEpisodes.fetchEpisodes(animeId);
}

// ─── These services are NOT affected by the API providers ───
export async function fetchEpisodeServers(episodeId: number): Promise<VideoServer[]> {
  return defaultEpisodes.fetchEpisodeServers(episodeId);
}

export async function fetchEpisodeSubtitles(episodeId: number): Promise<SubtitleTrack[]> {
  return defaultEpisodes.fetchEpisodeSubtitles(episodeId);
}

export async function fetchCultivationRealms(animeId: number, signal?: AbortSignal): Promise<Realm[]> {
  if (isFandomEnabled()) {
    try {
      const localAnime = await defaultAnime.fetchAnimeBySlug(String(animeId), signal);
      if (localAnime) {
        const sub = localAnime.wikiSubdomain || fandomAnime.DONGHUA_ALIASES[localAnime.title.toLowerCase()]?.subdomain || "soulland";
        const rawDetail = await fandomAnime.getFandomDetail(sub, "Cultivation Realms");
        if (rawDetail) {
          // Wiki has lore information; for structured realms we fallback to last known good in Supabase/local mock
        }
      }
    } catch (e) {
      console.warn("[MetadataProvider] Wiki realms fetch failed:", e);
    }
  }
  return defaultAnime.fetchCultivationRealms(animeId, signal);
}

export async function fetchUserRatings(userId?: string) {
  return defaultAnime.fetchUserRatings(userId);
}

export async function saveUserRating(animeId: number, score: number, userId?: string) {
  return defaultAnime.saveUserRating(animeId, score, userId);
}

export async function fetchSchedule() {
  return defaultAnime.fetchSchedule();
}

export async function fetchTodayReleases() {
  return defaultAnime.fetchTodayReleases();
}

// Re-export the DB mapper for consumers that need it
export { mapDbToAnime } from "@/services/anime";
