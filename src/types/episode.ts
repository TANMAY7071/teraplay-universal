export interface Episode {
  id: string;
  seasonId: string;
  number: number;
  title: string;
  duration: number; // in seconds
  thumbnail: string;
}

export interface EpisodeProgress {
  episodeId: string;
  watchedSeconds: number;
  completed: boolean;
  lastWatchedAt?: string;
}

export interface WatchProgress {
  started: boolean;
  completed: boolean;
  firstEpisodeId: string;
  lastEpisodeId: string;
  season: number;
  episode: number;
  episodeId: string;
}
