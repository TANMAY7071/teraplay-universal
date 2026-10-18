export interface DonghuaMetric {
  id: number;
  slug: string;
  title: string;
  image: string;
  rating: number;
  genres: string[];
  views: number;
  weeklyViews: number;
  monthlyViews: number;
  favoritesCount: number;
  rankMovement: number; // >0 for up, <0 for down, 0 for stable
}

const STORAGE_KEY = "donghua_stream_watch_metrics_v1";

// Helper to generate seed metrics derived consistently from catalog item properties
export function getSeedMetrics(item: any, index: number = 0): DonghuaMetric {
  const baseRating = Number(item.rating) || 7.5;
  const epCount = Number(item.episodes) || 12;
  
  // Calculate realistic views driven by actual rating and catalog prominence
  // Exponential rating weight ensures 9.0+ rated hits naturally dominate trending
  const ratingFactor = Math.pow(Math.max(1, baseRating) / 10, 3.5);
  const allTimeViews = Math.round((ratingFactor * 2200000) + (epCount * 3200));
  const monthlyViews = Math.round(allTimeViews * 0.32);
  const weeklyViews = Math.round(monthlyViews * 0.28);
  const favoritesCount = Math.round(allTimeViews * 0.08);

  // Dynamic movement simulation based on catalog ID seed
  const movementOptions = [2, -1, 0, 3, -2, 1, 0, 4, -1, 0];
  const rankMovement = movementOptions[(item.id || index) % movementOptions.length];

  return {
    id: item.id,
    slug: item.slug || `donghua-${item.id}`,
    title: item.title,
    image: item.image || item.poster || "",
    rating: baseRating,
    genres: item.genres || ["Action", "Cultivation"],
    views: allTimeViews,
    weeklyViews,
    monthlyViews,
    favoritesCount,
    rankMovement
  };
}

// Track local watch telemetry ping
export function recordWatchEvent(donghuaId: number, durationSeconds: number = 30) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    const current = store[donghuaId] || { views: 0, watchSeconds: 0 };
    
    store[donghuaId] = {
      views: current.views + 1,
      watchSeconds: current.watchSeconds + durationSeconds,
      lastWatched: Date.now()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("Telemetry storage warning:", e);
  }
}

// Get Top 10 ranked Donghua based on window ("weekly" | "monthly" | "all-time")
export function getTopDonghuaRankings(catalog: any[], timeWindow: "weekly" | "monthly" | "all-time" = "weekly"): DonghuaMetric[] {
  if (!catalog || catalog.length === 0) return [];

  // Get stored telemetry additions
  let telemetryMap: Record<number, { views: number; watchSeconds: number }> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) telemetryMap = JSON.parse(raw);
  } catch (e) {
    // Ignore storage errors
  }

  const list: DonghuaMetric[] = catalog.map((item, idx) => {
    const seed = getSeedMetrics(item, idx);
    const userStats = telemetryMap[item.id];
    
    if (userStats) {
      seed.views += userStats.views * 150;
      seed.monthlyViews += userStats.views * 80;
      seed.weeklyViews += userStats.views * 40;
    }
    return seed;
  });

  // Sort based on time window metric
  list.sort((a, b) => {
    if (timeWindow === "weekly") return b.weeklyViews - a.weeklyViews;
    if (timeWindow === "monthly") return b.monthlyViews - a.monthlyViews;
    return b.views - a.views;
  });

  return list.slice(0, 10);
}

// Format numbers (e.g. 132000 -> "132K", 2400000 -> "2.4M")
export function formatMetricCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}K`;
  return num.toString();
}

// Format real episode air date into readable relative or calendar format
export function formatEpisodeReleaseDate(dateStr?: string, fallbackYear?: number | string): string {
  if (!dateStr) {
    return fallbackYear ? `Released ${fallbackYear}` : "Released";
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return fallbackYear ? `Released ${fallbackYear}` : "Released";
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Airing ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
}

