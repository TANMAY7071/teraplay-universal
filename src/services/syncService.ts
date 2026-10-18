import { supabase } from "@/lib/supabase";
import * as anilistAnime from "./anilistAnime";
import * as simklAnime from "./simklAnime";
import { resolveEpisodeThumbnail } from "./metadata/thumbnailResolver";
import { fetchTmdbEpisodeImage, fetchTvdbEpisodeImage } from "./metadata/externalApis";
import { getTmdbEpisodeThumbnail } from "./metadata/tmdbEpisodeImage";

const DONGHUA_API_BASE = "https://www.sankavollerei.web.id/anime/donghua";
const DONGHUB_API_BASE = "https://www.sankavollerei.web.id/anime/donghub";
const ANILIST_API_URL = "https://graphql.anilist.co";

/**
 * Interface for locked fields to prevent overwriting manual edits
 */
interface LockedFields {
  title?: boolean;
  synopsis?: boolean;
  poster?: boolean;
  banner?: boolean;
  genres?: boolean;
  studios?: boolean;
  rating?: boolean;
  status?: boolean;
}

// ------------------------------------------------------------------
// 1. ANILIST METADATA PROVIDER (Highest External Priority)
// ------------------------------------------------------------------

export const searchAniList = async (searchQuery: string) => {
  const query = `
    query ($search: String) {
      Page (page: 1, perPage: 10) {
        media (search: $search, type: ANIME, countryOfOrigin: "CN") {
          id
          title { romaji english native }
          coverImage { large extraLarge }
          bannerImage
          description
          genres
          averageScore
          status
          seasonYear
          format
          studios { nodes { name } }
        }
      }
    }
  `;

  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { search: searchQuery } })
  });
  
  if (!response.ok) throw new Error("AniList search failed");
  const data = await response.json();
  return data.data.Page.media;
};

export const fetchAniListMetadata = async (anilistId: number) => {
  const query = `
    query ($id: Int) {
      Media (id: $id) {
        id
        synonyms
        title { romaji english native }
        coverImage { large extraLarge }
        bannerImage
        description
        genres
        tags { name rank }
        averageScore
        status
        seasonYear
        format
        duration
        episodes
        studios { nodes { name isAnimationStudio } }
      }
    }
  `;

  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { id: anilistId } })
  });

  if (!response.ok) throw new Error("AniList fetch failed");
  const data = await response.json();
  return data.data.Media;
};

// ------------------------------------------------------------------
// 2. DONGHUA API (Episodes & Schedules Provider)
// ------------------------------------------------------------------

export const searchDonghuaApi = async (keyword: string) => {
  const res = await fetch(`${DONGHUA_API_BASE}/search/${encodeURIComponent(keyword)}`);
  if (!res.ok) throw new Error("Donghua API search failed");
  return res.json();
};

export const fetchDonghuaDetails = async (slug: string) => {
  const res = await fetch(`${DONGHUA_API_BASE}/detail/${slug}`);
  if (!res.ok) throw new Error("Donghua API detail failed");
  return res.json();
};

// ------------------------------------------------------------------
// 3. DONGHUB API (Streaming & Downloads Provider)
// ------------------------------------------------------------------

export const searchDonghubApi = async (keyword: string) => {
  const res = await fetch(`${DONGHUB_API_BASE}/search/${encodeURIComponent(keyword)}`);
  if (!res.ok) throw new Error("Donghub API search failed");
  return res.json();
};

export const fetchDonghubEpisodeStreams = async (episodeSlug: string) => {
  const res = await fetch(`${DONGHUB_API_BASE}/episode/${episodeSlug}`);
  if (!res.ok) throw new Error("Donghub API episode stream failed");
  return res.json();
};

// ------------------------------------------------------------------
// CORE SYNC ENGINE
// ------------------------------------------------------------------

/**
 * The Master Smart Import function.
 * Matches AniList + Donghua API + Donghub API and inserts into DB.
 */
