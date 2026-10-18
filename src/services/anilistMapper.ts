/**
 * AniList → Local Type Mapper
 * 
 * Pure mapping functions that convert AniList GraphQL responses into the
 * existing Anime, EpisodeMetadata, and Character types used by the app.
 */

import type { Anime } from "@/types/anime";
import type { EpisodeMetadata } from "@/services/episodes";
import type { Character } from "@/services/anime";
import type { AniListMedia, AniListCharacter } from "@/types/anilist";
import type { TraktFieldCoverage } from "./traktMapper";

// ─── Image Helpers ───────────────────────────────────────

function getBestCover(media: AniListMedia): string {
  if (!media.coverImage) return "";
  return media.coverImage.extraLarge || media.coverImage.large || media.coverImage.medium || "";
}

/**
 * Extracts absolute episode range from AniList description notes
 * e.g. "Note: Includes episodes 60-66." -> { startEpisode: 60, endEpisode: 66, count: 7 }
 */
export function extractEpisodeRange(description?: string): { startEpisode: number; endEpisode: number; count: number } | null {
  if (!description) return null;
  const cleanDesc = description.replace(/<[^>]*>/g, "");
  // Matches "Includes episodes 60-66", "Episodes 67-69", "episodes 60 - 66", "eps 60-66", "episodes 60 to 66"
  const match = cleanDesc.match(/(?:episodes?|eps?\.?)\s*(\d+)\s*[-–to]+\s*(\d+)/i);
  if (match) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (start > 0 && end >= start) {
      return {
        startEpisode: start,
        endEpisode: end,
        count: (end - start) + 1
      };
    }
  }
  return null;
}

// ─── Media → Anime ───────────────────────────────────────

export function mapAniListMediaToAnime(media: AniListMedia, localId?: number): Anime {
  const genres = media.genres || [];
  
  // Map AniList status to our status type
  let status: "Ongoing" | "Completed" = "Ongoing";
  if (media.status === "FINISHED") {
    status = "Completed";
  }

  // Get preferred title
  const title = media.title.english || media.title.userPreferred || media.title.romaji || "Unknown Title";
  const originalTitle = media.title.native || undefined;

  return {
    id: localId || media.id,
    slug: String(media.id),
    title,
    originalTitle,
    image: getBestCover(media),
    banner: media.bannerImage || undefined,
    rating: media.averageScore ? Math.round((media.averageScore / 10) * 10) / 10 : 0,
    episodes: media.episodes || 0,
    year: media.seasonYear || media.startDate?.year || 0,
    genre: genres[0] || "",
    genres: genres,
    status,
    synopsis: media.description ? media.description.replace(/<[^>]*>/g, "") : "", // strip HTML tags from AniList desc
    tags: genres.slice(0, 4),
    isNew: false,
    featured: false,
    countryOfOrigin: media.countryOfOrigin || undefined,
  };
}

// ─── Character Mapping ───────────────────────────────────

export function mapAniListCharacterToCharacter(node: AniListCharacter, role = "SUPPORTING"): Character {
  return {
    name: node.name.userPreferred || node.name.full || "Unknown Character",
    role: role === "MAIN" ? "Main" : "Supporting",
    avatar_url: node.image?.large || node.image?.medium || "",
    description: node.description ? node.description.replace(/<[^>]*>/g, "") : undefined,
  };
}

// ─── Airing/Episodes Mapping ────────────────────────────

/**
 * AniList does not return individual episode synopsis or titles in its standard API,
 * as it is a tracking database. We construct mock metadata for seasons/episodes
 * but use actual air dates from their airingSchedule if available.
 */
export function mapAniListEpisodesToMetadata(
  media: AniListMedia,
  animeId: number
): EpisodeMetadata[] {
  const episodesCount = media.episodes || 0;
  if (episodesCount === 0) return [];

  // Parse airing schedule
  const scheduleMap = new Map<number, number>();
  if (media.airingSchedule?.edges) {
    media.airingSchedule.edges.forEach((edge) => {
      if (edge.node) {
        scheduleMap.set(edge.node.episode, edge.node.airingAt);
      }
    });
  } else if (media.airingSchedule?.nodes) {
    media.airingSchedule.nodes.forEach((node) => {
      scheduleMap.set(node.episode, node.airingAt);
    });
  }

  const result: EpisodeMetadata[] = [];
  const startYear = media.startDate?.year || new Date().getFullYear();
  const startMonth = media.startDate?.month || 1;
  const startDay = media.startDate?.day || 1;
  const baseStartDate = new Date(startYear, startMonth - 1, startDay);

  for (let epNum = 1; epNum <= episodesCount; epNum++) {
    // Determine air date: check schedule map first
    let airDateString: string | undefined = undefined;
    const scheduleEpoch = scheduleMap.get(epNum);
    if (scheduleEpoch) {
      airDateString = new Date(scheduleEpoch * 1000).toISOString();
    } else {
      // Approximate air date weekly from start date
      const approxDate = new Date(baseStartDate.getTime());
      approxDate.setDate(approxDate.getDate() + (epNum - 1) * 7);
      airDateString = approxDate.toISOString();
    }

    result.push({
      id: animeId * 1000 + epNum,
      anime_id: animeId,
      episode_number: epNum,
      title: `Episode ${epNum}`,
      description: `Watch episode ${epNum} of ${media.title.english || media.title.userPreferred}.`,
      thumbnail_url: getBestCover(media), // fallback to cover image since AniList lacks episode screenshots
      duration: media.duration ? `${media.duration} min` : "24 min",
      air_date: airDateString,
      is_filler: false,
    });
  }

  return result;
}

