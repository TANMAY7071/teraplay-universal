/**
 * AniList API Type Definitions
 * 
 * TypeScript interfaces mapping AniList GraphQL response shapes.
 * Reference: https://anilist.github.io/ApiV2-Db-Schema/
 */

export interface AniListTitle {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

export interface AniListCoverImage {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
}

export interface AniListConnectionNode<T> {
  edges?: Array<{
    node: T;
    relationType?: "PREQUEL" | "SEQUEL" | "SPIN_OFF" | "SIDE_STORY" | "CHARACTER" | "SUMMARY" | "OTHER";
    role?: "MAIN" | "SUPPORTING" | "BACKGROUND";
  }>;
  nodes?: T[];
  pageInfo?: {
    total?: number;
    perPage?: number;
    currentPage?: number;
    lastPage?: number;
    hasNextPage?: boolean;
  };
}

export interface AniListStudio {
  id: number;
  name: string;
  isAnimationStudio: boolean;
}

export interface AniListCharacter {
  id: number;
  name: {
    first?: string;
    last?: string;
    full?: string;
    native?: string;
    userPreferred?: string;
  };
  image?: {
    large?: string;
    medium?: string;
  };
  description?: string;
}

export interface AniListAiringEpisode {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface AniListMedia {
  id: number;
  idMal?: number;
  title: AniListTitle;
  type: "ANIME" | "MANGA";
  format?: "TV" | "TV_SHORT" | "MOVIE" | "SPECIAL" | "OVA" | "ONA" | "MUSIC";
  status?: "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";
  description?: string;
  startDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  endDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  season?: "WINTER" | "SPRING" | "SUMMER" | "FALL";
  seasonYear?: number;
  episodes?: number;
  duration?: number; // Runtime in minutes
  chapters?: number;
  volumes?: number;
  countryOfOrigin?: string; // "CN" for Chinese Donghua
  isLicensed?: boolean;
  source?: string;
  hashtag?: string;
  trailer?: {
    id?: string;
    site?: string; // "youtube", "dailymotion", etc.
    thumbnail?: string;
  };
  updatedAt?: number;
  coverImage?: AniListCoverImage;
  bannerImage?: string;
  genres?: string[];
  synonyms?: string[];
  averageScore?: number; // 0-100
  meanScore?: number;
  popularity?: number;
  favourites?: number;
  studios?: AniListConnectionNode<AniListStudio>;
  relations?: AniListConnectionNode<AniListMedia>;
  characters?: AniListConnectionNode<AniListCharacter>;
  nextAiringEpisode?: AniListAiringEpisode;
  airingSchedule?: AniListConnectionNode<AniListAiringEpisode>;
}

export interface AniListSearchResult {
  Page: {
    pageInfo: {
      total: number;
      currentPage: number;
      lastPage: number;
      hasNextPage: boolean;
    };
    media: AniListMedia[];
  };
}