export const smartImportAnime = async (anilistId: number, donghuaSlug?: string, donghubSlug?: string) => {
  try {
    // 1. Fetch Primary Metadata from AniList
    const anilistData = await fetchAniListMetadata(anilistId);
    
    // Convert AniList Status to our DB format
    let status = 'Ongoing';
    if (anilistData.status === 'FINISHED') status = 'Completed';
    else if (anilistData.status === 'NOT_YET_RELEASED') status = 'Upcoming';

    // Attempt to find an English title in synonyms if english is missing
    let englishTitle = anilistData.title.english;
    if (!englishTitle && anilistData.synonyms) {
      // Find a synonym that contains mostly ASCII characters (English words)
      const engSynonym = anilistData.synonyms.find((s: string) => /^[a-zA-Z0-9\s:,'"-]+$/.test(s));
      if (engSynonym) englishTitle = engSynonym;
    }

    const finalTitle = englishTitle || anilistData.title.romaji || anilistData.title.native;

    const dbPayload = {
      title: finalTitle,
      original_title: anilistData.title.native,
      slug: (englishTitle || anilistData.title.romaji).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: anilistData.description?.replace(/<[^>]*>?/gm, ''), // strip HTML
      poster_url: anilistData.coverImage.extraLarge || anilistData.coverImage.large,
      banner_url: anilistData.bannerImage,
      format: anilistData.format || 'ONA',
      status: status,
      year: anilistData.seasonYear,
      rating: anilistData.averageScore ? (anilistData.averageScore / 10).toFixed(1) : 0,
      episode_count: anilistData.episodes || 0,
      anilist_id: anilistId,
      donghua_api_slug: donghuaSlug || null,
      donghub_api_slug: donghubSlug || null,
      studio: anilistData.studios?.nodes?.[0]?.name || null,
      country_of_origin: 'China',
      locked_fields: { visibility: 'draft', is_published: false },
      last_sync_metadata: new Date().toISOString()
    };

    // Insert into Anime Table
    const { data: animeRecord, error: animeError } = await supabase
      .from('anime')
      .upsert(dbPayload, { onConflict: 'slug' })
      .select()
      .single();

    if (animeError) throw animeError;

    // Handle genres
    if (anilistData.genres && anilistData.genres.length > 0) {
      // Logic to map and insert genres would go here
    }

    // 2. Fetch Episodes from Donghua API if slug provided
    if (donghuaSlug) {
      await syncDonghuaEpisodesForAnime(animeRecord.id, donghuaSlug);
    }

    return animeRecord;
  } catch (error) {
    console.error("Smart Import Failed:", error);
    throw error;
  }
};

export const toggleAnimePublishStatus = async (id: number, visibility: 'draft' | 'published', animeFallback?: any) => {
  const isPublished = visibility === 'published';
  const { data: existing } = await supabase.from('anime').select('id, locked_fields').eq('id', id).maybeSingle();

  if (existing) {
    const locked_fields = { ...(existing?.locked_fields || {}), visibility, is_published: isPublished };
    const { data, error } = await supabase
      .from('anime')
      .update({
        locked_fields,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // If not found by ID but animeFallback provided (e.g. from static catalog), upsert by slug
  if (animeFallback) {
    const targetSlug = animeFallback.slug || String(id);
    const { data, error } = await supabase
      .from('anime')
      .upsert({
        title: animeFallback.title,
        original_title: animeFallback.chinese_title || animeFallback.original_title || animeFallback.title,
        slug: targetSlug,
        poster_url: animeFallback.poster_url || animeFallback.image,
        episode_count: animeFallback.episode_count || animeFallback.episodes || 0,
        year: animeFallback.year || new Date().getFullYear(),
        rating: animeFallback.rating || 0,
        status: animeFallback.status || 'Ongoing',
        format: animeFallback.format || 'ONA',
        anilist_id: animeFallback.anilist_id || null,
        locked_fields: { visibility, is_published: isPublished },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  throw new Error(`Anime with ID ${id} not found in database.`);
};

export const syncAnimeMetadataById = async (id: number) => {
  const { data: anime, error } = await supabase.from('anime').select('*').eq('id', id).single();
  if (error || !anime) throw new Error("Anime not found");

  if (!anime.anilist_id) throw new Error("No AniList ID linked to this Donghua");

  const anilistData = await fetchAniListMetadata(anime.anilist_id);
  const locks: LockedFields = anime.locked_fields || {};

  const updates: any = {
    last_sync_metadata: new Date().toISOString()
  };

  if (!locks.synopsis && anilistData.description) {
    updates.synopsis = anilistData.description.replace(/<[^>]*>?/gm, '');
  }
  if (!locks.poster && (anilistData.coverImage?.extraLarge || anilistData.coverImage?.large)) {
    updates.poster_url = anilistData.coverImage.extraLarge || anilistData.coverImage.large;
  }
  if (!locks.banner && anilistData.bannerImage) {
    updates.banner_url = anilistData.bannerImage;
  }
  if (!locks.rating && anilistData.averageScore) {
    updates.rating = (anilistData.averageScore / 10).toFixed(1);
  }
  if (!locks.status && anilistData.status) {
    updates.status = anilistData.status === 'FINISHED' ? 'Completed' : 'Ongoing';
  }

  const { data: updated, error: updateErr } = await supabase
    .from('anime')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateErr) throw updateErr;
  return updated;
};

function cleanEpisodeTitle(title: string, epNum: number): string {
  if (!title) return `Episode ${epNum}`;
  let cleaned = title
    .replace(/\s+Subtitle\s+Indonesia/gi, '')
    .replace(/\s+Sub\s+Indo/gi, '')
    .replace(/\s+Tamat/gi, '')
    .replace(/-\s*Episode\s*\d+/gi, `Episode ${epNum}`)
    .replace(/\s+Episode\s+0*(\d+)/gi, (_, n) => ` Episode ${n}`)
    .trim();
  return cleaned;
}

export const syncDonghuaEpisodesForAnime = async (animeId: number, donghuaSlug: string) => {
  const details = await fetchDonghuaDetails(donghuaSlug);
  
  const epCount = details.episodes_list?.length || 0;

  // Update last_sync_episodes and episode_count
  await supabase.from('anime').update({ 
    last_sync_episodes: new Date().toISOString(),
    ...(epCount > 0 ? { episode_count: epCount } : {})
  }).eq('id', animeId);

  if (!details.episodes_list || details.episodes_list.length === 0) return;

  // Re-fetch existing episodes to prevent overwriting locks
  const { data: existingEps } = await supabase.from('episodes').select('episode_number, locked_fields, id').eq('anime_id', animeId);
  const existingMap = new Map(existingEps?.map(ep => [ep.episode_number, ep]));

  const upsertPayload = details.episodes_list.map((ep: any) => {
    // Determine episode number
    const match = ep.slug?.match(/episode-(\d+)/) || ep.episode?.match(/\d+/);
    const epNum = match ? parseInt(match[1] || match[0], 10) : 1;

    const existing = existingMap.get(epNum);
    const locks: LockedFields = existing?.locked_fields || {};

    return {
      ...(existing ? { id: existing.id } : {}), // Add ID if updating
      anime_id: animeId,
      episode_number: epNum,
      title: locks.title ? undefined : cleanEpisodeTitle(ep.episode || `Episode ${epNum}`, epNum),
      donghua_api_slug: ep.slug // the episode slug for stream fetching
    };
  });

  // Clean undefined fields to not overwrite them
  const cleanedPayload = upsertPayload.map((p: any) => Object.fromEntries(Object.entries(p).filter(([_, v]) => v !== undefined)));

  const { error } = await supabase.from('episodes').upsert(cleanedPayload, { onConflict: 'anime_id, episode_number' });
  if (error) console.error("Episodes upsert error", error);
};

export const syncEpisodesFromAniListAndSimkl = async (animeId: number) => {
  try {
    // 1. Fetch Anime Record from DB
    const { data: anime, error: animeError } = await supabase
      .from('anime')
      .select('id, anilist_id, slug, title, last_sync_episodes, poster_url, year')
      .eq('id', animeId)
      .single();

    if (animeError || !anime) {
      console.warn(`[SyncService] Anime ID ${animeId} not found. Skipping.`);
      return null;
    }

    let anilistId = anime.anilist_id;
    if (!anilistId) {
      const { getAniListId } = await import("@/data/anilistDonghuaMap");
      anilistId = getAniListId(animeId) || getAniListId(anime.slug) || null;
      if (anilistId) {
        await supabase.from('anime').update({ anilist_id: anilistId }).eq('id', animeId);
        console.log(`[SyncService] Auto-updated AniList ID to ${anilistId} for ${anime.title} in DB`);
      }
    }

    if (!anilistId) {
      console.warn(`[SyncService] Anime ID ${animeId} has no AniList ID. Skipping.`);
      return null;
    }

    // 2. Fetch episodes from AniList
    const anilistEps = await anilistAnime.anilistGetAllEpisodes(animeId, anilistId);
    if (!anilistEps || anilistEps.length === 0) {
      console.warn(`[SyncService] No episodes retrieved from AniList for ${anime.title}.`);
      return null;
    }

    // 3. Try to enrich with Simkl
    let simklEps: any[] = [];
    const seasonIdMap = new Map<number, number>();
    let resolvedTmdbId: number | null = null;
    let resolvedTvdbId: number | null = null;

    try {
      const simklId = await simklAnime.searchSimklById({ anilist: String(anime.anilist_id) });
      if (simklId) {
        simklEps = await simklAnime.getSimklEpisodes(simklId);

        // Fetch detail to get TMDB/TVDB show IDs
        const simklDetail = await simklAnime.getSimklDetail(simklId);
        if (simklDetail) {
          resolvedTmdbId = simklDetail.ids?.tmdb || null;
          resolvedTvdbId = simklDetail.ids?.tvdb || null;
        }

        // Fetch distinct seasons and insert/upsert them
        const distinctSeasons = Array.from(new Set(simklEps.map(s => s.season || 1)));
        for (const seasonNum of distinctSeasons) {
          const { data: seasonRecord, error: seasonErr } = await supabase
            .from('anime_seasons')
            .upsert({
              anime_id: animeId,
              season_number: seasonNum,
              title: `Season ${seasonNum}`,
              poster_url: anime.poster_url || "",
              release_year: anime.year || null
            }, { onConflict: 'anime_id, season_number' })
            .select('id')
            .single();

          if (!seasonErr && seasonRecord) {
            seasonIdMap.set(seasonNum, seasonRecord.id);
          }
        }
      }
    } catch (simklErr) {
      console.warn(`[SyncService] Simkl enrichment failed or not found for ${anime.title}:`, simklErr);
    }

    // Ensure default season 1 exists in map
    if (!seasonIdMap.has(1)) {
      const { data: defaultSeason, error: defaultSeasonErr } = await supabase
        .from('anime_seasons')
        .upsert({
          anime_id: animeId,
          season_number: 1,
          title: "Season 1",
          poster_url: anime.poster_url || "",
          release_year: anime.year || null
        }, { onConflict: 'anime_id, season_number' })
        .select('id')
        .single();
      if (!defaultSeasonErr && defaultSeason) {
        seasonIdMap.set(1, defaultSeason.id);
      }
    }

    // 4. Fetch existing episodes to merge with locks
    const { data: existingEps } = await supabase
      .from('episodes')
      .select('episode_number, locked_fields, id, description, thumbnail_url')
      .eq('anime_id', animeId);
    const existingMap = new Map(existingEps?.map(ep => [ep.episode_number, ep]));

    // 5. Combine AniList and Simkl data with fallback resolution
    const upsertPayloadPromises = anilistEps.map(async (ep) => {
      const epNum = ep.episode_number;
      const existing = existingMap.get(epNum);
      const locks: LockedFields = existing?.locked_fields || {};

      // Match Simkl episode
      const simklMatch = simklEps.find((s) => s.episode === epNum);
      const matchedSeason = simklMatch?.season || 1;
      const seasonId = seasonIdMap.get(matchedSeason) || seasonIdMap.get(1) || null;
      
      let title = ep.title;
      let description = ep.description || "";
      let simklImg = simklMatch?.image || simklMatch?.img || "";

      if (simklMatch) {
        if (simklMatch.title && !simklMatch.title.toLowerCase().startsWith("episode ")) {
          title = simklMatch.title;
        }
        if (simklMatch.overview) {
          description = simklMatch.overview;
        }
      }

      // Fetch TMDB/TVDB fallbacks for all episodes
      let tmdbImg: string | null = null;
      let tvdbImg: string | null = null;

      if (resolvedTmdbId) {
        tmdbImg = await getTmdbEpisodeThumbnail(resolvedTmdbId, matchedSeason, epNum);
      }
      if (resolvedTvdbId && !tmdbImg) {
        tvdbImg = await fetchTvdbEpisodeImage(resolvedTvdbId, matchedSeason, epNum);
      }

      // Resolve thumbnail using centralized resolver
      const resolvedThumbObj = resolveEpisodeThumbnail(
        existing?.thumbnail_url,
        simklImg,
        tmdbImg,
        tvdbImg,
        ep.thumbnail_url, // fallback to AniList
        "", // sanka
        anime.poster_url, // season poster fallback
        anime.poster_url  // series poster fallback
      );

      // Log the exact debug output fields requested
      console.log(`[RESOLVER DEBUG] Episode ${epNum}:`, {
        "TMDB ID": resolvedTmdbId || "null",
        "Season": matchedSeason,
        "Episode": epNum,
        "TMDB still_path": tmdbImg ? tmdbImg.substring(tmdbImg.indexOf("/w780") + 5) : "null",
        "Final thumbnail URL": resolvedThumbObj.url,
        "Source": resolvedThumbObj.source
      });

      return {
        ...(existing ? { id: existing.id } : {}),
        anime_id: animeId,
        episode_number: epNum,
        season_id: seasonId,
        title: locks.title ? undefined : title,
        description: locks.synopsis ? undefined : description,
        overview: locks.synopsis ? undefined : description,
        thumbnail_url: locks.poster ? undefined : resolvedThumbObj.url,
        thumbnail_source: resolvedThumbObj.source,
        duration: ep.duration,
        air_date: ep.air_date || null,
        is_filler: ep.is_filler || false,
        locked_fields: {
          ...locks,
          thumbnail_source: locks.poster ? undefined : resolvedThumbObj.source
        }
      };
    });

    const upsertPayload = await Promise.all(upsertPayloadPromises);

    // Clean undefined fields to avoid overwriting database keys
    const cleanedPayload = upsertPayload.map((p: any) => 
      Object.fromEntries(Object.entries(p).filter(([_, v]) => v !== undefined))
    );

    // Upsert episodes table
    const { error: upsertError } = await supabase
      .from('episodes')
      .upsert(cleanedPayload, { onConflict: 'anime_id, episode_number' });

    if (upsertError) throw upsertError;

    // Update anime table details
    const { error: animeUpdateError } = await supabase
      .from('anime')
      .update({
        episode_count: cleanedPayload.length,
        last_sync_episodes: new Date().toISOString()
      })
      .eq('id', animeId);

    if (animeUpdateError) throw animeUpdateError;

    console.log(`[SyncService] Successfully synced ${cleanedPayload.length} episodes for anime ${anime.title}.`);
    return cleanedPayload;
  } catch (err) {
    console.error(`[SyncService] syncEpisodesFromAniListAndSimkl failed for Anime ID ${animeId}:`, err);
    throw err;
  }
};

// ------------------------------------------------------------------
// 4. MEDIAWIKI REVISION DELTA SYNC ENGINE (Incremental Fandom Ingestion)
// ------------------------------------------------------------------

export interface MediaWikiSyncState {
  subdomain: string;
  lastSyncedAt: string;
  lastSuccessfulSyncAt?: string;
  syncedPageCount: number;
}

export interface MediaWikiPageRevision {
  pageId: number;
  title: string;
  revisionId: number;
  timestamp: string;
  user?: string;
  comment?: string;
  isNewPage?: boolean;
}

/**
 * Checks MediaWiki recentchanges API for modified or new pages since lastSyncedAt timestamp.
 * Returns delta changes without re-downloading thousands of unchanged pages or images.
 */
export async function checkMediaWikiDeltaChanges(
  subdomain: string,
  lastSyncedAt?: string
): Promise<{
  subdomain: string;
  hasChanges: boolean;
  deltaCount: number;
  modifiedPages: MediaWikiPageRevision[];
  newSyncedAt: string;
}> {
  if (!subdomain) return { subdomain: "", hasChanges: false, deltaCount: 0, modifiedPages: [], newSyncedAt: new Date().toISOString() };

  const baseUrl = `https://${subdomain}.fandom.com/api.php`;
  const nowISO = new Date().toISOString();

  // Cutoff timestamp (default 7 days ago if first sync)
  const cutoffTime = lastSyncedAt ? new Date(lastSyncedAt).toISOString() : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const params = new URLSearchParams({
      action: "query",
      list: "recentchanges",
      rcprop: "title|ids|timestamp|user|comment",
      rclimit: "50",
      rcnamespace: "0",
      rcend: cutoffTime,
      format: "json",
      origin: "*"
    });

    const res = await fetch(`${baseUrl}?${params.toString()}`);
    if (!res.ok) {
      console.warn(`[MediaWiki Sync] recentchanges returned ${res.status} for ${subdomain}`);
      return { subdomain, hasChanges: false, deltaCount: 0, modifiedPages: [], newSyncedAt: nowISO };
    }

    const data = await res.json();
    const changes: any[] = data.query?.recentchanges || [];

    const modifiedPages: MediaWikiPageRevision[] = changes.map(item => ({
      pageId: item.pageid,
      title: item.title,
      revisionId: item.revid,
      timestamp: item.timestamp,
      user: item.user,
      comment: item.comment,
      isNewPage: item.type === "new"
    }));

    return {
      subdomain,
      hasChanges: modifiedPages.length > 0,
      deltaCount: modifiedPages.length,
      modifiedPages,
      newSyncedAt: nowISO
    };
  } catch (err) {
    console.error(`[MediaWiki Sync] Delta check failed for ${subdomain}:`, err);
    return { subdomain, hasChanges: false, deltaCount: 0, modifiedPages: [], newSyncedAt: nowISO };
  }
}

/**
 * Checks exact revision ID for a set of known page IDs to verify if local cache is stale.
 */
export async function verifyMediaWikiPageRevisions(
  subdomain: string,
  pageIds: number[]
): Promise<Record<number, { title: string; latestRevisionId: number; lastModified: string }>> {
  if (!subdomain || pageIds.length === 0) return {};

  const baseUrl = `https://${subdomain}.fandom.com/api.php`;
  try {
    const params = new URLSearchParams({
      action: "query",
      pageids: pageIds.join("|"),
      prop: "revisions",
      rvprop: "ids|timestamp",
      format: "json",
      origin: "*"
    });

    const res = await fetch(`${baseUrl}?${params.toString()}`);
    if (!res.ok) return {};

    const data = await res.json();
    const pages = data.query?.pages || {};
    const result: Record<number, { title: string; latestRevisionId: number; lastModified: string }> = {};

    Object.values(pages).forEach((p: any) => {
      if (p.pageid && p.revisions?.[0]) {
        result[p.pageid] = {
          title: p.title || "",
          latestRevisionId: p.revisions[0].revid,
          lastModified: p.revisions[0].timestamp
        };
      }
    });

    return result;
  } catch (err) {
    console.error(`[MediaWiki Sync] Revision verification failed for ${subdomain}:`, err);
    return {};
  }
}

