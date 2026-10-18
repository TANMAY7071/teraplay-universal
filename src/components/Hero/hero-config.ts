import heroImage from "@/assets/hero-donghua.webp";
import posterImage from "@/assets/donghua-1.webp";
import donghua2 from "@/assets/donghua-2.webp";
import donghua3 from "@/assets/donghua-3.webp";
import greatRulerHero from "@/assets/the-great-ruler-2-hero.webp";
import heavenOfficialMobile from "@/assets/heaven-officials-blessing-mobile.webp";

export interface HeroSlideConfig {
  id: number;
  title: string;
  originalTitle?: string; // e.g. "斗破苍穹"
  slug: string;
  heroType: "action" | "single" | "dual" | "landscape" | "romance";
  image: string; // Desktop background image
  mobileImage?: string; // Optional mobile-specific background image
  logo?: string; // Optional transparent logo image path
  overlay: "dark" | "cinema" | "soft" | "gradient";
  focus: string; // CSS object-position values e.g. "right center"
  focusX?: number; // Focal X offset (0-100)
  focusY?: number; // Focal Y offset (0-100)
  trailerUrl?: string; // Looping trailer path
  youtubeTrailerId?: string; // Standard youtube ID like 'dQw4w9WgXcQ'
  trailerStart?: number; // Start time in seconds
  trailerEnd?: number; // End time in seconds
  enableDesktopTrailer?: boolean;
  enableMobileTrailer?: boolean;
  titleAlignment: "left" | "center" | "right";
  theme: "gold" | "red" | "blue" | "orange" | "cyan";
  badge: string;
  rating: number;
  year: number;
  episodes: number; // Latest aired episode
  totalPlannedEpisodes?: number; // Total planned/expected episodes
  genres: string[];
  description: string;
}

export const slidesConfig: HeroSlideConfig[] = [
  {
    id: 1,
    title: "Battle Through The Heavens",
    originalTitle: "斗破苍穹",
    slug: "battle-through-the-heavens",
    heroType: "single",
    image: heroImage,
    mobileImage: posterImage, // Uses the vertical poster for perfect character focus on mobile
    overlay: "dark",
    focus: "center top",
    focusX: 50,
    focusY: 15,
    youtubeTrailerId: "1nNxpCNRfO8",
    enableDesktopTrailer: true,
    enableMobileTrailer: false,
    titleAlignment: "left",
    theme: "blue",
    badge: "🆕 New Episode Today",
    rating: 9.2,
    year: 2024,
    episodes: 157,
    genres: ["Action", "Adventure", "Cultivation", "Martial Arts"],
    description: "Once a prodigy, Xiao Yan loses everything—until a mysterious master helps him rise again. His journey to power is just beginning."
  },
  {
    id: 2,
    title: "Heaven Official's Blessing",
    originalTitle: "天官赐福",
    slug: "heaven-officials-blessing",
    heroType: "dual",
    image: donghua2,
    mobileImage: heavenOfficialMobile, // Beautiful dual character artwork showing both leads
    overlay: "soft",
    focus: "center top",
    focusX: 50,
    focusY: 20,
    youtubeTrailerId: "C-U2_gTjzhI",
    enableDesktopTrailer: true,
    enableMobileTrailer: true,
    titleAlignment: "left",
    theme: "red",
    badge: "🔥 Trending #1",
    rating: 9.3,
    year: 2024,
    episodes: 12,
    genres: ["Fantasy", "Romance", "Mystery"],
    description: "A twice-banished crown prince ascends to the heavens for the third time, only to encounter a mysterious ghost king who has waited centuries."
  },
  {
    id: 3,
    title: "Dragon Prince Yuan",
    originalTitle: "元尊",
    slug: "dragon-prince-yuan",
    heroType: "landscape",
    image: donghua3,
    mobileImage: donghua3,
    overlay: "gradient",
    focus: "center center",
    focusX: 50,
    focusY: 48,
    youtubeTrailerId: "zPdUE9j1leY",
    enableDesktopTrailer: true,
    enableMobileTrailer: true,
    titleAlignment: "left",
    theme: "cyan",
    badge: "⭐ Editor's Pick",
    rating: 8.9,
    year: 2023,
    episodes: 36,
    genres: ["Action", "Adventure", "Cultivation"],
    description: "Born with a stolen sacred dragon destiny, Zhou Yuan trains tirelessly to reclaim his birthright and save his fallen royal bloodline."
  },
  {
    id: 13,
    title: "The Great Ruler",
    originalTitle: "大主宰",
    slug: "the-great-ruler-season-2",
    heroType: "action",
    image: "https://image.tmdb.org/t/p/w1280/6WOq9GYBQ50Vj6u9VjlRd7f8rzN.jpg",
    mobileImage: "https://image.tmdb.org/t/p/w780/e9kdsUK01YSa8Ou5tO72QJ0830X.jpg",
    overlay: "cinema",
    focus: "center center",
    focusX: 50,
    focusY: 35,
    youtubeTrailerId: "hQTb1OwOeJg",
    trailerStart: 7,
    trailerEnd: 101,
    enableDesktopTrailer: true,
    enableMobileTrailer: true,
    titleAlignment: "left",
    theme: "gold",
    badge: "⭐ 9.2/10",
    rating: 9.2,
    year: 2026,
    episodes: 39,
    totalPlannedEpisodes: 52,
    genres: ["Action", "Fantasy", "Martial Arts", "Adventure"],
    description: "Mu Chen returns on his greatest journey yet, where ancient powers awaken and the fate of countless realms hangs in the balance."
  }
];
