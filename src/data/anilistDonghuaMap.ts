/**
 * AniList Donghua ID Mappings
 * 
 * Maps local database anime IDs to their corresponding AniList media IDs.
 * Used by the AniList provider to bypass search queries and fetch details directly.
 */

export const anilistDonghuaMap: Record<string | number, number> = {
  1: 100806, // Battle Through The Heavens
  2: 110956, // Heaven Official's Blessing
  3: 160492, // Dragon Prince Yuan
  4: 102140, // Soul Land
  5: 114092, // The Daily Life of the Immortal King
  6: 148043, // Throne Of Seal
  7: 134108, // Perfect World
  8: 106880, // Stellar Transformations
  9: 148042, // Jade Dynasty
  10: 125139, // Swallowed Star
  11: 164057, // Renegade Immortal
  12: 170792, // Tales of Herding Gods
  13: 198706, // The Great Ruler (Fallback ID mapping)
  
  // Stable slug mappings
  "battle-through-the-heavens": 100806,
  "battle-through-the-heavens-season-5": 137728,
  "dou-po-cangqiong-nian-fan": 137728,
  "heaven-officials-blessing": 110956,
  "heaven-officials-blessing-season-2": 154474,
  "heaven-officials-blessing-s2": 154474,
  "dragon-prince-yuan": 160492,
  "soul-land": 102140,
  "the-daily-life-of-the-immortal-king": 114092,
  "throne-of-seal": 148043,
  "perfect-world": 134108,
  "stellar-transformations": 106880,
  "jade-dynasty": 148042,
  "swallowed-star": 125139,
  "renegade-immortal": 164057,
  "renegade-immortal-movie-battle-of-the-gods": 2801634,
  "ri-movie-1": 2801634,
  "tales-of-herding-gods": 170792,
  "the-great-ruler": 134088,
  "the-great-ruler-3d": 134088,
  "the-great-ruler-season-2": 198706,
};

/**
 * Helper to get the AniList ID for a given local anime ID or slug.
 */
export function getAniListId(localKey: string | number): number | null {
  return anilistDonghuaMap[localKey] || null;
}

/**
 * Clean high-resolution AniList/official cover image mapping
 * Used to enrich local catalog items that contain old watermarked local assets.
 */
import swallowedStarS1Poster from "@/assets/posters/swallowed-star-s1.webp";
import btthS1Poster from "@/assets/posters/btth-s1.webp";
import btthS5Poster from "@/assets/posters/btth-s5.webp";
import hobPoster from "@/assets/donghua-2.webp";
import dragonPrincePoster from "@/assets/donghua-3.webp";
import greatRulerPoster from "@/assets/the-great-ruler-2-hero.webp";
import soulLandPoster from "@/assets/donghua-4.webp";
import perfectWorldPoster from "@/assets/donghua-7.webp";
import stellarPoster from "@/assets/donghua-8.webp";
import jadeDynastyPoster from "@/assets/donghua-9.webp";
import renegadePoster from "@/assets/donghua-11.webp";