// ─── Relations mapping for Seasons comparison ───────────

export interface AniListRelationInfo {
  id: number;
  relationType: string;
  title: string;
  type: string;
  format: string;
  status: string;
  episodes?: number;
  poster: string;
}

export function mapAniListRelations(media: AniListMedia): AniListRelationInfo[] {
  if (!media.relations?.edges) return [];

  return media.relations.edges
    .filter((edge) => edge.node && edge.node.type === "ANIME")
    .map((edge) => {
      const node = edge.node;
      return {
        id: node.id,
        relationType: edge.relationType || "OTHER",
        title: node.title.english || node.title.userPreferred || "Unknown Title",
        type: node.type,
        format: node.format || "TV",
        status: node.status || "FINISHED",
        episodes: node.episodes,
        poster: getBestCover(node),
      };
    });
}

/**
 * Generate a field-by-field coverage report for an AniList show,
 * showing which fields are populated and which are empty.
 */
export function generateAniListCoverageReport(media: AniListMedia): TraktFieldCoverage[] {
  const title = media.title.english || media.title.userPreferred || media.title.romaji || "";
  const overview = media.description ? media.description.replace(/<[^>]*>/g, "") : "";
  const poster = getBestCover(media);

  return [
    { field: "Title", traktValue: title || "—", hasData: !!title },
    { field: "Year", traktValue: String(media.seasonYear || media.startDate?.year || "—"), hasData: !!(media.seasonYear || media.startDate?.year) },
    { field: "Overview", traktValue: overview ? overview.slice(0, 80) + "…" : "—", hasData: !!overview },
    { field: "Genres", traktValue: (media.genres || []).join(", ") || "—", hasData: !!(media.genres?.length) },
    { field: "Status", traktValue: media.status || "—", hasData: !!media.status },
    { field: "Rating", traktValue: media.averageScore ? `${media.averageScore}%` : "—", hasData: !!media.averageScore },
    { field: "Runtime", traktValue: media.duration ? `${media.duration} min` : "—", hasData: !!media.duration },
    { field: "Aired Episodes", traktValue: String(media.episodes ?? "—"), hasData: !!media.episodes },
    { field: "Network", traktValue: "—", hasData: false, notes: "AniList is tracking database; doesn't store broadcast networks" },
    { field: "Country", traktValue: media.countryOfOrigin || "—", hasData: !!media.countryOfOrigin },
    { field: "Language", traktValue: "—", hasData: false, notes: "AniList does not store direct audio language codes" },
    { field: "Certification", traktValue: "—", hasData: false, notes: "AniList does not store standard age ratings" },
    { field: "Trailer", traktValue: media.trailer?.id ? `${media.trailer.site}: ${media.trailer.id}` : "—", hasData: !!media.trailer?.id },
    { field: "Homepage", traktValue: `https://anilist.co/anime/${media.id}`, hasData: true },
    { field: "Poster Image", traktValue: poster || "—", hasData: !!poster },
    { field: "Fanart Image", traktValue: media.bannerImage || "—", hasData: !!media.bannerImage },
    { field: "IMDB ID", traktValue: "—", hasData: false, notes: "AniList does not expose IMDB IDs directly" },
    { field: "TMDB ID", traktValue: "—", hasData: false, notes: "AniList does not expose TMDB IDs directly" },
    { field: "TVDB ID", traktValue: "—", hasData: false, notes: "AniList does not expose TVDB IDs directly" },
    { field: "Original Title (Chinese)", traktValue: media.title.native || "—", hasData: !!media.title.native, notes: "AniList natively provides Chinese original titles!" },
    { field: "Cultivation Realms", traktValue: "—", hasData: false, notes: "Domain-specific field not in AniList" },
    { field: "Tags", traktValue: "—", hasData: false, notes: "AniList has tags but we only pull genres for basic mapping" },
  ];
}
