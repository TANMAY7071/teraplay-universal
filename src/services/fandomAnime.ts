/**
 * Fandom (MediaWiki) API Service
 * 
 * Interfaces with any Fandom wiki using the MediaWiki action API.
 * Supports page search, full page parsing (intro, sections, infobox parsing).
 */

import type { Anime } from "@/types/anime";

export interface DonghuaAliasEntry {
  english: string;
  alternateEnglish?: string[];
  romanized?: string[];
  chinese?: string[];
  subdomain: string;
}

export const DONGHUA_ALIASES: Record<string, DonghuaAliasEntry> = {
  "battle through the heavens": {
    english: "Battle Through the Heavens",
    alternateEnglish: ["Fights Break Sphere", "BTTH"],
    romanized: ["Doupo Cangqiong", "Dou Po Cang Qiong"],
    chinese: ["斗破苍穹"],
    subdomain: "battle-through-the-heavens"
  },
  "soul land": {
    english: "Soul Land",
    alternateEnglish: ["Soul Land 1", "Soul Land 2", "Soul Land 3", "Soul Land 4", "Douluo Continent"],
    romanized: ["Douluo Dalu", "Dou Luo Da Lu"],
    chinese: ["斗罗大陆"],
    subdomain: "soulland"
  },
  "martial universe": {
    english: "Martial Universe",
    alternateEnglish: ["Wu Dong Qian Kun"],
    romanized: ["Wu Dong Qian Kun"],
    chinese: ["武动乾坤"],
    subdomain: "martial-universe"
  },
  "renegade immortal": {
    english: "Renegade Immortal",
    alternateEnglish: ["Xian Ni"],
    romanized: ["Xian Ni"],
    chinese: ["仙逆"],
    subdomain: "xian-ni"
  },
  "perfect world": {
    english: "Perfect World",
    alternateEnglish: ["Wanmei Shijie Wiki", "Wanmei Shijie", "Perfect World CG"],
    romanized: ["Wanmei Shijie", "Wan Mei Shi Jie"],
    chinese: ["完美世界"],
    subdomain: "wanmei-shijie"
  },
  "swallowed star": {
    english: "Swallowed Star",
    alternateEnglish: ["Tunshi Xingkong"],
    romanized: ["Tunshi Xingkong", "Tun Shi Xing Kong"],
    chinese: ["吞噬星空"],
    subdomain: "swallowed-star"
  },
  "the great ruler": {
    english: "The Great Ruler",
    alternateEnglish: ["Da Zhu Zai", "the-great-ruler", "thegreatruler"],
    romanized: ["Da Zhu Zai"],
    chinese: ["大主宰"],
    subdomain: "thegreatruler"
  },
  "stellar transformations": {
    english: "Stellar Transformations",
    alternateEnglish: ["Stellar Transformation", "Xingchen Bian"],
    romanized: ["Xingchen Bian", "Xing Chen Bian"],
    chinese: ["星辰变"],
    subdomain: "stellar-transformations"
  },
  "heaven official's blessing": {
    english: "Heaven Official's Blessing",
    alternateEnglish: ["Tian Guan Ci Fu"],
    romanized: ["Tian Guan Ci Fu"],
    chinese: ["天官赐福"],
    subdomain: "heaven-officials-blessing"
  },
  "throne of seal": {
    english: "Throne of Seal",
    alternateEnglish: ["Shen Yin Wang Zuo", "Throne of Seals"],
    romanized: ["Shen Yin Wang Zuo"],
    chinese: ["神印王座"],
    subdomain: "sywz"
  },
  "tales of demons and gods": {
    english: "Tales of Demons and Gods",
    alternateEnglish: ["Yao Shen Ji"],
    romanized: ["Yao Shen Ji"],
    chinese: ["妖神记"],
    subdomain: "tales-of-demons-and-gods"
  },
  "against the gods": {
    english: "Against the Gods",
    alternateEnglish: ["Ni Tian Xie Shen"],
    romanized: ["Ni Tian Xie Shen"],
    chinese: ["逆天邪神"],
    subdomain: "against-the-gods"
  },
  "coiling dragon": {
    english: "Coiling Dragon",
    alternateEnglish: ["Pan Long"],
    romanized: ["Pan Long"],
    chinese: ["盘龙"],
    subdomain: "coiling-dragon"
  },
  "a will eternal": {
    english: "A Will Eternal",
    alternateEnglish: ["Yi Nian Yong Heng"],
    romanized: ["Yi Nian Yong Heng"],
    chinese: ["一念永恒"],
    subdomain: "a-will-eternal"
  },
  "record of a mortal's journey to immortality": {
    english: "Record of a Mortal's Journey to Immortality",
    alternateEnglish: ["A Record of Mortal's Journey to Immortality", "RMJI", "Mortal's Journey to Immortality"],
    romanized: ["Fan Ren Xiu Xian Chuan", "Fanren Xiu Xian Chuan"],
    chinese: ["凡人修仙传"],
    subdomain: "record-of-a-mortals-journey-to-immortality"
  },
  "the daily life of the immortal king": {
    english: "The Daily Life of the Immortal King",
    alternateEnglish: ["Daily Life of the Immortal King"],
    romanized: ["Xian Wang De Ri Chang Sheng Huo", "Xianwang De Richang Shenghuo"],
    chinese: ["仙王的日常生活"],
    subdomain: "daily-life-of-the-immortal-king"
  },
  "scumbag system": {
    english: "Scumbag System",
    alternateEnglish: ["The Scumbag Villain's Self-Saving System"],
    romanized: ["Chuan Shu Zi Jiu Zhi Nan"],
    chinese: ["穿书自救指南"],
    subdomain: "scumbag-system"
  },
  "grandmaster of demonic cultivation": {
    english: "Grandmaster of Demonic Cultivation",
    alternateEnglish: ["The Founder of Diabolism", "MDZS"],
    romanized: ["Mo Dao Zu Shi", "Modao Zushi"],
    chinese: ["魔道祖师"],
    subdomain: "modao-zushi"
  },
  "beyond time's gaze": {
    english: "Beyond Time's Gaze",
    subdomain: "beyond-times-gaze"
  },
  "slay the gods": {
    english: "Slay the Gods",
    subdomain: "slay-the-gods"
  },
  "keyboard immortal": {
    english: "Keyboard Immortal",
    subdomain: "keyboard-immortal"
  },
  "shrouding the heavens": {
    english: "Shrouding the Heavens",
    alternateEnglish: ["Zhe Tian"],
    subdomain: "shrouding-the-heavens"
  },
  "martial master": {
    english: "Martial Master",
    subdomain: "martial-master"
  },
  "eclipse of illusion": {
    english: "Eclipse of Illusion",
    subdomain: "eclipse-of-illusion"
  },
  "sword of coming": {
    english: "Sword of Coming",
    subdomain: "sword-of-coming"
  },
  "lord of mysteries": {
    english: "Lord of Mysteries",
    alternateEnglish: ["Lord of the Mysteries"],
    subdomain: "lordofthemysteries"
  },
  "tales of herding gods": {
    english: "Tales of Herding Gods",
    alternateEnglish: ["Mu Shen Ji"],
    subdomain: "tales-of-herding-gods"
  },
  "blades of the guardians": {
    english: "Blades of the Guardians",
    subdomain: "blades-of-the-guardians"
  },
  "above myriads": {
    english: "Above Myriads",
    alternateEnglish: ["Above Ten Thousand People"],
    subdomain: "above-ten-thousand-people"
  },
  "the demon king who lost his job": {
    english: "The Demon King Who Lost His Job",
    subdomain: "the-demon-king-who-lost-his-job"
  },
  "supreme god emperor": {
    english: "Supreme God Emperor",
    subdomain: "supreme-god-emperor"
  },
  "word of honor": {
    english: "Word of Honor",
    subdomain: "word-of-honor"
  },
  "lingwu continent": {
    english: "Lingwu Continent",
    subdomain: "lingwu-continent"
  },
  "apotheosis": {
    english: "Apotheosis",
    subdomain: "apotheosis-manga"
  },
  "wonderland": {
    english: "Wonderland",
    subdomain: "wonderland"
  },
  "peerless divine emperor": {
    english: "Peerless Divine Emperor",
    subdomain: "peerless-divine-emperor"
  },
  "bureau of paranormal investigation": {
    english: "Bureau of Paranormal Investigation",
    subdomain: "bureau-of-paranormal-investigation"
  },
  "tales of herdings gods": {
    english: "Shen Mu",
    subdomain: "shen-mu"
  },
  "peerless battle spirit": {
    english: "Peerless Battle Spirit",
    alternateEnglish: ["Jueshi Zhan Hun"],
    subdomain: "peerless-battle-spirit"
  }
};