export const cleanCoverMap: Record<number | string, string> = {
  1: btthS5Poster,
  2: hobPoster,
  3: dragonPrincePoster,
  4: soulLandPoster,
  7: perfectWorldPoster,
  8: stellarPoster,
  9: jadeDynastyPoster,
  10: swallowedStarS1Poster,
  11: renegadePoster,
  13: greatRulerPoster,
  100806: btthS1Poster,
  137728: btthS5Poster,
  110956: hobPoster,
  154474: hobPoster,
  160492: dragonPrincePoster,
  102140: soulLandPoster,
  114092: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx114092-4113e6E19E7b.jpg",
  148043: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx148043-9K6m4P3Q2R1.jpg",
  134108: perfectWorldPoster,
  106880: stellarPoster,
  148042: jadeDynastyPoster,
  125139: swallowedStarS1Poster,
  164057: renegadePoster,
  2801634: renegadePoster,
  170792: renegadePoster,
  134088: greatRulerPoster,
  198706: greatRulerPoster,
  "stellar-transformations": stellarPoster,
  "stellar-transformation": stellarPoster,
  "stellar-transformation-final-season": stellarPoster,
  "renegade-immortal": renegadePoster,
  "renegade-immortal-movie-battle-of-the-gods": renegadePoster,
  "ri-movie-1": renegadePoster,
  "jade-dynasty": jadeDynastyPoster,
  "soul-land": soulLandPoster,
  "soul-land-season-2": soulLandPoster,
  "swallowed-star": swallowedStarS1Poster,
  "perfect-world": perfectWorldPoster,
  "battle-through-the-heavens": btthS5Poster,
  "battle-through-the-heavens-season-1": btthS1Poster,
  "1-season-1": btthS1Poster,
  "battle-through-the-heavens-season-5": btthS5Poster,
  "1-season-5": btthS5Poster,
  "heaven-officials-blessing": hobPoster,
  "heaven-officials-blessing-season-2": hobPoster,
  "heaven-officials-blessing-s2": hobPoster,
  "2-season-2": hobPoster,
  "dragon-prince-yuan": dragonPrincePoster,
  "the-great-ruler": greatRulerPoster,
  "the-great-ruler-3d": greatRulerPoster,
  "the-great-ruler-season-2": greatRulerPoster,
  "13-season-2": greatRulerPoster,
};

export function getCleanCoverUrl(idOrSlug: number | string, seasonNumber?: number): string | null {
  if (seasonNumber) {
    const seasonKey = `${idOrSlug}-season-${seasonNumber}`;
    if (cleanCoverMap[seasonKey]) return cleanCoverMap[seasonKey];
  }
  const aniId = getAniListId(idOrSlug);
  if (aniId && cleanCoverMap[aniId]) return cleanCoverMap[aniId];
  if (cleanCoverMap[idOrSlug]) return cleanCoverMap[idOrSlug];
  return null;
}

export const cleanBannerMap: Record<number | string, string> = {
  100806: "https://image.tmdb.org/t/p/w1280/8B82Yj08m515p4nL180j8235m.jpg", // BTTH
  110956: "https://image.tmdb.org/t/p/w1280/tVRvBxFYz4NJDdtSfmfold2EfQn.jpg", // HOB
  160492: "https://image.tmdb.org/t/p/w1280/ozUAZYynqTakmWM5f9dqNCnQgXa.jpg", // Dragon Prince Yuan
  134088: "https://image.tmdb.org/t/p/w1280/6WOq9GYBQ50Vj6u9VjlRd7f8rzN.jpg", // The Great Ruler
  198706: "https://image.tmdb.org/t/p/w1280/6WOq9GYBQ50Vj6u9VjlRd7f8rzN.jpg", // The Great Ruler S2
  "battle-through-the-heavens": "https://image.tmdb.org/t/p/w1280/8B82Yj08m515p4nL180j8235m.jpg",
  "heaven-officials-blessing": "https://image.tmdb.org/t/p/w1280/tVRvBxFYz4NJDdtSfmfold2EfQn.jpg",
  "dragon-prince-yuan": "https://image.tmdb.org/t/p/w1280/ozUAZYynqTakmWM5f9dqNCnQgXa.jpg",
  "the-great-ruler": "https://image.tmdb.org/t/p/w1280/6WOq9GYBQ50Vj6u9VjlRd7f8rzN.jpg",
  "the-great-ruler-season-2": "https://image.tmdb.org/t/p/w1280/6WOq9GYBQ50Vj6u9VjlRd7f8rzN.jpg",
};

export function getCleanBannerUrl(idOrSlug: number | string): string | null {
  const aniId = getAniListId(idOrSlug);
  if (aniId && cleanBannerMap[aniId]) return cleanBannerMap[aniId];
  if (cleanBannerMap[idOrSlug]) return cleanBannerMap[idOrSlug];
  return null;
}
