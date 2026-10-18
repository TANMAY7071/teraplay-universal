export interface UserWatchProgress {
  universeId: string;
  installmentId: string | number;
  installmentTitle: string;
  episodeNumber: number;
  completed?: boolean;
  updatedAt: number;
}

const PROGRESS_KEY = "donghuastream_watch_progress";

// Helper to load all progress entries
export const getAllProgress = (): Record<string, UserWatchProgress> => {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      // Seed a default watch progress profile for BTTH testing so returning flow works immediately
      const defaultProgress: Record<string, UserWatchProgress> = {
        "battle-through-the-heavens": {
          universeId: "battle-through-the-heavens",
          installmentId: "btth-s5",
          installmentTitle: "Season 5 (Nian Fan)",
          episodeNumber: 156,
          completed: false,
          updatedAt: Date.now()
        }
      };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(defaultProgress));
      return defaultProgress;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to load progress from localStorage", error);
    return {};
  }
};

// Helper to get progress for a specific universe
export const getProgress = (universeId: string): UserWatchProgress | null => {
  const all = getAllProgress();
  return all[universeId] || null;
};

// Helper to save watch progress
export const saveProgress = (
  universeId: string,
  installmentId: string | number,
  installmentTitle: string,
  episodeNumber: number,
  completed: boolean = false
): void => {
  try {
    const all = getAllProgress();
    all[universeId] = {
      universeId,
      installmentId,
      installmentTitle,
      episodeNumber,
      completed,
      updatedAt: Date.now()
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch (error) {
    console.error("Failed to save progress to localStorage", error);
  }
};
