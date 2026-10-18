/**
 * Trakt → Local Type Mapper
 * 
 * Pure mapping functions that convert Trakt API responses into the
 * existing Anime, EpisodeMetadata, and Character types used by the app.
 * 
 * All mappers handle missing/null fields gracefully with safe defaults.
 */

import type { Anime } from "@/types/anime";
import type { EpisodeMetadata } from "@/services/episodes";
import type { Character } from "@/services/anime";
import type {
  TraktShow,
  TraktEpisode,
  TraktCastMember,
  TraktImages,
} from "@/types/trakt";

// ─── Image Helpers ───────────────────────────────────────

/**
 * Trakt returns image paths without the https:// prefix.
 * This helper prepends it and picks the first available image.
 */
function resolveTraktImage(images?: TraktImages, type: keyof TraktImages = "poster"): string {
  if (!images) return "";
  const urls = images[type];
  if (!urls || urls.length === 0) return "";
  const url = urls[0];
  if (url.startsWith("http")) return url;
  return `https://${url}`;
}

/**
 * Build a TMDB poster URL from the TMDB ID.
 * Useful as a fallback when Trakt images are missing.
 */
function tmdbPosterUrl(tmdbId?: number): string {
  if (!tmdbId) return "";
  // TMDB image URLs require the poster_path, not just the ID.
  // We can't construct a direct URL from just the TMDB ID without 
  // an additional API call. Return empty for now.
  return "";
}

// ─── Show → Anime ────────────────────────────────────────

export function mapTraktShowToAnime(show: TraktShow, localId?: number): Anime {
  const posterUrl = resolveTraktImage(show.images, "poster")
    || resolveTraktImage(show.images, "fanart")
    || tmdbPosterUrl(show.ids.tmdb);

  const genres = (show.genres || []).map(
    (g) => g.charAt(0).toUpperCase() + g.slice(1)
  );

  // Map Trakt status to our status type
  let status: "Ongoing" | "Completed" = "Ongoing";
  if (show.status === "ended" || show.status === "canceled") {
    status = "Completed";
  }

  return {
    id: localId || show.ids.trakt,
    slug: show.ids.slug || "",
    title: show.title || "Unknown Title",
    image: posterUrl,
    rating: show.rating ? Math.round(show.rating * 10) / 10 : 0,
    episodes: show.aired_episodes || 0,
    year: show.year || 0,
    genre: genres[0] || "",
    genres: genres,
    status,
    synopsis: show.overview || "",
    tags: genres.slice(0, 4), // Use genres as tags since Trakt doesn't have a separate tags field
    isNew: false,
    featured: false,
    originalTitle: undefined, // Trakt doesn't provide Chinese original titles
  };
}

// ─── Episode → EpisodeMetadata ───────────────────────────

export function mapTraktEpisodeToMetadata(
  ep: TraktEpisode,
  animeId: number
): EpisodeMetadata {
  const thumbnail = resolveTraktImage(ep.images, "screenshot") || resolveTraktImage(ep.images, "thumb");

  return {
    id: ep.ids.trakt || animeId * 1000 + ep.number,
    anime_id: animeId,
    episode_number: ep.number,
    title: ep.title || `Episode ${ep.number}`,
    description: ep.overview || `Watch episode ${ep.number}.`,
    thumbnail_url: thumbnail,
    duration: ep.runtime ? `${ep.runtime} min` : "24 min",
    air_date: ep.first_aired || undefined,
    is_filler: false,
  };
}

// ─── Cast → Character ────────────────────────────────────

export function mapTraktCastToCharacter(cast: TraktCastMember): Character {
  const avatarUrl = resolveTraktImage(cast.person.images, "thumb");

  return {
    name: cast.person.name || "Unknown",
    role: cast.characters?.[0] || "Unknown Role",
    avatar_url: avatarUrl,
    description: cast.person.biography || undefined,
  };
}

// ─── Coverage Report ─────────────────────────────────────

export interface TraktFieldCoverage {
  field: string;
  traktValue: string;
  hasData: boolean;
  notes?: string;
}

/**
 * Generate a field-by-field coverage report for a Trakt show,
 * showing which fields are populated and which are empty.
 */
export function generateCoverageReport(show: TraktShow): TraktFieldCoverage[] {
  const fields: TraktFieldCoverage[] = [
    { field: "Title", traktValue: show.title || "—", hasData: !!show.title },
    { field: "Year", traktValue: String(show.year ?? "—"), hasData: !!show.year },
    { field: "Overview", traktValue: (show.overview || "—").slice(0, 80) + "…", hasData: !!show.overview },
    { field: "Genres", traktValue: (show.genres || []).join(", ") || "—", hasData: !!(show.genres?.length) },
    { field: "Status", traktValue: show.status || "—", hasData: !!show.status },
    { field: "Rating", traktValue: show.rating ? `${show.rating}/10 (${show.votes} votes)` : "—", hasData: !!show.rating },
    { field: "Runtime", traktValue: show.runtime ? `${show.runtime} min` : "—", hasData: !!show.runtime },
    { field: "Aired Episodes", traktValue: String(show.aired_episodes ?? "—"), hasData: !!show.aired_episodes },
    { field: "Network", traktValue: show.network || "—", hasData: !!show.network },
    { field: "Country", traktValue: show.country || "—", hasData: !!show.country },
    { field: "Language", traktValue: show.language || "—", hasData: !!show.language },
    { field: "Certification", traktValue: show.certification || "—", hasData: !!show.certification },
    { field: "Trailer", traktValue: show.trailer || "—", hasData: !!show.trailer },
    { field: "Homepage", traktValue: show.homepage || "—", hasData: !!show.homepage },
    { field: "Poster Image", traktValue: resolveTraktImage(show.images, "poster") || "—", hasData: !!resolveTraktImage(show.images, "poster") },
    { field: "Fanart Image", traktValue: resolveTraktImage(show.images, "fanart") || "—", hasData: !!resolveTraktImage(show.images, "fanart") },
    { field: "IMDB ID", traktValue: show.ids.imdb || "—", hasData: !!show.ids.imdb },
    { field: "TMDB ID", traktValue: String(show.ids.tmdb ?? "—"), hasData: !!show.ids.tmdb },
    { field: "TVDB ID", traktValue: String(show.ids.tvdb ?? "—"), hasData: !!show.ids.tvdb },
    { field: "Original Title (Chinese)", traktValue: "—", hasData: false, notes: "Trakt does not provide non-English original titles" },
    { field: "Cultivation Realms", traktValue: "—", hasData: false, notes: "Domain-specific field not in Trakt" },
    { field: "Tags", traktValue: "—", hasData: false, notes: "Trakt uses genres, not custom tags" },
  ];

  return fields;
}
