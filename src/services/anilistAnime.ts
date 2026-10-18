/**
 * AniList Anime Service
 * 
 * Queries AniList GraphQL API and maps the results to standard internal types.
 */

import { anilistQuery } from "@/lib/anilistClient";
import { anilistDonghuaMap } from "@/data/anilistDonghuaMap";
import type { AniListSearchResult, AniListMedia } from "@/types/anilist";
import type { Anime } from "@/types/anime";
import type { EpisodeMetadata } from "@/services/episodes";
import type { Character } from "@/services/anime";
import { isChineseDonghua } from "@/services/donghuaFilter";
import {
  mapAniListMediaToAnime,
  mapAniListCharacterToCharacter,
  mapAniListEpisodesToMetadata,
  mapAniListRelations,
  type AniListRelationInfo,
} from "@/services/anilistMapper";

// ─── GraphQL Query Fragments ─────────────────────────────

const MEDIA_FIELDS_FRAGMENT = `
  id
  title {
    romaji
    english
    native
    userPreferred
  }
  type
  format
  status
  description
  startDate {
    year
    month
    day
  }
  seasonYear
  episodes
  duration
  countryOfOrigin
  trailer {
    id
    site
  }
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  genres
  averageScore
  nextAiringEpisode {
    id
    airingAt
    timeUntilAiring
    episode
  }
`;

// ─── Service Functions ───────────────────────────────────

/**
 * Search AniList for shows. Filters by type: ANIME.
 * Supports filtering by countryOfOrigin: "CN" (Chinese Donghua).
 */
export async function anilistSearchShows(
  query: string,
  limit = 20,
  signal?: AbortSignal
): Promise<Anime[]> {
  if (!query || query.trim().length === 0) return [];

  const graphQuery = `
    query ($search: String, $limit: Int) {
      Page(page: 1, perPage: $limit) {
        pageInfo {
          total
        }
        media(search: $search, type: ANIME, countryOfOrigin: "CN") {
          ${MEDIA_FIELDS_FRAGMENT}
        }
      }
    }
  `;

  try {
    const data = await anilistQuery<AniListSearchResult>(
      graphQuery,
      { search: query, limit },
      { signal }
    );
    return (data.Page?.media || [])
      .filter((m) => isChineseDonghua(m))
      .map((m) => mapAniListMediaToAnime(m));
  } catch (err) {
    console.error("[AniListAnime] Search failed:", err);
    return [];
  }
}

/**
 * Fetch full details of an AniList Media show entry,
 * including characters, studios, and relations.
 */
export async function anilistGetShow(
  id: number,
  signal?: AbortSignal
): Promise<Anime | null> {
  const graphQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS_FRAGMENT}
      }
    }
  `;

  try {
    const data = await anilistQuery<{ Media: AniListMedia }>(
      graphQuery,
      { id },
      { signal }
    );
    if (!data.Media || !isChineseDonghua(data.Media)) return null;
    return mapAniListMediaToAnime(data.Media);
  } catch (err) {
    console.error(`[AniListAnime] GetShow failed for ID ${id}:`, err);
    return null;
  }
}

/**
 * Get raw AniList media details (for the evaluation dashboard).
 */
export async function anilistGetShowRaw(
  id: number,
  signal?: AbortSignal
): Promise<AniListMedia | null> {
  const graphQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS_FRAGMENT}
        studios(isMain: true) {
          nodes {
            id
            name
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              title {
                romaji
                english
                native
                userPreferred
              }
              type
              format
              status
              episodes
              coverImage {
                large
              }
            }
          }
        }
        characters(role: MAIN, page: 1, perPage: 25) {
          edges {
            role
            node {
              id
              name {
                userPreferred
              }
              image {
                large
              }
              description
            }
          }
        }
        airingSchedule(page: 1, perPage: 25) {
          nodes {
            id
            airingAt
            timeUntilAiring
            episode
          }
        }
      }
    }
  `;

  try {
    const data = await anilistQuery<{ Media: AniListMedia }>(
      graphQuery,
      { id },
      { signal }
    );
    return data.Media || null;
  } catch (err) {
    console.error(`[AniListAnime] GetShowRaw failed for ID ${id}:`, err);
    return null;
  }
}

/**
 * Get all episodes for a show by querying AniList's airingSchedule
 * and mapping them to EpisodeMetadata.
 */