export const DONGHUA_PROTAGONISTS: Record<string, string> = {
  "battle through the heavens": "Xiao Yan",
  "perfect world": "Shi Hao",
  "soul land": "Tang San",
  "soul land 2": "Huo Yuhao",
  "swallowed star": "Luo Feng",
  "renegade immortal": "Wang Lin",
  "lord of mysteries": "Klein Moretti",
  "throne of seal": "Long Haochen",
  "martial universe": "Lin Dong",
  "the great ruler": "Mu Chen",
  "stellar transformation": "Qin Yu",
  "stellar transformations": "Qin Yu",
  "shrouding the heavens": "Ye Fan",
  "a record of a mortal's journey to immortality": "Han Li",
  "record of a mortal's journey to immortality": "Han Li",
  "apotheosis": "Luo Zheng",
  "against the gods": "Yun Che",
  "jade dynasty": "Zhang Xiaofan"
};

export function getProtagonistForShow(title: string): string | null {
  if (!title) return null;
  const t = title.toLowerCase().trim();
  for (const [key, val] of Object.entries(DONGHUA_PROTAGONISTS)) {
    if (t === key || t.includes(key) || key.includes(t)) {
      return val;
    }
  }
  return null;
}

export function getAliasesForShow(title: string): string[] {
  if (!title) return [];
  const t = title.toLowerCase().trim();
  
  for (const [key, val] of Object.entries(DONGHUA_ALIASES)) {
    if (
      t === key ||
      t.includes(key) ||
      val.english.toLowerCase().includes(t) ||
      val.alternateEnglish?.some(a => t.includes(a.toLowerCase()) || a.toLowerCase().includes(t)) ||
      val.romanized?.some(r => t.includes(r.toLowerCase()) || r.toLowerCase().includes(t)) ||
      val.chinese?.some(c => t.includes(c) || c.includes(t))
    ) {
      const list = [val.english];
      if (val.alternateEnglish) list.push(...val.alternateEnglish);
      if (val.romanized) list.push(...val.romanized);
      if (val.chinese) list.push(...val.chinese);
      return Array.from(new Set(list));
    }
  }
  
  return [title];
}

