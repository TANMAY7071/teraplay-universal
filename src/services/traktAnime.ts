/**
 * Trakt Anime Service
 * 
 * Trakt-specific implementations that mirror the existing anime/episodes
 * service interface. Each function calls the Trakt API and transforms
 * responses using traktMapper.
 */

import { traktGet } from "@/lib/traktClient";
import type {
  TraktShow,
  TraktSeason,
  TraktEpisode,
  TraktSearchResult,
  TraktPeople,
  TraktRating,
} from "@/types/trakt";
import type { Anime } from "@/types/anime";
import type { EpisodeMetadata } from "@/services/episodes";
import type { Character } from "@/services/anime";
import {
  mapTraktShowToAnime,
  mapTraktEpisodeToMetadata,
  mapTraktCastToCharacter,
} from "@/services/traktMapper";
import { donghuaTraktMap } from "@/data/traktDonghuaMap";

// ─── Search ──────────────────────────────────────────────

/**
 * Search for shows on Trakt. Uses both exact and broader search
 * as recommended by the Trakt docs, then deduplicates.
 */
export async function traktSearchShows(
  query?: string,
  limit = 20,
  signal?: AbortSignal
): Promise<Anime[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    // Run exact + broader search in parallel
    const [exactResults, broadResults] = await Promise.all([
      traktGet<TraktSearchResult[]>(
        `/search/show/exact`,
        { query, extended: "full", limit: 1 },
        { signal }
      ).catch(() => [] as TraktSearchResult[]),
      traktGet<TraktSearchResult[]>(
        `/search/show`,
        { query, extended: "full", page: 1, limit },
        { signal }
      ).catch(() => [] as TraktSearchResult[]),
    ]);

    // Combine and deduplicate by Trakt ID
    const seen = new Set<number>();
    const combined: TraktSearchResult[] = [];

    for (const result of [...exactResults, ...broadResults]) {
      const show = result.show;
      if (!show) continue;
      if (seen.has(show.ids.trakt)) continue;
      seen.add(show.ids.trakt);
      combined.push(result);
    }

    return combined
      .filter((r) => r.show)
      .map((r) => mapTraktShowToAnime(r.show!));
  } catch (err) {
    console.warn("[TraktAnime] Search failed:", err);
    return [];
  }
}

// ─── Show Detail ─────────────────────────────────────────

/**
 * Get full details for a show by Trakt slug or ID.
 * First checks the donghua mapping table for a known Trakt slug.
 */
export async function traktGetShow(
  slugOrId: string,
  signal?: AbortSignal
): Promise<Anime | null> {
  // Check if we have a manual mapping for this slug
  const traktSlug = donghuaTraktMap[slugOrId] || slugOrId;

  try {
    const show = await traktGet<TraktShow>(
      `/shows/${traktSlug}`,
      { extended: "full" },
      { signal }
    );
    return mapTraktShowToAnime(show);
  } catch (err) {
    console.warn(`[TraktAnime] Show fetch failed for "${traktSlug}":`, err);
    return null;
  }
}

export const traktGetShowBySlug = traktGetShow;

/**
 * Get catalog shows via Trakt search
 */
export async function traktGetCatalog(
  limit = 20,
  signal?: AbortSignal
): Promise<Anime[]> {
  return traktSearchShows("donghua", limit, signal);
}

/**
 * Get raw Trakt show data (for the evaluation panel).
 */
export async function traktGetShowRaw(
  slugOrId: string,
  signal?: AbortSignal
): Promise<TraktShow | null> {
  const traktSlug = donghuaTraktMap[slugOrId] || slugOrId;
  try {
    return await traktGet<TraktShow>(
      `/shows/${traktSlug}`,
      { extended: "full" },
      { signal }
    );
  } catch {
    return null;
  }
}

// ─── Seasons ─────────────────────────────────────────────

