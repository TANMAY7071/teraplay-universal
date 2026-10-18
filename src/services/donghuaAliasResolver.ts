/**
 * Donghua Alias & Multi-Name Resolution Service
 * 
 * Maps acronyms, alternate English titles, Chinese characters, pinyin, and strips season suffixes
 * so TMDB, AniList, Simkl, and local search discover Donghua regardless of search name used.
 */

import { DONGHUA_ALIASES } from "./fandomAnime";
import { searchTmdb } from "./tmdbAnime";
import { searchSimkl } from "./simklAnime";
import { searchAniList } from "./syncService";

// Popular Donghua acronyms mapping directly to canonical search keys
export const KNOWN_ACRONYMS: Record<string, string[]> = {
  "btth": ["Battle Through the Heavens", "Fights Break Sphere", "Doupo Cangqiong", "斗破苍穹"],
  "sl": ["Soul Land", "Douluo Dalu", "斗罗大陆"],
  "sl1": ["Soul Land", "Douluo Dalu", "斗罗大陆"],
  "sl2": ["Soul Land 2", "The Peerless Tang Sect", "Douluo Dalu 2", "斗罗大陆2 绝世唐门"],
  "rmji": ["Record of a Mortal's Journey to Immortality", "Mortal's Journey to Immortality", "Fan Ren Xiu Xian Chuan", "凡人修仙传"],
  "mdzs": ["Grandmaster of Demonic Cultivation", "Mo Dao Zu Shi", "The Founder of Diabolism", "魔道祖师"],
  "tgcf": ["Heaven Official's Blessing", "Tian Guan Ci Fu", "天官赐福"],
  "ri": ["Renegade Immortal", "Xian Ni", "仙逆"],
  "pw": ["Perfect World", "Wanmei Shijie", "完美世界"],
  "st": ["Swallowed Star", "Tunshi Xingkong", "吞噬星空"],
  "tgr": ["The Great Ruler", "Da Zhu Zai", "大主宰"],
  "mu": ["Martial Universe", "Wu Dong Qian Kun", "武动乾坤"],
  "wdqk": ["Wu Dong Qian Kun", "Martial Universe", "武动乾坤"],
  "sywz": ["Throne of Seal", "Shen Yin Wang Zuo", "神印王座"],
  "lotm": ["Lord of Mysteries", "Lord of the Mysteries", "诡秘之主"],
  "awe": ["A Will Eternal", "Yi Nian Yong Heng", "一念永恒"],
  "atg": ["Against the Gods", "Ni Tian Xie Shen", "逆天邪神"],
  "todag": ["Tales of Demons and Gods", "Yao Shen Ji", "妖神记"],
  "dlik": ["The Daily Life of the Immortal King", "Xian Wang De Ri Chang Sheng Huo", "仙王的日常生活"],
  "shrouding": ["Shrouding the Heavens", "Zhe Tian", "遮天"],
  "stellar": ["Stellar Transformations", "Xingchen Bian", "星辰变"],
  "dh": ["The Demon Hunter", "Cang Yuan Tu", "Cangyuantu", "沧元图"],
  "tdh": ["The Demon Hunter", "Cang Yuan Tu", "Cangyuantu", "沧元图"],
  "demonhunter": ["The Demon Hunter", "Cang Yuan Tu", "Cangyuantu", "沧元图"],
};

/**
 * Strips season markers, part indicators, and edition labels from title.
 * e.g. "Fights Break Sphere S3" -> "Fights Break Sphere"
 * e.g. "斗破苍穹 第3季" -> "斗破苍穹"
 */
export function cleanDonghuaTitle(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();

  // Strip Chinese season and special patterns
  clean = clean.replace(/第[0-9一二三四五六七八九十]+[季部篇章]/g, "");
  clean = clean.replace(/(?:特别篇|年番|重制版|重置版|剧场版|动态漫画|修仙篇|决战篇)/g, "");

  // Strip English season markers (e.g. S3, Season 3, 3rd Season, Part 2, Cour 2)
  clean = clean.replace(/\s*(?:s\d+|season\s*\d+|\d+(?:st|nd|rd|th)\s*season|part\s*\d+|cour\s*\d+|special|ova|ona)\b.*$/i, "");
  
  // Clean dangling dashes, colons, or punctuation
  clean = clean.replace(/[—–:\-\s]+$/, "").trim();

  return clean || raw.trim();
}

