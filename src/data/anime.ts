import donghua1 from "@/assets/donghua-1.webp";
import donghua2 from "@/assets/donghua-2.webp";
import donghua3 from "@/assets/donghua-3.webp";
import donghua4 from "@/assets/donghua-4.webp";
import donghua5 from "@/assets/donghua-5.webp";
import donghua6 from "@/assets/donghua-6.webp";
import donghua7 from "@/assets/donghua-7.webp";
import donghua8 from "@/assets/donghua-8.webp";
import donghua9 from "@/assets/donghua-9.webp";
import donghua10 from "@/assets/donghua-10.webp";
import donghua11 from "@/assets/donghua-11.webp";
import donghua12 from "@/assets/donghua-12.webp";
import greatRulerHero from "@/assets/the-great-ruler-2-hero.webp";
import type { Anime } from "@/types/anime";

export const standardizedGenres = [
  "Action",
  "Adventure",
  "Fantasy",
  "Cultivation",
  "Martial Arts",
  "Romance",
  "Historical",
  "Sci-Fi",
  "Mystery",
] as const;

export const animeCatalog: Anime[] = [
  {
    id: 1,
    slug: "battle-through-the-heavens",
    title: "Battle Through the Heavens",
    originalTitle: "斗破苍穹",
    image: donghua1,
    rating: 9.1,
    episodes: 157,
    year: 2024,
    genre: "Cultivation",
    genres: ["Action", "Adventure", "Cultivation", "Martial Arts"],
    status: "Ongoing",
    synopsis:
      "Xiao Yan loses his talent and status, then begins a long climb through alchemy, training, and dangerous sect rivalries to reclaim his future.",
    tags: ["Clan Rivalry", "Alchemy", "Power Progression", "Epic Battles"],
    isNew: true,
    featured: true,
  },
  {
    id: 2,
    slug: "heaven-officials-blessing",
    title: "Heaven Official's Blessing",
    originalTitle: "天官赐福",
    image: donghua2,
    rating: 9.3,
    episodes: 12,
    year: 2024,
    genre: "Fantasy",
    genres: ["Fantasy", "Romance", "Mystery"],
    status: "Ongoing",
    synopsis:
      "A twice-banished crown prince ascends again and meets a mysterious figure whose devotion may be tied to secrets from his past.",
    tags: ["Mythic Realms", "Slow Burn", "Supernatural Mystery", "Gods"],
    isNew: true,
  },
  {
    id: 3,
    slug: "dragon-prince-yuan",
    title: "Dragon Prince Yuan",
    originalTitle: "元尊",
    image: donghua3,
    rating: 8.9,
    episodes: 36,
    year: 2023,
    genre: "Adventure",
    genres: ["Action", "Adventure", "Cultivation"],
    status: "Ongoing",
    synopsis:
      "A prince born with a stolen destiny trains to recover his sacred dragon blessing and protect his kingdom from rising enemies.",
    tags: ["Royal Bloodline", "Sacred Arts", "Training Arc", "Kingdom Conflict"],
  },
  {
    id: 4,
    slug: "soul-land",
    title: "Soul Land",
    originalTitle: "斗罗大陆",
    image: donghua4,
    rating: 9.0,
    episodes: 265,
    year: 2023,
    genre: "Martial Arts",
    genres: ["Adventure", "Fantasy", "Martial Arts"],
    status: "Completed",
    synopsis:
      "Tang San enters a world of martial souls, forging bonds and mastering hidden weapons while chasing the peak of cultivation.",
    tags: ["Academy", "Team Battles", "Martial Souls", "Hidden Weapons"],
  },
  {
    id: 5,
    slug: "daily-life-of-the-immortal-king",
    title: "The Daily Life of the Immortal King",
    originalTitle: "仙王的日常生活",
    image: donghua5,
    rating: 8.8,
    episodes: 52,
    year: 2023,
    genre: "Cultivation",
    genres: ["Action", "Cultivation", "Fantasy"],
    status: "Completed",
    synopsis:
      "A nearly invincible cultivator tries to live quietly at school, but his power keeps dragging him into impossible supernatural trouble.",
    tags: ["Overpowered Lead", "School Life", "Hidden Power", "Supernatural"],
  },
  {
    id: 6,
    slug: "throne-of-seal",
    title: "Throne Of Seal",
    originalTitle: "神印王座",
    image: donghua6,
    rating: 9.4,
    episodes: 168,
    year: 2024,
    genre: "Fantasy",
    genres: ["Action", "Adventure", "Fantasy"],
    status: "Ongoing",
    synopsis:
      "A young knight trains under a sacred order while humanity battles demons and searches for heroes worthy of divine thrones.",
    tags: ["Knights", "Demon War", "Sacred Trials", "Hero Party"],
  },
  {
    id: 7,
    slug: "perfect-world",
    title: "Perfect World",
    originalTitle: "完美世界",
    image: donghua7,
    rating: 8.7,
    episodes: 182,
    year: 2023,
    genre: "Cultivation",
    genres: ["Action", "Adventure", "Cultivation"],
    status: "Ongoing",
    synopsis:
      "Shi Hao grows from a gifted child into a fierce cultivator, crossing brutal lands filled with ancient clans, beasts, and divine legacies.",
    tags: ["Ancient Clans", "Beast Realms", "Divine Legacy", "Power Growth"],
  },
  {
    id: 8,
    slug: "stellar-transformations",
    title: "Stellar Transformations",
    originalTitle: "星辰变",
    image: donghua8,
    rating: 8.9,
    episodes: 45,
    year: 2023,
    genre: "Sci-Fi",
    genres: ["Adventure", "Cultivation", "Sci-Fi"],
    status: "Completed",
    synopsis:
      "Unable to practice conventional internal arts, Qin Yu follows a harsher path that eventually opens toward cosmic cultivation.",
    tags: ["Cosmic Scale", "Body Tempering", "Immortal Realms", "Underdog"],
  },
  {
    id: 9,
    slug: "jade-dynasty",
    title: "Jade Dynasty",
    originalTitle: "诛仙",
    image: donghua9,
    rating: 9.2,
    episodes: 66,
    year: 2023,
    genre: "Martial Arts",
    genres: ["Action", "Fantasy", "Martial Arts", "Romance"],
    status: "Ongoing",
    synopsis:
      "After tragedy destroys his village, Zhang Xiaofan enters a righteous sect and becomes caught between love, loyalty, and forbidden power.",
    tags: ["Sect Drama", "Forbidden Arts", "Tragedy", "Romance"],
  },
  {
    id: 10,
    slug: "swallowed-star",
    title: "Swallowed Star",
    originalTitle: "吞噬星空",
    image: donghua10,
    rating: 8.6,
    episodes: 95,
    year: 2024,
    genre: "Sci-Fi",
    genres: ["Action", "Adventure", "Sci-Fi"],
    status: "Ongoing",
    synopsis:
      "In a future overrun by monsters, Luo Feng evolves from a fighter protecting his family into a force capable of facing cosmic threats.",
    tags: ["Future Earth", "Monsters", "Space", "Evolution"],
    isNew: true,
  },
  {
    id: 11,
    slug: "renegade-immortal",
    title: "Renegade Immortal",
    originalTitle: "仙逆",
    image: donghua11,
    rating: 8.8,
    episodes: 97,
    year: 2023,
    genre: "Cultivation",
    genres: ["Action", "Cultivation", "Mystery"],
    status: "Ongoing",
    synopsis:
      "Wang Lin enters the cultivation world with ordinary talent and survives through patience, ruthless choices, and a relentless will.",
    tags: ["Dark Cultivation", "Survival", "Vengeance", "Dao Heart"],
  },
  {
    id: 12,
    slug: "tales-of-herding-gods",
    title: "Tales of Herding Gods",
    originalTitle: "牧神记",
    image: donghua12,
    rating: 9.1,
    episodes: 39,
    year: 2024,
    genre: "Mystery",
    genres: ["Adventure", "Fantasy", "Mystery"],
    status: "Ongoing",
    synopsis:
      "Raised by strange masters in a forbidden village, Qin Mu steps into a vast world where divine secrets and old powers wait beneath the surface.",
    tags: ["Hidden Masters", "Forbidden Lands", "Ancient Secrets", "Wonder"],
  },
  {
    id: 13,
    slug: "the-great-ruler-season-2",
    title: "The Great Ruler",
    originalTitle: "大主宰",
    image: greatRulerHero,
    rating: 9.2,
    episodes: 52,
    year: 2026,
    genre: "Action",
    genres: ["Action", "Fantasy", "Martial Arts", "Adventure"],
    status: "Ongoing",
    synopsis:
      "Mu Chen returns on his greatest journey yet, where ancient powers awaken and the fate of countless realms hangs in the balance.",
    tags: ["Ancient Powers", "Great Journey", "Realms Fate", "Martial Arts"],
    isNew: true,
  },
];

export const trendingAnime = animeCatalog.slice(0, 6);
export const popularAnime = animeCatalog.slice(6, 12);

export const findAnimeBySlug = (slug: string | undefined) =>
  animeCatalog.find((anime) => anime.slug === slug);

export const findAnimeById = (id: string | number | undefined) =>
  animeCatalog.find((anime) => anime.id === Number(id));

export const getRelatedAnime = (anime: Anime, limit = 4) =>
  animeCatalog
    .filter(
      (item) =>
        item.id !== anime.id && item.genres.some((genre) => anime.genres.includes(genre)),
    )
    .slice(0, limit);
