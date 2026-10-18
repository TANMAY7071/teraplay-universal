import { supabase } from "@/lib/supabase";

/**
 * "Watch now, sign up later" sync.
 *
 * Guests track everything in localStorage only (zero DB writes while logged
 * out — no anonymous accounts, no dead rows). The moment a visitor signs in,
 * this routine performs a small number of batched writes that migrate that
 * local history into their real account:
 *   1. One read to resolve episode IDs for the locally-touched anime.
 *   2. One read of the account's existing rows, so only *newer* local
 *      entries are written (never clobber fresher account data).
 *   3. One batched upsert for watch progress, one for the watchlist.
 *
 * Local data is intentionally KEPT on failure so the next login retries.
 */

const EPISODE_KEY = "donghua-episode-progress";
const WATCHLIST_KEY = "donghua-watchlist";

interface LocalEpisodeProgress {
  episode: number;
  time: number;
  totalTime: number;
  completed: boolean;
  updatedAt: string;
}

export interface GuestSyncResult {
  episodesSynced: number;
  watchlistSynced: number;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function syncGuestProgressToAccount(userId: string): Promise<GuestSyncResult> {
  const result: GuestSyncResult = { episodesSynced: 0, watchlistSynced: 0 };

  try {
    // ---------- 1. Watch progress ----------
    const localEpisodes = readJson<Record<string, Record<string, LocalEpisodeProgress>>>(EPISODE_KEY, {});
    const animeIds = Object.keys(localEpisodes).map(Number).filter((n) => Number.isFinite(n) && n > 0);

    if (animeIds.length > 0) {
      // Resolve the DB episode IDs this local data points at (single batched read)
      const { data: episodes, error: epsError } = await supabase
        .from("episodes")
        .select("id, anime_id, episode_number")
        .in("anime_id", animeIds);
      if (epsError) throw epsError;

      const episodeIdMap = new Map<string, number>();
      (episodes || []).forEach((e) => {
        episodeIdMap.set(`${e.anime_id}:${e.episode_number}`, e.id);
      });

      // Account's existing rows — never overwrite fresher data with stale local data
      const { data: existing, error: existingError } = await supabase
        .from("watch_progress")
        .select("anime_id, episode_number, updated_at")
        .eq("user_id", userId)
        .in("anime_id", animeIds);
      if (existingError) throw existingError;

      const accountUpdatedAt = new Map<string, string>();
      (existing || []).forEach((r) => {
        accountUpdatedAt.set(`${r.anime_id}:${r.episode_number}`, r.updated_at);
      });

      const rows: Array<{
        user_id: string;
        anime_id: number;
        episode_id: number;
        episode_number: number;
        current_time: number;
        total_time: number;
        completed: boolean;
        updated_at: string;
      }> = [];

      for (const [animeIdKey, episodesMap] of Object.entries(localEpisodes)) {
        const animeId = Number(animeIdKey);
        for (const [episodeNumberKey, ep] of Object.entries(episodesMap)) {
          const episodeId = episodeIdMap.get(`${animeId}:${episodeNumberKey}`);
          if (!episodeId) continue; // episode not in DB yet — keep it locally

          const accountUpdatedAtStr = accountUpdatedAt.get(`${animeId}:${episodeNumberKey}`);
          if (accountUpdatedAtStr && new Date(accountUpdatedAtStr) >= new Date(ep.updatedAt)) {
            continue; // account copy is newer — skip
          }

          rows.push({
            user_id: userId,
            anime_id: animeId,
            episode_id: episodeId,
            episode_number: Number(episodeNumberKey),
            current_time: ep.time,
            total_time: ep.totalTime,
            completed: ep.completed,
            updated_at: ep.updatedAt,
          });
        }
      }

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("watch_progress")
          .upsert(rows, { onConflict: "user_id,episode_id" });
        if (upsertError) throw upsertError;
        result.episodesSynced = rows.length;
      }
    }

    // ---------- 2. Watchlist (additive) ----------
    const localWatchlist = readJson<number[]>(WATCHLIST_KEY, []);
    if (localWatchlist.length > 0) {
      const { data: existingList, error: listError } = await supabase
        .from("watchlist")
        .select("anime_id")
        .eq("user_id", userId);
      if (listError) throw listError;

      const alreadySaved = new Set((existingList || []).map((r) => r.anime_id));
      const rows = localWatchlist
        .filter((id) => !alreadySaved.has(id))
        .map((animeId) => ({ user_id: userId, anime_id: animeId, status: "plan_to_watch" }));

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("watchlist")
          .upsert(rows, { onConflict: "user_id,anime_id" });
        if (upsertError) throw upsertError;
        result.watchlistSynced = rows.length;
      }
    }
  } catch (err) {
    // Local data stays intact — the next sign-in retries automatically.
    console.warn("Guest progress sync failed (kept locally for retry):", err);
  }

  return result;
}