export function resolveFandomSubdomain(title: string): string {
  if (!title) return "donghua";
  const raw = title.toLowerCase().trim();
  const t = raw.replace(/-/g, " ");
  const compact = raw.replace(/[^a-z0-9]/g, "");

  // Direct match if input is already a subdomain in aliases
  for (const val of Object.values(DONGHUA_ALIASES)) {
    if (val.subdomain === raw || val.subdomain === compact) {
      return val.subdomain;
    }
  }
  
  // Try mapping protagonist name to show name first
  for (const [showKey, protName] of Object.entries(DONGHUA_PROTAGONISTS)) {
    if (t === protName.toLowerCase() || t.includes(protName.toLowerCase())) {
      // Resolve using the show title
      const showSub = DONGHUA_ALIASES[showKey]?.subdomain;
      if (showSub) return showSub;
    }
  }

  for (const [key, val] of Object.entries(DONGHUA_ALIASES)) {
    if (
      t === key ||
      t.includes(key) ||
      key.includes(t) ||
      val.english.toLowerCase().includes(t) ||
      val.alternateEnglish?.some(a => t.includes(a.toLowerCase()) || a.toLowerCase().includes(t) || compact === a.toLowerCase().replace(/[^a-z0-9]/g, "")) ||
      val.romanized?.some(r => t.includes(r.toLowerCase()) || r.toLowerCase().includes(t)) ||
      val.chinese?.some(c => t.includes(c) || c.includes(t))
    ) {
      return val.subdomain;
    }
  }
  
  return "donghua";
}

export interface AliasPerformance {
  name: string;
  type: "official_english" | "romaji" | "chinese" | "alias";
  works: {
    fandom: boolean;
    anilist: boolean;
    bangumi: boolean;
  };
}

export interface DonghuaIdentity {
  displayTitle: string;
  canonicalTitle: string;
  subdomain: string;
  aliases: AliasPerformance[];
}