/**
 * Resolves all candidate search queries for a Donghua title or acronym.
 * Returns deduped list of names in optimal search order.
 */
export function resolveDonghuaSearchCandidates(query: string): string[] {
  if (!query || !query.trim()) return [];

  const raw = query.trim();
  const lower = raw.toLowerCase();
  const candidates: string[] = [];

  // 1. Check direct acronym map
  if (KNOWN_ACRONYMS[lower]) {
    candidates.push(...KNOWN_ACRONYMS[lower]);
  }

  // 2. Clean season suffix from query
  const cleaned = cleanDonghuaTitle(raw);
  if (cleaned && cleaned.toLowerCase() !== lower) {
    candidates.push(cleaned);
    const cleanedLower = cleaned.toLowerCase();
    if (KNOWN_ACRONYMS[cleanedLower]) {
      candidates.push(...KNOWN_ACRONYMS[cleanedLower]);
    }
  }

  // 3. Search fandom alias registry
  const searchKey = cleaned.toLowerCase() || lower;
  for (const [key, val] of Object.entries(DONGHUA_ALIASES)) {
    const matchesKey = searchKey === key || searchKey.includes(key) || key.includes(searchKey);
    const matchesEng = val.english.toLowerCase().includes(searchKey) || searchKey.includes(val.english.toLowerCase());
    const matchesAlt = val.alternateEnglish?.some(a => a.toLowerCase().includes(searchKey) || searchKey.includes(a.toLowerCase()));
    const matchesRom = val.romanized?.some(r => r.toLowerCase().includes(searchKey) || searchKey.includes(r.toLowerCase()));
    const matchesChn = val.chinese?.some(c => c.includes(raw) || raw.includes(c));

    if (matchesKey || matchesEng || matchesAlt || matchesRom || matchesChn) {
      if (!candidates.includes(val.english)) candidates.push(val.english);
      if (val.alternateEnglish) {
        val.alternateEnglish.forEach(a => { if (!candidates.includes(a)) candidates.push(a); });
      }
      if (val.chinese) {
        val.chinese.forEach(c => { if (!candidates.includes(c)) candidates.push(c); });
      }
      if (val.romanized) {
        val.romanized.forEach(r => { if (!candidates.includes(r)) candidates.push(r); });
      }
      break;
    }
  }

  // 4. Ensure original raw query is in list as fallback
  if (!candidates.includes(raw)) {
    candidates.push(raw);
  }
  if (cleaned && !candidates.includes(cleaned)) {
    candidates.push(cleaned);
  }

  return candidates;
}

/**
 * Searches TMDB with auto-alias cascading.
 * Iterates through candidate names until first match is found.
 */
export async function searchTmdbWithCascade(query: string): Promise<{ results: any[]; matchedAlias: string }> {
  const candidates = resolveDonghuaSearchCandidates(query);
  
  for (const candidate of candidates) {
    try {
      const results = await searchTmdb(candidate);
      if (results && results.length > 0) {
        return { results, matchedAlias: candidate };
      }
    } catch {
      // Continue to next alias
    }
  }

  return { results: [], matchedAlias: query };
}

/**
 * Searches Simkl with auto-alias cascading.
 * Iterates through candidate names until first match is found.
 */
export async function searchSimklWithCascade(query: string): Promise<{ results: any[]; matchedAlias: string }> {
  const candidates = resolveDonghuaSearchCandidates(query);

  for (const candidate of candidates) {
    try {
      const results = await searchSimkl(candidate);
      if (results && results.length > 0) {
        return { results, matchedAlias: candidate };
      }
    } catch {
      // Continue to next alias
    }
  }

  return { results: [], matchedAlias: query };
}

/**
 * Searches AniList with auto-alias cascading.
 * Iterates through candidate names until first match is found.
 */
export async function searchAniListWithCascade(query: string): Promise<{ results: any[]; matchedAlias: string }> {
  const candidates = resolveDonghuaSearchCandidates(query);

  for (const candidate of candidates) {
    try {
      const results = await searchAniList(candidate);
      if (results && results.length > 0) {
        return { results, matchedAlias: candidate };
      }
    } catch {
      // Continue to next alias
    }
  }

  return { results: [], matchedAlias: query };
}
