import { supabase } from "@/lib/supabase";
import type { EpisodeProgress, WatchProgress } from "@/types/anime";

/**
 * Service to sync watch progress between local storage cache (guest/offline)
 * and Supabase backend (authenticated user).
 */

const CONTINUE_KEY = "donghua-continue-watching";
const EPISODE_KEY = "donghua-episode-progress";

// 1. LOCAL STORAGE HELPERS
function getLocalContinue(): Record<number, WatchProgress> {
  try {
    const data = localStorage.getItem(CONTINUE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setLocalContinue(value: Record<number, WatchProgress>) {
  localStorage.setItem(CONTINUE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("storage"));
}

function getLocalEpisodes(): Record<number, Record<number, EpisodeProgress>> {
  try {
    const data = localStorage.getItem(EPISODE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setLocalEpisodes(value: Record<number, Record<number, EpisodeProgress>>) {
  localStorage.setItem(EPISODE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("storage"));
}

// 2. SERVICE ROUTINES
export async function fetchContinueWatching(userId?: string): Promise<Record<number, WatchProgress>> {
  if (!userId) {
    return getLocalContinue();
  }

  try {
    // Select latest progress per anime for the user
    const { data, error } = await supabase
      .from("watch_progress")
      .select("anime_id, episode_number, current_time, total_time, completed, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    if (data) {
      const continueMap: Record<number, WatchProgress> = {};
      data.forEach((p) => {
        // Since we order by updated_at desc, we store the first (latest) progress for each anime
        if (!continueMap[p.anime_id]) {
          continueMap[p.anime_id] = {
            animeId: p.anime_id,
            episode: p.episode_number,
            time: Math.round(p.current_time),
            totalTime: Math.round(p.total_time),
            updatedAt: p.updated_at,
          };
        }
      });
      // Update local storage cache
      setLocalContinue(continueMap);
      return continueMap;
    }
  } catch (err) {
    console.warn("Supabase fetchContinueWatching failed, using local fallback:", err);
  }

  return getLocalContinue();
}

export async function fetchEpisodeProgress(
  animeId: number,
  userId?: string
): Promise<Record<number, EpisodeProgress>> {
  const local = getLocalEpisodes();
  const animeLocal = local[animeId] || {};

  if (!userId) {
    return animeLocal;
  }

  try {
    const { data, error } = await supabase
      .from("watch_progress")
      .select("episode_number, current_time, total_time, completed, updated_at")
      .eq("user_id", userId)
      .eq("anime_id", animeId);

    if (error) throw error;

    if (data && data.length > 0) {
      const epMap: Record<number, EpisodeProgress> = {};
      data.forEach((p) => {
        epMap[p.episode_number] = {
          episode: p.episode_number,
          time: Math.round(p.current_time),
          totalTime: Math.round(p.total_time),
          completed: p.completed,
          updatedAt: p.updated_at,
        };
      });

      // Update local storage nested cache
      const newLocal = { ...local, [animeId]: epMap };
      setLocalEpisodes(newLocal);
      return epMap;
    }
  } catch (err) {
    console.warn(`Supabase fetchEpisodeProgress failed for ID ${animeId}, using local fallback:`, err);
  }

  return animeLocal;
}

export async function saveWatchProgress(params: {
  userId?: string;
  animeId: number;
  episodeId: number;
  episodeNumber: number;
  currentTime: number;
  duration: number;
  completed: boolean;
  episodeImage?: string;
  seasonName?: string;
  installmentType?: string;
  episodeTitle?: string;
}): Promise<void> {
  const { userId, animeId, episodeId, episodeNumber, currentTime, duration, completed, episodeImage, seasonName, installmentType, episodeTitle } = params;
  const nowStr = new Date().toISOString();

  // 1. Update Local Storage Cache
  const localContinue = getLocalContinue();
  localContinue[animeId] = {
    animeId: animeId,
    episode: episodeNumber,
    time: Math.round(currentTime),
    totalTime: Math.round(duration),
    updatedAt: nowStr,
    episodeImage,
    seasonName,
    installmentType,
    episodeTitle,
  };
  setLocalContinue(localContinue);

  const localEpisodes = getLocalEpisodes();
  if (!localEpisodes[animeId]) {
    localEpisodes[animeId] = {};
  }
  localEpisodes[animeId][episodeNumber] = {
    episode: episodeNumber,
    time: Math.round(currentTime),
    totalTime: Math.round(duration),
    completed: completed,
    updatedAt: nowStr,
  };
  setLocalEpisodes(localEpisodes);

  // 2. Update Supabase
  if (!userId) return;

  try {
    const { error } = await supabase
      .from("watch_progress")
      .upsert(
        {
          user_id: userId,
          anime_id: animeId,
          episode_id: episodeId,
          episode_number: episodeNumber,
          current_time: currentTime,
          total_time: duration,
          completed: completed,
          updated_at: nowStr,
        },
        { onConflict: "user_id,episode_id" }
      );

    if (error) throw error;
  } catch (err) {
    console.error("Supabase saveWatchProgress failed:", err);
  }
}

export async function deleteWatchProgress(animeId: number, userId?: string): Promise<void> {
  // 1. Remove from local continue watching cache
  const localContinue = getLocalContinue();
  delete localContinue[animeId];
  setLocalContinue(localContinue);

  // 2. Remove from local nested episode progress cache
  const localEpisodes = getLocalEpisodes();
  delete localEpisodes[animeId];
  setLocalEpisodes(localEpisodes);

  // 3. Remove from Supabase
  if (!userId) return;

  try {
    const { error } = await supabase
      .from("watch_progress")
      .delete()
      .eq("user_id", userId)
      .eq("anime_id", animeId);

    if (error) throw error;
  } catch (err) {
    console.error("Supabase deleteWatchProgress failed:", err);
  }
}

export async function fetchCompletedEpisodesCount(userId?: string): Promise<number> {
  const getLocalCount = () => {
    const local = getLocalEpisodes();
    let count = 0;
    Object.values(local).forEach((animeProgress) => {
      Object.values(animeProgress).forEach((ep) => {
        if (ep.completed || (ep.time / ep.totalTime) >= 0.9) {
          count++;
        }
      });
    });
    return count;
  };

  if (!userId) {
    return getLocalCount();
  }

  try {
    const { count, error } = await supabase
      .from("watch_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true);

    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.warn("Supabase fetchCompletedEpisodesCount failed, using local fallback:", err);
    return getLocalCount();
  }
}
