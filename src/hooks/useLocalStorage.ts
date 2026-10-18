import { useCallback, useState } from 'react';
import type { EpisodeProgress, WatchProgress } from "@/types/anime";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue((currentValue) => {
      try {
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      } catch (error) {
        console.log(error);
        return currentValue;
      }
    });
  }, [key]);

  return [storedValue, setValue] as const;
}

export function useWatchlist() {
  return useLocalStorage<number[]>('donghua-watchlist', []);
}

export function useContinueWatching() {
  return useLocalStorage<Record<number, WatchProgress>>('donghua-continue-watching', {});
}

export function useEpisodeProgress() {
  return useLocalStorage<Record<number, Record<number, EpisodeProgress>>>('donghua-episode-progress', {});
}

export function useRatings() {
  return useLocalStorage<Record<number, number>>('donghua-ratings', {});
}

export function useFavorites() {
  return useLocalStorage<Array<number | string>>('donghua-favorites', []);
}

export function useCompleted() {
  return useLocalStorage<Array<number | string>>('donghua-completed', []);
}

