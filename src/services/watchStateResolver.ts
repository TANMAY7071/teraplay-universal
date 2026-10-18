import { Anime, WatchProgress } from "@/types/anime";
import { getCleanCoverUrl, getCleanBannerUrl } from "@/data/anilistDonghuaMap";

export interface ResolvedWatchState {
  animeId: number | string;
  slug: string;
  seasonNumber: number;
  seasonName: string;
  seasonTag: string; // e.g. "S5"
  episodeNumber: number;
  episodeTitle: string;
  episodeId: number;
  time: number;
  totalTime: number;
  progressPercent: number;
  completed: boolean;
  hasUserProgress: boolean;
  formattedHeroTag: string; // "S5 | EP 156"
  formattedPillTag: string; // "S5"
  formattedEpisodeTag: string; // "EP 156"
  ctaLabel: string; // "Continue S5 EP 156" or "Watch S5 EP 1"
  watchUrl: string; // "/watch/battle-through-the-heavens/episode-156"
  posterUrl: string;
  thumbnailUrl: string;
  latestAvailableEpisodeNumber: number;
  surroundingEpisodes: {
    episodeNumber: number;
    seasonNumber: number;
    title: string;
    thumbnail: string;
    progressPercent: number;
    isCurrent: boolean;
    watchUrl: string;
  }[];
}

/**
 * Parses a season number from a season name, title, slug, or episode number.
 */
export function parseSeasonNumber(
  seasonName?: string,
  slug?: string,
  title?: string,
  animeId?: number | string,
  episodeNumber?: number
): number {
  const searchStr = `${slug || ""} ${title || ""}`.toLowerCase();

  // BTTH special handling: Episode 156 belongs to Season 5 (Nian Fan)
  if (animeId === 1 || String(animeId) === "1" || searchStr.includes("battle-through-the-heavens") || searchStr.includes("btth")) {
    if (!episodeNumber || episodeNumber >= 40) return 5;
    if (episodeNumber >= 25) return 3;
    if (episodeNumber >= 13) return 2;
    return 1;
  }

  if (seasonName) {
    const seasonMatch = seasonName.match(/Season\s*(\d+)/i) || seasonName.match(/S(\d+)/i);
    if (seasonMatch) return parseInt(seasonMatch[1], 10);
  }

  if (searchStr.includes("season-5") || searchStr.includes("season 5") || searchStr.includes("s5") || searchStr.includes("nian-fan")) {
    return 5;
  }
  if (searchStr.includes("season-2") || searchStr.includes("season 2") || searchStr.includes("s2")) {
    return 2;
  }
  if (searchStr.includes("season-3") || searchStr.includes("season 3") || searchStr.includes("s3")) {
    return 3;
  }
  if (searchStr.includes("season-4") || searchStr.includes("season 4") || searchStr.includes("s4")) {
    return 4;
  }

  return 1;
}

/**
 * Pure Canonical Watch State Resolver
 */
