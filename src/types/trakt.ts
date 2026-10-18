/**
 * Trakt API Type Definitions
 * 
 * TypeScript interfaces mapping the Trakt API v2 response shapes.
 * Reference: https://trakt.docs.apiary.io/
 */

// ─── ID Objects ──────────────────────────────────────────

export interface TraktIds {
  trakt: number;
  slug: string;
  imdb?: string;
  tmdb?: number;
  tvdb?: number;
}

// ─── Images ──────────────────────────────────────────────

export interface TraktImages {
  fanart?: string[];
  poster?: string[];
  logo?: string[];
  clearart?: string[];
  banner?: string[];
  thumb?: string[];
  screenshot?: string[];
}

// ─── Shows ───────────────────────────────────────────────

export interface TraktShow {
  title: string;
  year: number | null;
  ids: TraktIds;
  // Extended fields (only with ?extended=full)
  tagline?: string;
  overview?: string;
  first_aired?: string;
  runtime?: number;
  certification?: string;
  network?: string;
  country?: string;
  trailer?: string;
  homepage?: string;
  status?: string; // "returning series", "ended", "in production", etc.
  rating?: number;
  votes?: number;
  comment_count?: number;
  updated_at?: string;
  language?: string;
  languages?: string[];
  available_translations?: string[];
  genres?: string[];
  aired_episodes?: number;
  images?: TraktImages;
}

// ─── Seasons ─────────────────────────────────────────────

export interface TraktSeason {
  number: number;
  ids: TraktIds;
  // Extended fields
  title?: string;
  overview?: string;
  network?: string;
  episode_count?: number;
  aired_episodes?: number;
  rating?: number;
  votes?: number;
  first_aired?: string;
  updated_at?: string;
  images?: TraktImages;
}

// ─── Episodes ────────────────────────────────────────────

export interface TraktEpisode {
  season: number;
  number: number;
  title: string;
  ids: TraktIds;
  // Extended fields
  number_abs?: number;
  overview?: string;
  first_aired?: string;
  updated_at?: string;
  rating?: number;
  votes?: number;
  comment_count?: number;
  available_translations?: string[];
  runtime?: number;
  episode_type?: string; // "standard", "series_premiere", "season_premiere", etc.
  images?: TraktImages;
}

// ─── People ──────────────────────────────────────────────

export interface TraktPerson {
  name: string;
  ids: TraktIds;
  // Extended fields
  biography?: string;
  birthday?: string;
  death?: string;
  birthplace?: string;
  homepage?: string;
  images?: TraktImages;
}

export interface TraktCastMember {
  characters: string[];
  person: TraktPerson;
}

export interface TraktCrewMember {
  jobs: string[];
  person: TraktPerson;
}

export interface TraktPeople {
  cast?: TraktCastMember[];
  crew?: {
    directing?: TraktCrewMember[];
    writing?: TraktCrewMember[];
    production?: TraktCrewMember[];
    "visual effects"?: TraktCrewMember[];
    art?: TraktCrewMember[];
    sound?: TraktCrewMember[];
    [key: string]: TraktCrewMember[] | undefined;
  };
}

// ─── Ratings ─────────────────────────────────────────────

export interface TraktRating {
  rating: number;
  votes: number;
  distribution: Record<string, number>;
}

// ─── Search ──────────────────────────────────────────────

export interface TraktSearchResult {
  type: "show" | "movie" | "episode" | "person" | "list";
  score: number;
  show?: TraktShow;
  movie?: any; // Not used for our donghua evaluation
  episode?: TraktEpisode;
  person?: TraktPerson;
}

// ─── Calendar ────────────────────────────────────────────

export interface TraktCalendarEntry {
  first_aired: string;
  episode: TraktEpisode;
  show: TraktShow;
}
