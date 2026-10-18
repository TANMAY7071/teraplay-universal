export type FranchiseEntryType = "season" | "remake" | "special" | "event" | "movie";

export interface FranchiseEntry {
  id: string;
  title: string;
  type: FranchiseEntryType;
  year: number;
  episodeCount: number;
  poster: string;
  label: string;
  status: "completed" | "watching" | "unwatched";
  donghuaApiSlug?: string;
}

export interface Franchise {
  id: string;
  seriesId: string;
  entries: FranchiseEntry[];
}
