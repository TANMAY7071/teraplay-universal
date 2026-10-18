/**
 * Centralized Donghua Filtering System
 * 
 * Enforces that only type: ANIME, countryOfOrigin: CN (Chinese origin)
 * entries are parsed and stored in the catalog, with a secondary safety filter
 * to reject obvious Japanese anime.
 */

export function isChineseDonghua(media: any): boolean {
  if (!media) return false;

  // 1. Get origin country code. Default to "CN" for local database/mock fallbacks that lack country metadata.
  const country = (media.countryOfOrigin || media.country_of_origin || media.country || "CN").toString().toUpperCase();

  // AniList's countryOfOrigin is the primary requirement.
  // We strictly require CN (China).
  if (country !== "CN") {
    return false;
  }

  // 2. Validate Type/Format if present
  const type = media.type || "";
  const format = media.format || "";
  // If type is defined and not ANIME, reject.
  if (type && type !== "ANIME") {
    return false;
  }

  // 3. Extract Titles
  const title = (typeof media.title === "object"
    ? (media.title.english || media.title.userPreferred || media.title.romaji)
    : media.title) || "";
  const originalTitle = (typeof media.title === "object" ? media.title.native : media.originalTitle) || "";

  // 4. Secondary Safety: Reject if the title contains Japanese Kana characters
  const hasJapaneseKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(title + " " + originalTitle);
  if (hasJapaneseKana) {
    return false;
  }

  return true;
}
