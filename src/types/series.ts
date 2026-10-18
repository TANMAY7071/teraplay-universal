export interface SeriesTitles {
  english: string;
  chinese?: string;
  original?: string;
}

export interface SeriesRatings {
  mal: number;
  users: number;
  popularity: number;
  favorites: number;
}

export interface SeriesStatistics {
  totalEpisodes: number;
  totalInstallments: number;
  viewsCount?: string;
  score?: number;
}

export interface Series {
  id: string;
  titles: SeriesTitles;
  type: string;
  poster: string;
  logo?: string;
  logoDisplayMode?: 'desktop_only' | 'both' | 'none';
  banner?: string;
  metadata: {
    year: number;
    status: string;
    language: string;
    country: string;
    source: string;
    studio: string;
    duration: number;
  };
  ratings: SeriesRatings;
  genres: string[];
  themes: string[];
  synopsis: string;
  franchiseId: string;
}
