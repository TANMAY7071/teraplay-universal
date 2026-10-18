/**
 * Donghua → Trakt Slug Mapping
 * 
 * Manual mapping of local anime slugs to their Trakt equivalents.
 * Trakt may use different slug formats or may not have entries for
 * all donghua titles. This map is used by traktAnime.ts to resolve
 * local slugs to Trakt slugs before making API calls.
 * 
 * Format: { "local-slug": "trakt-slug-or-id" }
 * 
 * Discovery: Use the TraktEvalPanel to search for titles and find
 * their Trakt slugs, then add them here.
 */

export const donghuaTraktMap: Record<string, string> = {
  // ─── Popular Donghua (to be populated during evaluation) ───
  
  // Battle Through the Heavens (斗破苍穹)
  // Search on Trakt to find the correct slug
  "battle-through-the-heavens": "battle-through-the-heavens",

  // Heaven Official's Blessing (天官赐福)
  "heaven-officials-blessing": "heaven-official-s-blessing",

  // Soul Land (斗罗大陆)
  "soul-land": "soul-land",

  // The Daily Life of the Immortal King (仙王的日常生活)
  "the-daily-life-of-the-immortal-king": "the-daily-life-of-the-immortal-king",

  // Stellar Transformations (星辰变)
  "stellar-transformations": "stellar-transformations",

  // A Record of a Mortal's Journey to Immortality (凡人修仙传)
  "a-record-of-a-mortals-journey-to-immortality": "a-record-of-a-mortal-s-journey-to-immortality",

  // Martial Universe (武动乾坤)
  "martial-universe": "martial-universe",

  // Renegade Immortal (仙逆)
  "renegade-immortal": "renegade-immortal",

  // The Great Ruler (大主宰)
  "the-great-ruler": "the-great-ruler",

  // Perfect World (完美世界)
  "perfect-world": "perfect-world",

  // Swallowed Star (吞噬星空)
  "swallowed-star": "swallowed-star",

  // Throne of Seal (神印王座)
  "throne-of-seal": "throne-of-seal",
};

/**
 * Returns the Trakt slug for a local slug, or the local slug itself
 * if no mapping exists (Trakt will return 404 if it doesn't recognize it).
 */
export function resolveTraktSlug(localSlug: string): string {
  return donghuaTraktMap[localSlug] || localSlug;
}
