export interface Anime {
  id: number | string;
  slug: string;
  title: string;
  image: string;
  rating: number;
  episodes: number;
  year: number;
  genre: string;
  genres: string[];
  status: "Ongoing" | "Completed";
  synopsis: string;
  tags: string[];
  isNew?: boolean;
  featured?: boolean;
  originalTitle?: string; // e.g. "斗破苍穹" for Battle Through the Heavens
  countryOfOrigin?: string;
  visibility?: 'draft' | 'published';
  isPublished?: boolean;
  metadataStatus?: 'pending' | 'ready' | 'failed';
  episodeSyncStatus?: 'synced' | 'pending' | 'failed';
  lastMetadataSync?: string;
  lastEpisodeSync?: string;
  anilistId?: number;
  anilist_id?: number;
  simklId?: number | string;
  banner?: string;
  wikiSubdomain?: string;
  donghuaApiSlug?: string;
  donghubApiSlug?: string;
  studio?: string;
  format?: string;
  source_material?: string;
  duration?: string;
}

export type AnimeCardItem = Pick<
  Anime,
  "id" | "slug" | "title" | "image" | "rating" | "episodes" | "year" | "genre" | "isNew"
> & { genres?: string[] };

export interface WatchProgress {
  animeId: number;
  episode: number;
  time: number;
  totalTime: number;
  updatedAt: string;
  completed?: boolean;
  episodeImage?: string;
  seasonName?: string;
  installmentType?: string;
  episodeTitle?: string;
}

export interface EpisodeProgress {
  episode: number;
  time: number;
  totalTime: number;
  completed: boolean;
  updatedAt: string;
  currentTime?: number;
  duration?: number;
}
