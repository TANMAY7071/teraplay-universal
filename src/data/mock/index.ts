import { Series } from "@/types/series";
import { Franchise, FranchiseEntry } from "@/types/franchise";
import { Character, Location, PowerRealm, Clan, Technique, Artifact } from "@/types/lore";
import { battleThroughTheHeavensSeries } from "../series/battle-through-the-heavens";
import {
  btthFranchise,
  btthCharacters,
  btthLocations,
  btthPowerRealms,
  btthClans,
  btthTechniques,
  btthArtifacts
} from "../lore/btth-lore";

// Episode progress mock database
export const mockEpisodeProgress: Record<string, { episodeId: string; watchedSeconds: number; completed: boolean; lastWatchedAt?: string }> = {
  "btth-s5-e156": {
    episodeId: "btth-s5-e156",
    watchedSeconds: 920,
    completed: false,
    lastWatchedAt: "2026-08-12T19:30:00Z"
  }
};

// Global watch states mapping
export const mockWatchProgress = {
  started: true,
  completed: false,
  firstEpisodeId: "btth-s5-e1",
  lastEpisodeId: "btth-s5-e156",
  season: 5,
  episode: 156,
  episodeId: "btth-s5-e156"
};

// Canon selector projections
export function getSeriesById(id: string): Series | null {
  if (id === "battle-through-the-heavens" || id === "btth") {
    return battleThroughTheHeavensSeries;
  }
  return null;
}

export function getFranchiseBySeriesId(seriesId: string): Franchise | null {
  if (seriesId === "battle-through-the-heavens" || seriesId === "btth") {
    return btthFranchise;
  }
  return null;
}

export function getPrimaryWatchAction(seriesId: string, progress = mockWatchProgress) {
  if (!progress.started) {
    return {
      type: "start",
      label: "Watch Episode 1",
      episodeId: progress.firstEpisodeId
    };
  }
  if (progress.completed) {
    return {
      type: "rewatch",
      label: "Rewatch Series",
      episodeId: progress.lastEpisodeId
    };
  }
  return {
    type: "continue",
    label: `Continue S${progress.season} Episode ${progress.episode}`,
    episodeId: progress.episodeId
  };
}

export function getCharacterHighlights(): Character[] {
  return btthCharacters.slice(0, 6);
}

export function getCharactersList(): Character[] {
  return btthCharacters;
}

export function getPowerRealms(): PowerRealm[] {
  return btthPowerRealms;
}

export function getRealmById(realmId: string): PowerRealm | null {
  return btthPowerRealms.find(r => r.id === realmId) || null;
}

export function getClanById(clanId: string): Clan | null {
  return btthClans.find(c => c.id === clanId) || null;
}

export function getLocationById(locId: string): Location | null {
  return btthLocations.find(l => l.id === locId) || null;
}
