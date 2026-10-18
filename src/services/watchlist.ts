import { supabase } from "@/lib/supabase";
import { memoryCache } from "@/lib/cache";

/**
 * Watchlist services synced to Supabase (if authenticated)
 * with offline local storage cache/fallback and memory cache.
 */

const LOCAL_KEY = "donghua-watchlist";

function getLocalWatchlist(): number[] {
  try {
    const data = localStorage.getItem(LOCAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalWatchlist(watchlist: number[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(watchlist));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Local storage watchlist update failed:", e);
  }
}

export async function fetchWatchlist(userId?: string): Promise<number[]> {
  if (!userId) {
    return getLocalWatchlist();
  }

  const cacheKey = `watchlist_${userId}`;
  const cached = memoryCache.get<number[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("watchlist")
      .select("anime_id")
      .eq("user_id", userId);

    if (error) throw error;
    if (data) {
      const ids = data.map((item) => item.anime_id);
      setLocalWatchlist(ids);
      memoryCache.set(cacheKey, ids, 60_000); // 1 minute TTL
      return ids;
    }
  } catch (err) {
    console.warn("Supabase fetchWatchlist failed, falling back to local:", err);
  }

  return getLocalWatchlist();
}

export async function addToWatchlist(animeId: number, userId?: string): Promise<void> {
  const local = getLocalWatchlist();
  if (!local.includes(animeId)) {
    const newWatchlist = [...local, animeId];
    setLocalWatchlist(newWatchlist);
  }

  if (!userId) return;
  memoryCache.invalidate(`watchlist_${userId}`);

  try {
    const { error } = await supabase
      .from("watchlist")
      .upsert({ user_id: userId, anime_id: animeId, status: "plan_to_watch" });

    if (error) throw error;
  } catch (err) {
    console.error("Supabase addToWatchlist failed:", err);
  }
}

export async function removeFromWatchlist(animeId: number, userId?: string): Promise<void> {
  const local = getLocalWatchlist();
  const newWatchlist = local.filter((id) => id !== animeId);
  setLocalWatchlist(newWatchlist);

  if (!userId) return;
  memoryCache.invalidate(`watchlist_${userId}`);

  try {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", userId)
      .eq("anime_id", animeId);

    if (error) throw error;
  } catch (err) {
    console.error("Supabase removeFromWatchlist failed:", err);
  }
}