export function resolveCurrentWatchState(params: {
  anime: Anime | { id: number | string; slug: string; title: string; image?: string; banner?: string; episodes?: number };
  continueWatching?: Record<string | number, WatchProgress>;
  episodesData?: { episode_number: number; title?: string; thumbnail_url?: string }[];
}): ResolvedWatchState {
  const { anime, continueWatching = {}, episodesData = [] } = params;

  const animeId = anime.id;
  const slug = anime.slug || String(animeId);
  const totalEpisodes = anime.episodes || 1;

  // 1. Look up user progress for this anime (by numeric ID or slug)
  const userProgress = continueWatching[animeId] || continueWatching[slug];
  const hasUserProgress = !!userProgress && userProgress.episode > 0;

  // 2. BTTH Season 5 / Donghua specific season resolution
  const searchStr = `${slug} ${(anime as any).title || ""}`.toLowerCase();
  let seasonNumber = 1;
  let latestAiredEpisode = totalEpisodes;

  if (animeId === 1 || String(animeId) === "1" || searchStr.includes("battle-through-the-heavens") || searchStr.includes("btth")) {
    seasonNumber = 5;
    latestAiredEpisode = 210;
  } else if (searchStr.includes("season-2") || searchStr.includes("great-ruler")) {
    seasonNumber = 2;
    latestAiredEpisode = 39;
  } else if (searchStr.includes("renegade-immortal")) {
    seasonNumber = 1;
    latestAiredEpisode = 52;
  }

  const userProgressEpisode = hasUserProgress ? userProgress.episode : 1;
  const displayReleaseEpisode = latestAiredEpisode;
  const episodeNumber = displayReleaseEpisode;

  const time = hasUserProgress ? userProgress.time || 0 : 0;
  const totalTime = hasUserProgress ? userProgress.totalTime || 1200 : 1200;
  const progressPercent = totalTime > 0 ? Math.min(100, Math.max(0, Math.round((time / totalTime) * 100))) : 0;
  const completed = hasUserProgress ? !!userProgress.completed || progressPercent >= 90 : false;

  const userSeasonNumber = seasonNumber;
  const seasonTag = `S${seasonNumber}`;
  const seasonName = `Season ${seasonNumber}`;

  // 3. Resolve Episode Title & Artwork via 4-Stage Fallback Chain
  const currentEpData = episodesData.find((e) => e.episode_number === displayReleaseEpisode);
  const episodeTitle = currentEpData?.title || `Episode ${displayReleaseEpisode}`;
  const episodeId = typeof animeId === "number" ? animeId * 1000 + displayReleaseEpisode : 1000 + displayReleaseEpisode;

  const cleanCover = getCleanCoverUrl(animeId, seasonNumber) || getCleanCoverUrl(slug, seasonNumber);
  const cleanBanner = getCleanBannerUrl(animeId) || getCleanBannerUrl(slug);

  const posterUrl = currentEpData?.thumbnail_url || cleanCover || anime.image || "";
  const thumbnailUrl = cleanBanner || posterUrl;

  // 4. Format Tags & CTA Label (Separating Release Metadata S5 EP210 from User CTA Continue S5 EP156)
  const formattedPillTag = seasonTag; // "S5"
  const formattedEpisodeTag = `EP ${displayReleaseEpisode}`; // "EP 210"
  const formattedHeroTag = `${seasonTag} | EP ${displayReleaseEpisode}`; // "S5 | EP 210"

  let ctaLabel = "";
  let watchUrl = "";
  if (hasUserProgress) {
    if (completed) {
      ctaLabel = `Watch Again S${userSeasonNumber} EP ${userProgressEpisode}`;
    } else {
      ctaLabel = `Continue S${userSeasonNumber} EP ${userProgressEpisode}`;
    }
    watchUrl = `/watch/${slug}/episode-${userProgressEpisode}`;
  } else {
    ctaLabel = `Watch ${seasonTag} EP 1`;
    watchUrl = `/watch/${slug}/episode-1`;
  }

  const latestAvailableEpisodeNumber = latestAiredEpisode;

  // 6. Generate Resolved Surrounding Episode Cards for Carousel / Mini Cards
  // Center around current episode e.g. 156 -> [156, 155, 154, 153] or [154, 155, 156, 157]
  const cardNumbers: number[] = [];
  if (episodeNumber >= 4) {
    // Show current episode and 3 previous episodes in descending order
    cardNumbers.push(episodeNumber, episodeNumber - 1, episodeNumber - 2, episodeNumber - 3);
  } else {
    // Show early episodes ascending e.g. 1, 2, 3, 4
    for (let i = 1; i <= Math.min(4, Math.max(4, totalEpisodes)); i++) {
      cardNumbers.push(i);
    }
  }

  const surroundingEpisodes = cardNumbers.map((epNum) => {
    const epData = episodesData.find((e) => e.episode_number === epNum);
    const isCurr = epNum === episodeNumber;
    return {
      episodeNumber: epNum,
      seasonNumber,
      title: epData?.title || `Episode ${epNum}`,
      thumbnail: epData?.thumbnail_url || thumbnailUrl,
      progressPercent: isCurr ? progressPercent : 0,
      isCurrent: isCurr,
      watchUrl: `/watch/${slug}/episode-${epNum}`,
    };
  });

  return {
    animeId,
    slug,
    seasonNumber,
    seasonName,
    seasonTag,
    episodeNumber,
    episodeTitle,
    episodeId,
    time,
    totalTime,
    progressPercent,
    completed,
    hasUserProgress,
    formattedHeroTag,
    formattedPillTag,
    formattedEpisodeTag,
    ctaLabel,
    watchUrl,
    posterUrl,
    thumbnailUrl,
    latestAvailableEpisodeNumber,
    surroundingEpisodes,
  };
}

export interface ResolvedAiringState {
  animeId: number | string;
  slug: string;
  title: string;
  seasonNumber: number;
  seasonTag: string; // e.g. "S5"
  episodeNumber: number;
  formattedHeroTag: string; // "S5 | EP 211"
  formattedPillTag: string; // "S5"
  formattedEpisodeTag: string; // "EP 211"
  airingAt: number | null; // UNIX timestamp
  timeUntilAiring: number | null; // Seconds until airing
  statusLabel: "UP NEXT" | "JUST RELEASED" | "AIRING";
  ctaLabel: string;
  isUpcoming: boolean;
  isPublished: boolean;
  isPlayable: boolean;
  watchUrl: string;
  seasonPoster: string;
  thumbnailUrl: string;
}