export async function traktGetSeasons(
  showSlug: string,
  signal?: AbortSignal
): Promise<TraktSeason[]> {
  const traktSlug = donghuaTraktMap[showSlug] || showSlug;
  try {
    return await traktGet<TraktSeason[]>(
      `/shows/${traktSlug}/seasons`,
      { extended: "full" },
      { signal }
    );
  } catch (err) {
    console.warn(`[TraktAnime] Seasons fetch failed for "${traktSlug}":`, err);
    return [];
  }
}

// ─── Episodes ────────────────────────────────────────────

/**
 * Get all episodes for a show. Fetches all seasons and flattens
 * the episodes into a single list.
 */
export async function traktGetAllEpisodes(
  animeId: number,
  showSlug: string,
  signal?: AbortSignal
): Promise<EpisodeMetadata[]> {
  const traktSlug = donghuaTraktMap[showSlug] || showSlug;

  try {
    // First get seasons to know how many there are
    const seasons = await traktGetSeasons(showSlug, signal);

    // Fetch episodes for each season in parallel
    const episodePromises = seasons
      .filter((s) => s.number > 0) // Skip specials (season 0)
      .map((s) =>
        traktGet<TraktEpisode[]>(
          `/shows/${traktSlug}/seasons/${s.number}`,
          { extended: "full" },
          { signal }
        ).catch(() => [] as TraktEpisode[])
      );

    const seasonEpisodes = await Promise.all(episodePromises);

    // Flatten and assign sequential episode numbers
    const allEpisodes: EpisodeMetadata[] = [];
    let globalEpNum = 1;

    for (const episodes of seasonEpisodes) {
      for (const ep of episodes) {
        const mapped = mapTraktEpisodeToMetadata(ep, animeId);
        // Override with sequential numbering for multi-season shows
        mapped.episode_number = globalEpNum++;
        allEpisodes.push(mapped);
      }
    }

    return allEpisodes;
  } catch (err) {
    console.warn(`[TraktAnime] Episodes fetch failed for "${traktSlug}":`, err);
    return [];
  }
}

/**
 * Convenience alias for metadataProvider
 */
export async function traktGetEpisodes(
  animeId: number,
  showSlug?: string,
  signal?: AbortSignal
): Promise<EpisodeMetadata[]> {
  return traktGetAllEpisodes(animeId, showSlug || String(animeId), signal);
}

// ─── Related Shows ───────────────────────────────────────

export async function traktGetRelated(
  showSlug: string,
  limit = 4,
  signal?: AbortSignal
): Promise<Anime[]> {
  const traktSlug = donghuaTraktMap[showSlug] || showSlug;

  try {
    const related = await traktGet<TraktShow[]>(
      `/shows/${traktSlug}/related`,
      { extended: "full", limit },
      { signal }
    );
    return related.map((show) => mapTraktShowToAnime(show));
  } catch (err) {
    console.warn(`[TraktAnime] Related fetch failed for "${traktSlug}":`, err);
    return [];
  }
}

// ─── People / Cast ───────────────────────────────────────

export async function traktGetPeople(
  showSlug: string,
  signal?: AbortSignal
): Promise<Character[]> {
  const traktSlug = donghuaTraktMap[showSlug] || showSlug;

  try {
    const people = await traktGet<TraktPeople>(
      `/shows/${traktSlug}/people`,
      { extended: "full" },
      { signal }
    );

    if (!people.cast || people.cast.length === 0) return [];

    return people.cast.map(mapTraktCastToCharacter);
  } catch (err) {
    console.warn(`[TraktAnime] People fetch failed for "${traktSlug}":`, err);
    return [];
  }
}

export const traktGetCharacters = traktGetPeople;

// ─── Ratings ─────────────────────────────────────────────

export async function traktGetRatings(
  showSlug: string,
  signal?: AbortSignal
): Promise<TraktRating | null> {
  const traktSlug = donghuaTraktMap[showSlug] || showSlug;

  try {
    return await traktGet<TraktRating>(
      `/shows/${traktSlug}/ratings`,
      undefined,
      { signal }
    );
  } catch {
    return null;
  }
}
