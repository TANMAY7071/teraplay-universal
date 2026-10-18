export type InstallmentType = 
  | "Season"
  | "Movie"
  | "ONA"
  | "OVA"
  | "Special"
  | "Arc"
  | "Recap";

export interface CharacterItem {
  name: string;
  role: string;
  avatar: string;
  cultivation?: string;
  ability?: string;
  description: string;
  relationship?: string;
}

export interface Installment {
  id: string | number;
  slug: string;
  title: string;
  type: InstallmentType;
  seasonNumber?: number;
  installmentOrder: number;
  status: "Completed" | "Watching" | "Ongoing" | "Upcoming";
  episodesCount: number;
  poster?: string;
  banner?: string;
  description: string;
  releaseDate?: string;
  year?: number;
  rating?: number;
  trailerUrl?: string;
  youtubeId?: string;
  donghuaApiSlug?: string;
  tmdbId?: number;
  simklId?: number;
  simklIds?: { id: number; offset: number }[];
  anilistId?: number;
  startEpisode?: number;
  endEpisode?: number;
  tmdbSourceSeason?: number;
  verifiedEpisodeThumbnails?: Record<number, string>;
  verifiedEpisodeTitles?: Record<number, string>;
  characters?: CharacterItem[];
  videoOffsetY?: string;
  watchNote?: string;
}

export interface Universe {
  id: string | number;
  slug: string;
  title: string;
  originalTitle?: string;
  cover: string;
  banner: string;
  description: string;
  genres: string[];
  studios: string;
  installments: Installment[];
  timelineSummary?: string;
  statistics?: {
    totalEpisodes: number;
    totalInstallments: number;
    viewsCount?: string;
    score?: number;
  };
  externalLinks?: Array<{ label: string; url: string }>;
  modules?: UniverseModules;
}

export interface UniverseModules {
  cultivation?: {
    enabled: boolean;
    title?: string;
    realms: Array<{ level: string; name: string; desc: string }>;
  };
  heavenlyFlames?: {
    enabled: boolean;
    title?: string;
    items: Array<{ rank: number; name: string; desc: string }>;
  };
  lore?: {
    enabled: boolean;
    description: string;
  };
}

// ------------------------------------------------------------------
// UNIFIED KNOWLEDGE GRAPH ENTITIES & RELATIONSHIPS
// ------------------------------------------------------------------

export type EntityType = 
  | "character"
  | "location"
  | "continent"
  | "region"
  | "empire"
  | "clan"
  | "faction"
  | "technique"
  | "artifact"
  | "cultivation";

export interface UniverseEntity {
  id: string; // e.g. "xiao-yan"
  slug: string; // "xiao-yan"
  animeSlug: string; // "battle-through-the-heavens"
  type: EntityType;
  name: string;
  cnName?: string;
  category: string; // e.g. "Flame Emperor", "Sect", "Di Rank"
  avatarUrl?: string;
  bannerUrl?: string;
  description?: string;
  overview?: string;
  appearance?: string;
  personality?: string;
  history?: string;
  trivia?: string;
  quotes?: string;
  attributes?: Record<string, string>; // Infobox key-value pairs
  gallery?: string[]; // Asset URLs
  galleryImages?: string[]; // Asset URLs alias
  featured?: boolean; // Controls Main Characters display on series page
  status: "published" | "draft";
  source: "main_canon" | "wiki_synced" | "custom_admin";
  wikiPageId?: number;
  wikiUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RelationshipType =
  | "located_in"
  | "part_of"
  | "affiliated_with"
  | "uses"
  | "possesses"
  | "master_of"
  | "ally_of"
  | "enemy_of"
  | "family_of";

export interface EntityRelationship {
  id: string;
  fromEntitySlug: string; // source entity slug
  relationshipType: RelationshipType;
  toEntitySlug: string; // target entity slug
  toEntityName: string;
  toEntityType: EntityType;
}

export interface LoreAsset {
  id: string;
  entitySlug: string;
  url: string;
  type: "primary_portrait" | "hero_backdrop" | "gallery_illustration";
  label?: string;
  score: number;
  source: "fandom_wiki" | "custom_upload";
}