export const DONGHUA_IDENTITIES: Record<string, DonghuaIdentity> = {
  "battle through the heavens": {
    displayTitle: "Battle Through the Heavens",
    canonicalTitle: "Battle Through the Heavens",
    subdomain: "battle-through-the-heavens",
    aliases: [
      { name: "Battle Through the Heavens", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Fights Break Sphere", type: "alias", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Doupo Cangqiong", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "斗破苍穹", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "soul land": {
    displayTitle: "Soul Land",
    canonicalTitle: "Soul Land",
    subdomain: "soulland",
    aliases: [
      { name: "Soul Land", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Douluo Dalu", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "斗罗大陆", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "martial universe": {
    displayTitle: "Martial Universe",
    canonicalTitle: "Martial Universe",
    subdomain: "martial-universe",
    aliases: [
      { name: "Martial Universe", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Wu Dong Qian Kun", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "武动乾坤", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "renegade immortal": {
    displayTitle: "Renegade Immortal",
    canonicalTitle: "Renegade Immortal",
    subdomain: "renegade-immortal",
    aliases: [
      { name: "Renegade Immortal", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Xian Ni", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "仙逆", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "perfect world": {
    displayTitle: "Perfect World",
    canonicalTitle: "Wanmei Shijie",
    subdomain: "wanmei-shijie",
    aliases: [
      { name: "Perfect World", type: "official_english", works: { fandom: false, anilist: false, bangumi: true } },
      { name: "Wanmei Shijie", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "完美世界", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "swallowed star": {
    displayTitle: "Swallowed Star",
    canonicalTitle: "Swallowed Star",
    subdomain: "swallowed-star",
    aliases: [
      { name: "Swallowed Star", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Tunshi Xingkong", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "吞噬星空", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "the great ruler": {
    displayTitle: "The Great Ruler",
    canonicalTitle: "The Great Ruler",
    subdomain: "the-great-ruler",
    aliases: [
      { name: "The Great Ruler", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Da Zhu Zai", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "大主宰", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "stellar transformations": {
    displayTitle: "Stellar Transformations",
    canonicalTitle: "Stellar Transformations",
    subdomain: "stellar-transformations",
    aliases: [
      { name: "Stellar Transformations", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Xingchen Bian", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "星辰变", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "heaven official's blessing": {
    displayTitle: "Heaven Official's Blessing",
    canonicalTitle: "Heaven Official's Blessing",
    subdomain: "heaven-officials-blessing",
    aliases: [
      { name: "Heaven Official's Blessing", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Tian Guan Ci Fu", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "天官赐福", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "throne of seal": {
    displayTitle: "Throne of Seal",
    canonicalTitle: "Throne of Seal",
    subdomain: "throne-of-seal",
    aliases: [
      { name: "Throne of Seal", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Shen Yin Wang Zuo", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "神印王座", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "tales of demons and gods": {
    displayTitle: "Tales of Demons and Gods",
    canonicalTitle: "Tales of Demons and Gods",
    subdomain: "tales-of-demons-and-gods",
    aliases: [
      { name: "Tales of Demons and Gods", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Yao Shen Ji", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "妖神记", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "against the gods": {
    displayTitle: "Against the Gods",
    canonicalTitle: "Against the Gods",
    subdomain: "against-the-gods",
    aliases: [
      { name: "Against the Gods", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Ni Tian Xie Shen", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "逆天邪神", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "coiling dragon": {
    displayTitle: "Coiling Dragon",
    canonicalTitle: "Coiling Dragon",
    subdomain: "coiling-dragon",
    aliases: [
      { name: "Coiling Dragon", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Pan Long", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "盘龙", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "a will eternal": {
    displayTitle: "A Will Eternal",
    canonicalTitle: "A Will Eternal",
    subdomain: "a-will-eternal",
    aliases: [
      { name: "A Will Eternal", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Yi Nian Yong Heng", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "一念永恒", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "record of a mortal's journey to immortality": {
    displayTitle: "A Record of Mortal's Journey to Immortality",
    canonicalTitle: "Fanren Xiu Xian Chuan",
    subdomain: "record-of-a-mortals-journey-to-immortality",
    aliases: [
      { name: "A Record of Mortal's Journey to Immortality", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "RMJI", type: "alias", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Fan Ren Xiu Xian Chuan", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "凡人修仙传", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "the daily life of the immortal king": {
    displayTitle: "The Daily Life of the Immortal King",
    canonicalTitle: "The Daily Life of the Immortal King",
    subdomain: "daily-life-of-the-immortal-king",
    aliases: [
      { name: "The Daily Life of the Immortal King", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Xian Wang De Ri Chang Sheng Huo", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "仙王的日常生活", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "scumbag system": {
    displayTitle: "Scumbag System",
    canonicalTitle: "Scumbag System",
    subdomain: "scumbag-system",
    aliases: [
      { name: "Scumbag System", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Chuan Shu Zi Jiu Zhi Nan", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "穿书自救指南", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  },
  "grandmaster of demonic cultivation": {
    displayTitle: "Grandmaster of Demonic Cultivation",
    canonicalTitle: "Mo Dao Zu Shi",
    subdomain: "modao-zushi",
    aliases: [
      { name: "Grandmaster of Demonic Cultivation", type: "official_english", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "Mo Dao Zu Shi", type: "romaji", works: { fandom: true, anilist: true, bangumi: true } },
      { name: "魔道祖师", type: "chinese", works: { fandom: true, anilist: true, bangumi: true } }
    ]
  }
};

export async function probeAliasOnFandom(subdomain: string, alias: string): Promise<boolean> {
  const url = `https://${subdomain}.fandom.com/api.php?action=query&titles=${encodeURIComponent(alias)}&format=json&origin=*`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0] as any;
    return page && page.pageid !== undefined && page.missing === undefined;
  } catch {
    return false;
  }
}

export async function probeAliasOnAniList(alias: string): Promise<boolean> {
  const query = `
    query ($search: String) {
      Media (search: $search, type: ANIME) {
        id
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { search: alias } })
    });
    const data = await res.json();
    return !!data?.data?.Media?.id;
  } catch {
    return false;
  }
}

export async function probeAliasOnBangumi(alias: string): Promise<boolean> {
  const url = `https://api.bgm.tv/search/subject/${encodeURIComponent(alias)}?type=2`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data && data.results && data.results.length > 0;
  } catch {
    return false;
  }
}

/**
 * Search pages on a specific Fandom subdomain
 */
export async function searchFandom(subdomain: string, query: string): Promise<Anime[]> {
  const wiki = (subdomain || "donghua").trim().toLowerCase();
  
  // Obtain aliases for the search query (e.g. "Perfect World" -> ["Perfect World", "Wanmei Shijie", ...])
  const searchTerms = getAliasesForShow(query);
  
  // Helper to search a single term
  const searchSingleTerm = async (term: string): Promise<any[]> => {
    const generatorUrl = `https://${wiki}.fandom.com/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrlimit=10&prop=pageimages|info&piprop=thumbnail&pithumbsize=300&inprop=url&format=json&origin=*`;
    try {
      const res = await fetch(generatorUrl);
      const data = await res.json();
      return data?.query?.pages ? Object.values(data.query.pages) : [];
    } catch {
      return [];
    }
  };

  try {
    // Run searches for all terms concurrently
    const allPagesResults = await Promise.all(searchTerms.map(t => searchSingleTerm(t)));
    const mergedPages = allPagesResults.flat();
    
    // Deduplicate by pageid
    const seen = new Set<number>();
    const uniquePages = mergedPages.filter(p => {
      if (p.pageid === undefined || seen.has(p.pageid)) return false;
      seen.add(p.pageid);
      return true;
    });

    if (uniquePages.length > 0) {
      return uniquePages.map((item: any) => ({
        id: item.pageid,
        slug: item.title, 
        title: item.title,
        image: item.thumbnail?.source || "", 
        rating: 0,
        episodes: 0,
        year: 0,
        genre: "Fandom Page",
        genres: ["Wiki", wiki],
        status: "Completed",
        synopsis: `Fandom page for ${item.title} on ${wiki}.fandom.com`,
        tags: ["Wiki", wiki],
        isNew: false,
        featured: false,
      }));
    }
  } catch (err) {
    console.warn("Fandom concurrent generator search failed, trying list fallback:", err);
  }

  // Fallback to list=search
  const searchFallbackSingleTerm = async (term: string): Promise<any[]> => {
    const fallbackUrl = `https://${wiki}.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&utf8=&format=json&origin=*`;
    try {
      const res = await fetch(fallbackUrl);
      const data = await res.json();
      return data?.query?.search || [];
    } catch {
      return [];
    }
  };

  try {
    const fallbackResults = await Promise.all(searchTerms.map(t => searchFallbackSingleTerm(t)));
    const mergedFallback = fallbackResults.flat();
    
    const seenFallback = new Set<string>();
    const uniqueFallback = mergedFallback.filter(item => {
      if (!item.title || seenFallback.has(item.title)) return false;
      seenFallback.add(item.title);
      return true;
    });

    return uniqueFallback.map((item: any) => ({
      id: item.pageid || Math.abs(item.title.split("").reduce((a: number, b: string) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)),
      slug: item.title, 
      title: item.title,
      image: "", 
      rating: 0,
      episodes: item.wordcount || 0, 
      year: parseInt(item.timestamp?.split("-")[0]) || 0,
      genre: "Fandom Page",
      genres: ["Wiki", wiki],
      status: "Completed",
      synopsis: item.snippet?.replace(/<\/?[^>]+(>|$)/g, "") || "", 
      tags: ["Wiki", wiki],
      isNew: false,
      featured: false,
    }));
  } catch (err) {
    console.error("Fandom fallback search failed:", err);
    return [];
  }
}

export async function getFandomDetail(subdomain: string, title: string): Promise<any> {
  const wiki = (subdomain || "soulland").trim().toLowerCase();
  const encodedTitle = encodeURIComponent(title);

  // 1. Fetch info and main image (redirects followed)
  const queryUrl = `https://${wiki}.fandom.com/api.php?action=query&prop=pageimages|info&titles=${encodedTitle}&piprop=original|thumbnail&pithumbsize=1000&inprop=url&redirects=1&format=json&origin=*`;
  // 2. Fetch parsed HTML text, sections, and images
  const parseUrl = `https://${wiki}.fandom.com/api.php?action=parse&page=${encodedTitle}&prop=text|sections|images&redirects=1&format=json&origin=*`;

  try {
    const [queryRes, parseRes] = await Promise.all([
      fetch(queryUrl).then(r => r.json()),
      fetch(parseUrl).then(r => r.json())
    ]);

    const pageInfo = Object.values(queryRes?.query?.pages || {})[0] as any;
    const parseInfo = parseRes?.parse || {};

    const rawHtml = parseInfo?.text?.["*"] || "";
    const sections = parseInfo?.sections || [];
    const images = parseInfo?.images || [];

    // Parse Infobox, Intro, narrative sections, and gallery using DOMParser
    let infoboxData: Record<string, string> = {};
    let introText = "";
    let logoImage = pageInfo?.original?.source || pageInfo?.thumbnail?.source || "";
    let infoboxImage = "";
    let appearanceText = "";
    let personalityText = "";
    let historyText = "";
    let triviaText = "";
    let quotesText = "";
    const galleryImages: string[] = [];

    // Clean pageimage URL if found
    if (logoImage && logoImage.includes("/revision/latest")) {
      logoImage = logoImage.split("/revision/latest")[0] + "/revision/latest";
    }

    if (typeof window !== "undefined" && rawHtml) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");

        // Extract portable-infobox data
        const dataItems = doc.querySelectorAll(".pi-item.pi-data");
        dataItems.forEach((item: any) => {
          const label = item.querySelector(".pi-data-label")?.textContent?.trim() || "";
          const value = item.querySelector(".pi-data-value")?.textContent?.trim() || "";
          if (label && value) {
            infoboxData[label] = value;
          }
        });

        // Fallback to table-based infoboxes
        if (Object.keys(infoboxData).length === 0) {
          const trs = doc.querySelectorAll("table.infobox tr, table.toccolours tr");
          trs.forEach((tr: any) => {
            const th = tr.querySelector("th")?.textContent?.trim() || "";
            const td = tr.querySelector("td")?.textContent?.trim() || "";
            if (th && td) {
              infoboxData[th] = td;
            }
          });
        }

        // Try extracting first paragraph
        const paragraphs = doc.querySelectorAll("p");
        for (let i = 0; i < paragraphs.length; i++) {
          const pText = paragraphs[i].textContent?.trim() || "";
          // Ignore empty or wiki warnings
          if (pText.length > 50 && !pText.includes("MediaWiki") && !pText.includes("Javascript")) {
            introText = pText;
            break;
          }
        }

        // Try finding infobox image (highest priority for portrait)
        const infoboxImg = doc.querySelector(".portable-infobox img, table.infobox img, .pi-image-thumbnail img, .pi-image img, .thumbimage");
        if (infoboxImg) {
          let infoboxSrc = infoboxImg.getAttribute("data-src") || infoboxImg.getAttribute("src") || "";
          if (infoboxSrc && !infoboxSrc.startsWith("data:image")) {
            if (infoboxSrc.includes("/revision/latest")) {
              infoboxSrc = infoboxSrc.split("/revision/latest")[0] + "/revision/latest";
            }
            infoboxImage = infoboxSrc;
            logoImage = infoboxSrc;
          }
        }

        // ── Extract narrative section text by heading ──
        const extractSectionText = (sectionName: string): string => {
          const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
          let targetHeading: Element | null = null;
          for (let i = 0; i < headings.length; i++) {
            if (headings[i].textContent?.toLowerCase().includes(sectionName.toLowerCase())) {
              targetHeading = headings[i];
              break;
            }
          }
          if (!targetHeading) return "";
          
          const targetLevel = parseInt(targetHeading.tagName.substring(1));
          let content = "";
          let el = targetHeading.nextElementSibling;
          
          while (el) {
            const matchH = el.tagName.match(/^H([1-6])$/i);
            if (matchH) {
              const currentLevel = parseInt(matchH[1]);
              if (currentLevel <= targetLevel) {
                break;
              }
            }
            if (el.tagName === "P" || el.tagName === "UL" || el.tagName === "OL" || el.tagName === "LI") {
              content += el.textContent + "\n";
            }
            el = el.nextElementSibling;
          }
          return content.trim();
        };

        appearanceText = extractSectionText("Appearance");
        personalityText = extractSectionText("Personality");
        historyText = extractSectionText("History") || extractSectionText("Biography") || extractSectionText("Background") || extractSectionText("Plot");
        triviaText = extractSectionText("Trivia");
        quotesText = extractSectionText("Quotes");

        // ── Extract gallery image URLs from DOM ──
        doc.querySelectorAll(".gallery img, .wikia-gallery img, .wikia-gallery-item img").forEach((img: any) => {
          let src = img.getAttribute("data-src") || img.getAttribute("src");
          if (src && !src.includes("placeholder") && !src.includes("data:image") && !src.includes("sprite")) {
            if (src.includes("/revision/latest")) src = src.split("/revision/latest")[0] + "/revision/latest";
            galleryImages.push(src);
          }
        });

        // Also grab images from thumbinner containers (common on Fandom)
        if (galleryImages.length === 0) {
          doc.querySelectorAll(".thumb img, .thumbinner img, .image img").forEach((img: any) => {
            let src = img.getAttribute("data-src") || img.getAttribute("src");
            if (src && !src.includes("placeholder") && !src.includes("data:image") && !src.includes("sprite")) {
              if (src.includes("/revision/latest")) src = src.split("/revision/latest")[0] + "/revision/latest";
              galleryImages.push(src);
            }
          });
        }
      } catch (domErr) {
        console.error("DOMParser parsing failed:", domErr);
      }
    }

    return {
      title: pageInfo?.title || parseInfo?.title || title,
      pageid: pageInfo?.pageid,
      url: pageInfo?.fullurl || `https://${wiki}.fandom.com/wiki/${title}`,
      logoImage,
      infoboxImage: infoboxImage || logoImage,
      introText: introText || pageInfo?.extract || "No intro preview available.",
      appearance: appearanceText,
      personality: personalityText,
      history: historyText,
      trivia: triviaText,
      quotes: quotesText,
      infobox: infoboxData,
      sections: sections.map((s: any) => ({
        title: s.line,
        level: s.level,
        anchor: s.anchor
      })),
      galleryImages,
      allImages: images.map((img: string) => 
        img.startsWith("http") ? img : `https://static.wikia.nocookie.net/${wiki}/images/`
      ),
      wikiSubdomain: wiki,
      rawHtml: rawHtml.slice(0, 10000)
    };
  } catch (err) {
    console.error("Fandom fetch failed:", err);
    return null;
  }
}

/**
 * Generate structural coverage comparison for Fandom Page data
 */
export function generateFandomCoverage(raw: any): any[] {
  if (!raw) return [];

  const infoboxKeys = Object.keys(raw.infobox || {});
  
  return [
    { field: "Page ID", traktValue: String(raw.pageid || "N/A"), hasData: !!raw.pageid },
    { field: "Fandom Wiki", traktValue: `${raw.wikiSubdomain}.fandom.com`, hasData: true },
    { field: "Page Title", traktValue: raw.title, hasData: !!raw.title },
    { field: "Main Image / Poster", traktValue: raw.logoImage || "None", hasData: !!raw.logoImage },
    { field: "URL", traktValue: raw.url, hasData: !!raw.url },
    { field: "Intro Summary", traktValue: raw.introText?.slice(0, 80) + "...", hasData: !!raw.introText },
    { field: "Infobox Parameters", traktValue: infoboxKeys.length > 0 ? infoboxKeys.join(", ") : "None", hasData: infoboxKeys.length > 0 },
    { field: "Main Sections", traktValue: raw.sections?.map((s: any) => s.title).join(" | ") || "None", hasData: raw.sections?.length > 0 },
    { field: "Images Count", traktValue: String(raw.allImages?.length || 0), hasData: raw.allImages?.length > 0 }
  ];
}

export async function probeFandomApi(subdomain: string, params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams({ ...params, format: "json", origin: "*" }).toString();
  const url = `https://${subdomain}.fandom.com/api.php?${query}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export const fetchFandomWikiData = (title: string, subdomain: string) => getFandomDetail(subdomain, title);

/**
 * Incremental Wiki Lore Fetching Strategy:
 * Queries category member revision timestamps from MediaWiki API.
 * Keeps existing cached entities intact and fetches details ONLY for new or modified pages.
 */
export async function fetchIncrementalWikiLore(
  subdomain: string,
  category: string,
  existingCache: Record<string, any> = {}
): Promise<any[]> {
  try {
    const categoryTitle = `Category:${category.charAt(0).toUpperCase() + category.slice(1)}`;
    const cmData = await probeFandomApi(subdomain, {
      action: "query",
      list: "categorymembers",
      cmtitle: categoryTitle,
      cmprop: "ids|title|timestamp",
      cmlimit: "100"
    });

    const members: Array<{ pageid: number; title: string; timestamp?: string }> = cmData.query?.categorymembers || [];
    const mergedResults: any[] = [];

    for (const member of members) {
      const existing = existingCache[member.title] || existingCache[member.pageid];
      const isOutdated = !existing || (member.timestamp && existing.timestamp && member.timestamp > existing.timestamp);

      if (!isOutdated && existing) {
        // Reuse existing cached entity directly without downloading page text/media again
        mergedResults.push(existing);
      } else {
        // Fetch details ONLY for new or updated entity
        const detail = await fetchFandomWikiData(member.title, subdomain);
        if (detail) {
          mergedResults.push({
            ...detail,
            timestamp: member.timestamp
          });
        } else if (existing) {
          mergedResults.push(existing);
        }
      }
    }

    return mergedResults;
  } catch (err) {
    console.warn(`[IncrementalWikiLore] Sync failed for ${subdomain}/${category}, using existing cache:`, err);
    return Object.values(existingCache);
  }
}

/**
 * Automatically parses Fandom MediaWiki Infobox key-values to discover web graph relationships
 * (e.g. Region -> Central Plains, Continent -> Dou Qi Continent, Empire -> Black-Corner Region).
 */
export function parseInfoboxRelationships(
  fromSlug: string,
  infoboxData: Record<string, string>
): Array<{
  id: string;
  fromEntitySlug: string;
  relationshipType: "located_in" | "part_of" | "affiliated_with" | "uses" | "enemy_of" | "family_of" | "master_of";
  toEntitySlug: string;
  toEntityName: string;
  toEntityType: "character" | "location" | "continent" | "region" | "empire" | "faction" | "technique" | "artifact";
}> {
  if (!infoboxData) return [];

  const relationships: Array<{
    id: string;
    fromEntitySlug: string;
    relationshipType: "located_in" | "part_of" | "affiliated_with" | "uses" | "enemy_of" | "family_of" | "master_of";
    toEntitySlug: string;
    toEntityName: string;
    toEntityType: "character" | "location" | "continent" | "region" | "empire" | "faction" | "technique" | "artifact";
  }> = [];

  let idCounter = 1;

  for (const [rawKey, val] of Object.entries(infoboxData)) {
    if (!val || typeof val !== 'string') continue;

    const key = rawKey.toLowerCase();
    const cleanVal = val.replace(/<[^>]*>/g, '').trim();
    if (!cleanVal || cleanVal === "—" || cleanVal.length > 80) continue;

    const targetSlug = cleanVal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    if (key.includes("continent")) {
      relationships.push({
        id: `rel-${fromSlug}-${idCounter++}`,
        fromEntitySlug: fromSlug,
        relationshipType: "part_of",
        toEntitySlug: targetSlug,
        toEntityName: cleanVal,
        toEntityType: "continent"
      });
    } else if (key.includes("region")) {
      relationships.push({
        id: `rel-${fromSlug}-${idCounter++}`,
        fromEntitySlug: fromSlug,
        relationshipType: "located_in",
        toEntitySlug: targetSlug,
        toEntityName: cleanVal,
        toEntityType: "region"
      });
    } else if (key.includes("empire") || key.includes("country")) {
      relationships.push({
        id: `rel-${fromSlug}-${idCounter++}`,
        fromEntitySlug: fromSlug,
        relationshipType: "located_in",
        toEntitySlug: targetSlug,
        toEntityName: cleanVal,
        toEntityType: "empire"
      });
    } else if (key.includes("affiliation") || key.includes("clan") || key.includes("sect") || key.includes("faction")) {
      relationships.push({
        id: `rel-${fromSlug}-${idCounter++}`,
        fromEntitySlug: fromSlug,
        relationshipType: "affiliated_with",
        toEntitySlug: targetSlug,
        toEntityName: cleanVal,
        toEntityType: "faction"
      });
    } else if (key.includes("technique") || key.includes("skill") || key.includes("art")) {
      relationships.push({
        id: `rel-${fromSlug}-${idCounter++}`,
        fromEntitySlug: fromSlug,
        relationshipType: "uses",
        toEntitySlug: targetSlug,
        toEntityName: cleanVal,
        toEntityType: "technique"
      });
    }
  }

  return relationships;
}

/**
 * Fetches real character page candidates from Fandom wiki category with MediaWiki pagination & continuation
 */
export async function fetchFandomWikiCharacters(
  subdomain: string,
  gcmcontinue?: string
): Promise<{
  candidates: Array<{ name: string; page: string; image: string; role: string; realm: string; pageId?: number }>;
  continueToken?: string;
  totalFound?: number;
}> {
  const wiki = (subdomain || "battle-through-the-heavens").trim().toLowerCase();

  // Try category members API with pageimages (limit 500 max per MediaWiki API spec)
  let categoryUrl = `https://${wiki}.fandom.com/api.php?action=query&generator=categorymembers&gcmtitle=Category:Characters&gcmlimit=500&prop=pageimages|info&piprop=thumbnail&pithumbsize=500&inprop=url&format=json&origin=*`;
  if (gcmcontinue) {
    categoryUrl += `&gcmcontinue=${encodeURIComponent(gcmcontinue)}`;
  }

  try {
    const res = await fetch(categoryUrl);
    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];
      const nextContinue = data.continue?.gcmcontinue;

      if (pages.length > 0) {
        const rawCandidates = pages
          .filter((p: any) => p.title && !p.title.includes("Category:") && !p.title.includes("File:"))
          .map((p: any) => {
            const cleanName = p.title.replace(/_/g, " ");
            let img = p.thumbnail?.source || "";
            if (img && img.includes("/revision/latest")) {
              img = img.split("/revision/latest")[0] + "/revision/latest";
            }
            return {
              name: cleanName,
              page: p.title.replace(/\s+/g, "_"),
              image: img || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400",
              role: "Wiki Candidate",
              realm: `${wiki}.fandom.com`,
              pageId: p.pageid
            };
          });

        // Protagonist prioritization sort (Xiao Yan, Yao Chen, Medusa, Gu Xun'er etc. on top)
        const priorityNames = ["xiao yan", "yao chen", "yao lao", "queen medusa", "cai lin", "gu xun'er", "xun er", "nalan yanran", "shi hao", "tang san", "luo feng", "wang lin", "klein moretti"];
        
        rawCandidates.sort((a, b) => {
          const aIndex = priorityNames.findIndex(p => a.name.toLowerCase().includes(p));
          const bIndex = priorityNames.findIndex(p => b.name.toLowerCase().includes(p));
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.name.localeCompare(b.name);
        });

        return {
          candidates: rawCandidates,
          continueToken: nextContinue,
          totalFound: rawCandidates.length
        };
      }
    }
  } catch (err) {
    console.warn(`[FandomCharacters] Category fetch failed for ${wiki}:`, err);
  }

  // Fallback to generator search for "Characters"
  try {
    const searchUrl = `https://${wiki}.fandom.com/api.php?action=query&generator=search&gsrsearch=Character&gsrlimit=50&prop=pageimages|info&piprop=thumbnail&pithumbsize=500&inprop=url&format=json&origin=*`;
    const res = await fetch(searchUrl);
    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];

      const candidates = pages
        .filter((p: any) => p.title && !p.title.includes("Category:") && !p.title.includes("File:"))
        .map((p: any) => {
          const cleanName = p.title.replace(/_/g, " ");
          let img = p.thumbnail?.source || "";
          if (img && img.includes("/revision/latest")) {
            img = img.split("/revision/latest")[0] + "/revision/latest";
          }
          return {
            name: cleanName,
            page: p.title.replace(/\s+/g, "_"),
            image: img || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400",
            role: "Wiki Candidate",
            realm: `${wiki}.fandom.com`,
            pageId: p.pageid
          };
        });

      return { candidates };
    }
  } catch (err) {
    console.warn(`[FandomCharacters] Generator search failed for ${wiki}:`, err);
  }

  return { candidates: [] };
}

/**
 * Clean Fandom Image URLs safely preserving ?cb= timestamp parameters and removing scale-to-width-down
 */
export function cleanFandomUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();

  // Unwrap wsrv.nl proxy if present
  if (clean.includes("wsrv.nl/?url=")) {
    try {
      const parsed = new URL(clean);
      const inner = parsed.searchParams.get("url");
      if (inner) clean = decodeURIComponent(inner);
    } catch (e) {
      clean = clean.split("wsrv.nl/?url=")[1] || clean;
      clean = decodeURIComponent(clean);
    }
  }

  // Remove scale-to-width-down path segment to get full resolution image, preserving ?cb= cache key
  if (clean.includes("/scale-to-width-down/")) {
    clean = clean.replace(/\/scale-to-width-down\/\d+/, "");
  }

  return clean;
}

export const cleanAndProxyFandomUrl = cleanFandomUrl;

export interface ClassifiedCharacterImage {
  url: string;
  type: string;
  label: string;
  stars: number;
  score: number;
  isInfobox?: boolean;
}

/**
 * Fetches and classifies all image candidates (Infobox, PageImage, Gallery Subpages, File Search) for a specific Fandom character page
 */
export async function fetchFandomCharacterImages(
  subdomain: string,
  pageTitle: string
): Promise<ClassifiedCharacterImage[]> {
  const wiki = (subdomain || "battle-through-the-heavens").trim().toLowerCase();
  const cleanTitle = pageTitle.trim().replace(/\s+/g, "_");
  const rawUrls: string[] = [];

  try {
    // 1. Fetch main page images with imlimit=500
    const mainApiUrl = `https://${wiki}.fandom.com/api.php?action=query&titles=${encodeURIComponent(cleanTitle)}|${encodeURIComponent(cleanTitle)}/Gallery|${encodeURIComponent(cleanTitle)}/Image_Gallery&prop=pageimages|images|info&piprop=original|thumbnail&pithumbsize=800&imlimit=500&inprop=url&format=json&origin=*`;
    const res = await fetch(mainApiUrl);
    
    if (res.ok) {
      const data = await res.json();
      const pages: any[] = Object.values(data.query?.pages || {});

      const fileTitles: string[] = [];

      pages.forEach((pageObj: any) => {
        // Pageimages
        if (pageObj.original?.source) rawUrls.push(pageObj.original.source);
        if (pageObj.thumbnail?.source) rawUrls.push(pageObj.thumbnail.source);

        // Images list
        if (pageObj.images && Array.isArray(pageObj.images)) {
          pageObj.images.forEach((img: any) => {
            if (img.title && (img.title.endsWith(".jpg") || img.title.endsWith(".png") || img.title.endsWith(".webp") || img.title.endsWith(".jpeg"))) {
              fileTitles.push(img.title);
            }
          });
        }
      });

      // Fetch imageinfo for discovered file titles in batches of 50
      if (fileTitles.length > 0) {
        const uniqueFileTitles = Array.from(new Set(fileTitles));
        for (let i = 0; i < uniqueFileTitles.length; i += 50) {
          const chunk = uniqueFileTitles.slice(i, i + 50);
          const imageInfoUrl = `https://${wiki}.fandom.com/api.php?action=query&titles=${encodeURIComponent(chunk.join("|"))}&prop=imageinfo&iiprop=url&format=json&origin=*`;
          try {
            const imgRes = await fetch(imageInfoUrl);
            if (imgRes.ok) {
              const imgData = await imgRes.json();
              const imgPages = Object.values(imgData.query?.pages || {});
              imgPages.forEach((p: any) => {
                if (p.imageinfo?.[0]?.url) {
                  rawUrls.push(p.imageinfo[0].url);
                }
              });
            }
          } catch (e) {
            console.warn(`[FandomImages] Chunk fetch error:`, e);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[FandomImages] Failed fetching main page images for ${cleanTitle}:`, err);
  }

  // 2. Perform File Namespace (6) Search for additional gallery files related to character
  try {
    const searchFileUrl = `https://${wiki}.fandom.com/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(pageTitle)}&gsrnamespace=6&gsrlimit=50&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const searchRes = await fetch(searchFileUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const filePages = Object.values(searchData.query?.pages || {});
      filePages.forEach((fp: any) => {
        if (fp.imageinfo?.[0]?.url) {
          rawUrls.push(fp.imageinfo[0].url);
        }
      });
    }
  } catch (err) {
    console.warn(`[FandomImages] File search failed for ${cleanTitle}:`, err);
  }

  // Clean, Proxy & Deduplicate URLs
  const cleanUrls = Array.from(new Set(rawUrls.map(u => cleanAndProxyFandomUrl(u))));


  const candidates: ClassifiedCharacterImage[] = [];

  // Score & Classify using Diagnostic Engine rules
  cleanUrls.forEach(url => {
    const lower = decodeURIComponent(url).toLowerCase();
    let type = "generic";
    let label = "Generic Wiki Image";
    let stars = 3;
    let score = 50;

    if (lower.includes("infobox") || lower.includes("portrait") || lower.includes("profile")) {
      type = "donghua-infobox";
      label = "Official Portrait (Infobox)";
      stars = 5;
      score = 100;
    } else if (lower.includes("promo") || lower.includes("render") || lower.includes("poster") || lower.includes("banner")) {
      type = "promo-render";
      label = "Official Donghua Promo Artwork";
      stars = 5;
      score = 95;
    } else if (lower.includes("donghua") || lower.includes("3d") || lower.includes("cg") || lower.includes("anime")) {
      type = "donghua";
      label = "Donghua Scene / Adaptation";
      stars = 4;
      score = 85;
    } else if (lower.includes("manhua") || lower.includes("comic")) {
      type = "manhua";
      label = "Manhua Artwork";
      stars = 3;
      score = 70;
    }

    candidates.push({
      url,
      type,
      label,
      stars,
      score,
      isInfobox: type === "donghua-infobox"
    });
  });

  // Fallback default image if none found
  if (candidates.length === 0) {
    candidates.push({
      url: `https://wsrv.nl/?url=${encodeURIComponent(`https://vignette.wikia.nocookie.net/${wiki}/images/a/a2/${cleanTitle}.png/revision/latest`)}&q=90`,
      type: "fallback",
      label: "Official Wiki Image Candidate",
      stars: 4,
      score: 80
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}





