/**
 * scraper.mjs — Unified Fandom Wiki Lore Scraper
 *
 * Replaces:
 *   src/data/lore/scraper.js         (BTTH + Soulland only, old output path)
 *   scratch/focused_scraper.js       (other wikis, stripped — missing sections)
 *
 * Uses scripts/wikiParser.mjs for all extraction — one parser, all wikis.
 *
 * Usage:
 *   node scripts/scraper.mjs                    — all wikis
 *   node scripts/scraper.mjs thegreatruler      — single wiki
 *   node scripts/scraper.mjs btth soulland      — multiple specific wikis
 *
 * Output: public/data/cached-lore.json (merges with existing — preserves data)
 */

import fs from 'fs';
import path from 'path';
import { parseFandomPage, WIKI_CONFIGS } from './wikiParser.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// WIKI DEFINITIONS — category maps per wiki
// ─────────────────────────────────────────────────────────────
const WIKI_CATEGORIES = {
  'battle-through-the-heavens': [
    { key: 'world',       fandomCat: 'Locations' },
    { key: 'characters',  fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Cultivation' },
    { key: 'techniques',  fandomCat: 'Dou_Techniques' },
    { key: 'artifacts',   fandomCat: 'Items' },
    { key: 'clans',       fandomCat: 'Clans' },
    { key: 'gallery',     fandomCat: 'Images' },
    { key: 'timeline',    fandomCat: 'Seasons' },
  ],
  'soulland': [
    { key: 'world',       fandomCat: 'Locations' },
    { key: 'characters',  fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Spirit_Rank' },
    { key: 'techniques',  fandomCat: 'Spirit_Abilities' },
    { key: 'artifacts',   fandomCat: 'Spirit_Bones' },
    { key: 'clans',       fandomCat: 'Sects' },
    { key: 'gallery',     fandomCat: 'Images' },
    { key: 'timeline',    fandomCat: 'Seasons' },
  ],
  'thegreatruler': [
    { key: 'world',       fandomCat: 'Locations' },
    { key: 'characters',  fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Cultivation' },
    { key: 'techniques',  fandomCat: 'Spells' },
    { key: 'artifacts',   fandomCat: 'Items' },
    { key: 'clans',       fandomCat: 'Clans' },
  ],
  'xian-ni': [
    { key: 'world',       fandomCat: 'Locations' },
    { key: 'characters',  fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Cultivation' },
    { key: 'techniques',  fandomCat: 'Spells' },
    { key: 'artifacts',   fandomCat: 'Items' },
    { key: 'clans',       fandomCat: 'Sects' },
  ],
  'wanmei-shijie': [
    { key: 'world',       fandomCat: 'Locations' },
    { key: 'characters',  fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Cultivation' },
    { key: 'techniques',  fandomCat: 'Techniques' },
    { key: 'artifacts',   fandomCat: 'Items' },
    { key: 'clans',       fandomCat: 'Clans' },
  ],
  'swallowed-star': [
    { key: 'world',       fandomCat: 'Locations' },
    { key: 'characters',  fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Cultivation' },
    { key: 'techniques',  fandomCat: 'Abilities' },
    { key: 'artifacts',   fandomCat: 'Items' },
    { key: 'clans',       fandomCat: 'Organizations' },
  ],
  'shrouding-the-heavens': [
    { key: 'world',       fandomCat: 'Locations' },
    { key: 'characters',  fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Cultivation' },
    { key: 'artifacts',   fandomCat: 'Items' },
  ],
  'stellar-transformations': [
    { key: 'world',       fandomCat: 'Locations' },
    { key: 'characters',  fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Cultivation_Realms' },
    { key: 'techniques',  fandomCat: 'Abilities' },
    { key: 'artifacts',   fandomCat: 'Items' },
    { key: 'clans',       fandomCat: 'Clans' },
  ],
  'wu-dong-qian-kun': [
    { key: 'world',       fandomCat: 'Locations' },
    { key: 'characters',  fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Cultivation' },
    { key: 'artifacts',   fandomCat: 'Artifacts' },
    { key: 'clans',       fandomCat: 'Sects' },
  ],
};

// Priority characters (sorted first in character lists)
const PRIORITY_CHARACTERS = {
  'battle-through-the-heavens': ['Xiao Yan', 'Queen Medusa', 'Yao Chen', 'Cai Lin', 'Gu Xun Er'],
  'soulland': ['Tang San', 'Xiao Wu', 'Bibi Dong', 'Dai Mubai'],
  'thegreatruler': ['Mu Chen', 'Luo Li', 'Nine Nether', 'Mu Feng', 'Shen Cangsheng'],
  'xian-ni': ['Wang Lin', 'Situ Nan', 'Li Muwan', 'Liu Mei'],
  'wanmei-shijie': ['Shi Hao', "Huo Ling'er", 'Qing Yi', 'Shi Yi'],
  'swallowed-star': ['Luo Feng', 'Xu Xin', 'Babata', 'Hong'],
  'shrouding-the-heavens': ['Ye Fan', 'Ji Ziyue', 'Pang Bo', 'Duan De'],
  'stellar-transformations': ['Qin Yu', 'Jiang Li', 'Xiao Hei', 'Hou Fei'],
  'wu-dong-qian-kun': ['Lin Dong', 'Ling Qingzhu', 'Ying Huanhuan', 'Xiao Diao'],
};

// ─────────────────────────────────────────────────────────────
// FETCH HELPERS
// ─────────────────────────────────────────────────────────────

async function fetchWithRetry(url, retries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const waitMs = delayMs * attempt * 2;
        console.warn(`  [Rate limited] Waiting ${waitMs}ms before retry ${attempt}/${retries}...`);
        await sleep(waitMs);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  [Retry ${attempt}/${retries}] ${err.message}`);
      await sleep(delayMs * attempt);
    }
  }
}

async function fetchCategoryMembers(subdomain, fandomCat) {
  const members = [];
  let cmcontinue = '';

  do {
    const url = `https://${subdomain}.fandom.com/api.php?` +
      `origin=*&format=json&action=query&list=categorymembers` +
      `&cmtitle=Category:${fandomCat}&cmlimit=500` +
      (cmcontinue ? `&cmcontinue=${encodeURIComponent(cmcontinue)}` : '');

    const data = await fetchWithRetry(url);
    const list = data?.query?.categorymembers || [];
    members.push(...list);
    cmcontinue = data['query-continue']?.categorymembers?.cmcontinue ||
                 data.continue?.cmcontinue || '';
  } while (cmcontinue);

  return members;
}

async function fetchPageContent(subdomain, pageTitle) {
  // Fetch BOTH wikitext and HTML in one call (prop=wikitext|text)
  const url = `https://${subdomain}.fandom.com/api.php?` +
    `action=parse&page=${encodeURIComponent(pageTitle)}` +
    `&prop=wikitext|text&redirects=1&format=json&origin=*`;

  const data = await fetchWithRetry(url);
  const parsed = data?.parse || {};
  return {
    title: parsed.title || pageTitle,
    wikitext: parsed.wikitext?.['*'] || '',
    html: parsed.text?.['*'] || '',
  };
}

// ─────────────────────────────────────────────────────────────
// SCRAPE SINGLE WIKI
// ─────────────────────────────────────────────────────────────

async function scrapeWiki(subdomain, existingData) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  SCRAPING: ${subdomain}`);
  console.log(`${'='.repeat(60)}`);

  const categories = WIKI_CATEGORIES[subdomain];
  if (!categories) {
    console.warn(`  No category map for ${subdomain} — skipping`);
    return existingData;
  }

  const wikiData = { ...(existingData || {}) };
  const priorityList = PRIORITY_CHARACTERS[subdomain] || [];

  for (const { key, fandomCat } of categories) {
    console.log(`\n  [${key}] Fetching Category:${fandomCat}...`);

    let members;
    try {
      members = await fetchCategoryMembers(subdomain, fandomCat);
    } catch (err) {
      console.error(`  [${key}] Failed to fetch category: ${err.message}`);
      wikiData[key] = wikiData[key] || [];
      continue;
    }

    // Filter non-article pages
    const articles = members.filter(m =>
      !m.title.startsWith('Category:') &&
      !m.title.startsWith('File:') &&
      !m.title.startsWith('Template:') &&
      !m.title.startsWith('Special:')
    );

    // Sort: priority characters first
    if (key === 'characters' && priorityList.length > 0) {
      articles.sort((a, b) => {
        const aP = priorityList.some(n => a.title.toLowerCase().includes(n.toLowerCase()));
        const bP = priorityList.some(n => b.title.toLowerCase().includes(n.toLowerCase()));
        return (bP ? 1 : 0) - (aP ? 1 : 0);
      });
    }

    console.log(`  Found ${articles.length} articles.`);

    // Build existing slug map for merge (preserves manually curated data)
    const existingMap = new Map();
    const existingList = wikiData[key] || [];
    existingList.forEach(e => {
      if (e.title) existingMap.set(e.title.toLowerCase(), e);
    });

    const updatedList = [];

    for (const m of articles) {
      process.stdout.write(`  → "${m.title}" `);
      await sleep(60); // respectful throttle

      try {
        const { title, wikitext, html } = await fetchPageContent(subdomain, m.title);

        const parsed = parseFandomPage(wikitext, html, subdomain);

        // Merge with existing entry — preserve manually curated avatarUrl/image if set
        const existing = existingMap.get(title.toLowerCase()) || {};

        // Image: keep existing manually-set image; only update if new is better or none existed
        const newImage = parsed.infoboxImage || parsed.logoImage || parsed.allImages[0] || '';
        const finalImage = (existing.infoboxImage && !isPlaceholder(existing.infoboxImage))
          ? existing.infoboxImage
          : (newImage || existing.infoboxImage || '');

        const entry = {
          id: m.pageid || existing.id,
          title,
          url: `https://${subdomain}.fandom.com/wiki/${encodeURIComponent(title)}`,
          infobox: Object.keys(parsed.infobox).length > 0
            ? parsed.infobox
            : (existing.infobox || {}),
          wikilinks: parsed.wikilinks || existing.wikilinks || {},
          logoImage: finalImage,
          infoboxImage: finalImage,
          introText: parsed.introText || existing.introText || '',
          appearance: parsed.appearance || existing.appearance || '',
          personality: parsed.personality || existing.personality || '',
          history: parsed.history || existing.history || '',
          trivia: parsed.trivia || existing.trivia || '',
          quotes: parsed.quotes || existing.quotes || '',
          galleryImages: parsed.galleryImages?.length > 0
            ? parsed.galleryImages
            : (existing.galleryImages || []),
          allImages: parsed.allImages?.length > 0
            ? parsed.allImages
            : (existing.allImages || []),
          lastScrapedAt: new Date().toISOString(),
        };

        updatedList.push(entry);
        process.stdout.write(`✓ [infobox:${Object.keys(entry.infobox).length} fields, ` +
          `app:${entry.appearance ? '✓' : '✗'}, ` +
          `per:${entry.personality ? '✓' : '✗'}, ` +
          `hist:${entry.history ? '✓' : '✗'}]\n`);
      } catch (err) {
        process.stdout.write(`✗ ${err.message}\n`);
        // Keep existing entry if scrape failed
        const existing = existingMap.get(m.title.toLowerCase());
        if (existing) updatedList.push(existing);
      }
    }

    wikiData[key] = updatedList;
    console.log(`  [${key}] Done: ${updatedList.length} entries`);
  }

  return wikiData;
}

function isPlaceholder(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return lower.includes('placeholder') ||
    lower.includes('no_photo') ||
    lower.includes('2015060816373561467') ||
    lower.includes('unsplash.com');
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  const lorePath = path.resolve('public/data/cached-lore.json');

  // Load existing data
  let allData = {};
  if (fs.existsSync(lorePath)) {
    try {
      allData = JSON.parse(fs.readFileSync(lorePath, 'utf-8'));
      console.log(`Loaded existing cached-lore.json (${Object.keys(allData).length} wikis)`);
    } catch (e) {
      console.warn('Could not parse existing cached-lore.json — starting fresh');
    }
  }

  // Determine which wikis to scrape
  const args = process.argv.slice(2);
  let targetWikis;

  if (args.length > 0) {
    // Support shorthand aliases
    const ALIASES = {
      'btth': 'battle-through-the-heavens',
      'sl': 'soulland',
      'tgr': 'thegreatruler',
      'xn': 'xian-ni',
      'pw': 'wanmei-shijie',
      'ss': 'swallowed-star',
      'sth': 'shrouding-the-heavens',
      'st': 'stellar-transformations',
      'wdqk': 'wu-dong-qian-kun',
    };
    targetWikis = args.map(a => ALIASES[a] || a).filter(w => WIKI_CATEGORIES[w]);
    if (targetWikis.length === 0) {
      console.error('No valid wikis specified. Valid options:', Object.keys(WIKI_CATEGORIES).join(', '));
      process.exit(1);
    }
    console.log(`\nScraping specific wikis: ${targetWikis.join(', ')}`);
  } else {
    targetWikis = Object.keys(WIKI_CATEGORIES);
    console.log(`\nScraping ALL ${targetWikis.length} wikis`);
  }

  // Scrape each wiki
  for (const subdomain of targetWikis) {
    try {
      allData[subdomain] = await scrapeWiki(subdomain, allData[subdomain] || {});

      // Save after each wiki (partial progress preserved)
      fs.writeFileSync(lorePath, JSON.stringify(allData, null, 2), 'utf-8');
      console.log(`\n  ✓ Saved ${subdomain} to ${lorePath}`);
    } catch (err) {
      console.error(`\nFatal error scraping ${subdomain}: ${err.message}`);
      console.error('Existing data preserved. Continuing with next wiki...');
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('  ALL DONE');
  console.log(`  Output: ${lorePath}`);
  const stats = Object.entries(allData).map(([wiki, data]) => {
    const charCount = data.characters?.length || 0;
    return `  ${wiki}: ${charCount} characters`;
  }).join('\n');
  console.log(stats);
}

main().catch(err => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