export async function anilistGetAllEpisodes(
  animeId: number,
  aniListId: number,
  signal?: AbortSignal
): Promise<EpisodeMetadata[]> {
  const graphQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title {
          english
          userPreferred
        }
        episodes
        duration
        startDate {
          year
          month
          day
        }
        coverImage {
          large
        }
        airingSchedule(page: 1, perPage: 100) {
          nodes {
            id
            airingAt
            timeUntilAiring
            episode
          }
        }
      }
    }
  `;

  try {
    const data = await anilistQuery<{ Media: AniListMedia }>(
      graphQuery,
      { id: aniListId },
      { signal }
    );
    if (!data.Media) return [];
    return mapAniListEpisodesToMetadata(data.Media, animeId);
  } catch (err) {
    console.error(`[AniListAnime] GetEpisodes failed for AniList ID ${aniListId}:`, err);
    return [];
  }
}

/**
 * Get relations (sequels, prequels, spin-offs) of a media item
 */
export async function anilistGetRelations(
  aniListId: number,
  signal?: AbortSignal
): Promise<AniListRelationInfo[]> {
  const graphQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        relations {
          edges {
            relationType
            node {
              id
              title {
                romaji
                english
                native
                userPreferred
              }
              type
              format
              status
              episodes
              coverImage {
                large
                medium
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await anilistQuery<{ Media: AniListMedia }>(
      graphQuery,
      { id: aniListId },
      { signal }
    );
    if (!data.Media) return [];
    return mapAniListRelations(data.Media);
  } catch (err) {
    console.error(`[AniListAnime] GetRelations failed for AniList ID ${aniListId}:`, err);
    return [];
  }
}

/**
 * Get main characters for a media item
 */
export async function anilistGetCharacters(
  aniListId: number,
  signal?: AbortSignal
): Promise<Character[]> {
  const graphQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        characters(role: MAIN, page: 1, perPage: 15) {
          edges {
            role
            node {
              id
              name {
                userPreferred
              }
              image {
                large
              }
              description
            }
          }
        }
      }
    }
  `;

  try {
    const data = await anilistQuery<{ Media: AniListMedia }>(
      graphQuery,
      { id: aniListId },
      { signal }
    );
    if (!data.Media || !data.Media.characters?.edges) return [];
    
    return data.Media.characters.edges
      .filter((edge) => edge.node)
      .map((edge) => mapAniListCharacterToCharacter(edge.node, edge.role));
  } catch (err) {
    console.error(`[AniListAnime] GetCharacters failed for AniList ID ${aniListId}:`, err);
    return [];
  }
}

/**
 * Fetch upcoming airing schedule from AniList for all catalog shows.
 */
export async function anilistGetCalendarSchedule(): Promise<any[]> {
  const ids = Object.values(anilistDonghuaMap);
  const nowEpoch = Math.floor(Date.now() / 1000);
  const start = nowEpoch - 3 * 24 * 60 * 60; // 3 days ago
  const end = nowEpoch + 7 * 24 * 60 * 60; // 7 days from now

  const graphQuery = `
    query ($ids: [Int], $start: Int, $end: Int) {
      Page(page: 1, perPage: 50) {
        airingSchedules(mediaId_in: $ids, airingAt_greater: $start, airingAt_lesser: $end) {
          id
          airingAt
          episode
          media {
            id
            title {
              english
              userPreferred
              romaji
            }
            coverImage {
              large
            }
            description
            genres
            averageScore
          }
        }
      }
    }
  `;

  try {
    const data = await anilistQuery<{
      Page: {
        airingSchedules: Array<{
          id: number;
          airingAt: number;
          episode: number;
          media: any;
        }>;
      };
    }>(graphQuery, { ids, start, end });

    if (!data.Page?.airingSchedules) return [];

    return data.Page.airingSchedules.map((schedule) => {
      const media = schedule.media;
      let localId = media.id;
      for (const [lId, aId] of Object.entries(anilistDonghuaMap)) {
        if (aId === media.id) {
          localId = Number(lId);
          break;
        }
      }

      const airingDate = new Date(schedule.airingAt * 1000);
      const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(airingDate);
      
      // Formatting time manually for clean AM/PM format (e.g. 06:00 PM)
      const airTime = airingDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });

      return {
        id: schedule.id,
        day_of_week: dayOfWeek,
        air_time: airTime,
        episode_number: schedule.episode,
        anime: {
          id: localId,
          slug: String(localId),
          title: media.title.english || media.title.userPreferred || media.title.romaji || "Unknown Title",
          poster_url: media.coverImage?.large || "",
          status: "Ongoing",
          rating: media.averageScore ? media.averageScore / 10 : 0,
          synopsis: media.description ? media.description.replace(/<[^>]*>/g, "") : "",
          studio: "AniList",
          genres: media.genres || [],
        }
      };
    });
  } catch (err) {
    console.error("[AniListAnime] Failed to fetch calendar schedule:", err);
    return [];
  }
}