/**
 * Airing Schedule Driven Hero Resolver
 * Resolves airing episode metadata dynamically from AniList AiringSchedule & Backend Publication status
 */
export function resolveAiringHeroItem(params: {
  anime: { id: number | string; slug?: string; title: string; image?: string; banner?: string; episodes?: number };
  airingScheduleData?: { episode?: number; airingAt?: number; timeUntilAiring?: number };
  backendPublishedEpisodeCount?: number;
  episodesData?: { episode_number: number; title?: string; thumbnail_url?: string }[];
}): ResolvedAiringState {
  const { anime, airingScheduleData, backendPublishedEpisodeCount = 0, episodesData = [] } = params;

  const animeId = anime.id;
  const slug = anime.slug || String(animeId);
  const nowUnix = Math.floor(Date.now() / 1000);

  // 1. Resolve Episode Number from Airing Schedule -> Backend Published -> Default episodes count
  let episodeNumber = 1;
  if (airingScheduleData?.episode) {
    episodeNumber = airingScheduleData.episode;
  } else if (backendPublishedEpisodeCount > 0) {
    episodeNumber = backendPublishedEpisodeCount;
  } else if (anime.episodes && anime.episodes > 0) {
    episodeNumber = anime.episodes;
  }

  // 2. Resolve Airing Timestamps & Status
  const airingAt = airingScheduleData?.airingAt || null;
  const timeUntilAiring = airingScheduleData?.timeUntilAiring || (airingAt ? airingAt - nowUnix : null);
  const isUpcoming = airingAt ? airingAt > nowUnix : false;

  // 3. Resolve Backend Publication State
  const isPublished = backendPublishedEpisodeCount >= episodeNumber || (!isUpcoming && backendPublishedEpisodeCount > 0);
  const isPlayable = isPublished && !isUpcoming;

  // 4. Resolve Season Number dynamically using stable IDs/slug/title/episodeNumber
  const seasonNumber = parseSeasonNumber(undefined, slug, anime.title, animeId, episodeNumber);
  const seasonTag = `S${seasonNumber}`;

  // 5. Resolve Season Poster & Artwork Priority
  const epData = episodesData.find((e) => e.episode_number === episodeNumber);
  const cleanCover = getCleanCoverUrl(animeId, seasonNumber) || getCleanCoverUrl(slug, seasonNumber);
  const cleanBanner = getCleanBannerUrl(animeId) || getCleanBannerUrl(slug);

  const seasonPoster = cleanCover || anime.image || "";
  const thumbnailUrl = epData?.thumbnail_url || cleanBanner || seasonPoster;

  // 6. Format Display Labels & Status Badges
  const formattedHeroTag = `${seasonTag} | EP ${episodeNumber}`;
  const formattedPillTag = seasonTag;
  const formattedEpisodeTag = `EP ${episodeNumber}`;

  let statusLabel: "UP NEXT" | "JUST RELEASED" | "AIRING" = "AIRING";
  let ctaLabel = `Watch ${seasonTag} EP ${episodeNumber}`;

  if (isUpcoming) {
    statusLabel = "UP NEXT";
    if (timeUntilAiring && timeUntilAiring > 0) {
      const hours = Math.floor(timeUntilAiring / 3600);
      const mins = Math.floor((timeUntilAiring % 3600) / 60);
      ctaLabel = hours > 24 ? `Releases in ${Math.floor(hours / 24)}d` : `Releases in ${hours}h ${mins}m`;
    } else {
      ctaLabel = `Releases Soon`;
    }
  } else if (isPublished) {
    statusLabel = "JUST RELEASED";
    ctaLabel = `Watch ${seasonTag} EP ${episodeNumber}`;
  }

  const watchUrl = `/watch/${slug}/episode-${episodeNumber}`;

  return {
    animeId,
    slug,
    title: anime.title,
    seasonNumber,
    seasonTag,
    episodeNumber,
    formattedHeroTag,
    formattedPillTag,
    formattedEpisodeTag,
    airingAt,
    timeUntilAiring,
    statusLabel,
    ctaLabel,
    isUpcoming,
    isPublished,
    isPlayable,
    watchUrl,
    seasonPoster,
    thumbnailUrl,
  };
}
