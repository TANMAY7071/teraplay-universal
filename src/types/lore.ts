export type MediaAssetRole = "portrait" | "gallery" | "hero" | "thumbnail" | "banner";

export interface MediaAsset {
  id: string;
  url: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  source?: string;
  role?: MediaAssetRole;
}

export interface DocumentSection {
  title: string;
  content: string;
}

export interface CharacterRelationship {
  targetId: string;
  relationType: string;
}

export interface Character {
  id: string;
  name: string;
  chineseName?: string;
  pinyin?: string;
  aliases?: string[];
  image?: string;
  description?: string;
  status?: "alive" | "deceased" | "unknown";
  gender?: string;
  age?: string;
  species?: string;
  occupation?: string;
  affiliationIds?: string[];
  realmId?: string;
  allies?: string[];
  enemies?: string[];
  relationships?: CharacterRelationship[];
  mediaIds?: string[];
  sections?: DocumentSection[];
  featuredRank?: number;
  featuredOnSeriesPage?: boolean;
}

export interface Location {
  id: string;
  name: string;
  image?: string;
  type: string;
  description?: string;
  continent?: string;
  region?: string;
  completeness?: number;
  mediaIds?: string[];
  sections?: DocumentSection[];
}

export interface PowerRealm {
  id: string;
  name: string;
  level: number;
  description?: string;
  stages?: number;
  requirements?: string[];
  associatedAbilities?: string[];
  characterIds?: string[];
}

export interface Clan {
  id: string;
  name: string;
  description?: string;
  locationId?: string;
  leaderId?: string;
  members?: string[];
  emblem?: string;
}

export interface Technique {
  id: string;
  name: string;
  type?: string; // e.g. Dou Qi, Soul Skill
  description?: string;
  rank?: string; // e.g. Tian, Di, Xuan, Huang
  creatorId?: string;
  users?: string[];
}

export interface Artifact {
  id: string;
  name: string;
  type?: string;
  description?: string;
  users?: string[];
  abilities?: string[];
  mediaIds?: string[];
}
