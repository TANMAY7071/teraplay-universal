/**
 * wikiParser.mjs — Shared Fandom MediaWiki extraction logic
 *
 * Used by:
 *   scripts/scraper.mjs  (offline batch scraper)
 *   src/services/fandomAnime.ts  (live browser fetch — Phase 2 migration)
 *
 * Extraction strategies (applied in order per field group):
 *   1. Wikitext template parsing  — PRIMARY for infobox fields + wikilinks
 *   2. HTML section extraction    — PRIMARY for narrative sections (always runs)
 *   3. HTML portable infobox      — FALLBACK if wikitext template unrecognized
 */

// ─────────────────────────────────────────────────────────────
// WIKI CONFIGURATIONS
// Each wiki has different template names and field aliases.
// Adding a new wiki = adding one entry here. Parser unchanged.
// ─────────────────────────────────────────────────────────────
export const WIKI_CONFIGS = {
  'battle-through-the-heavens': {
    templateNames: ['Infobox characterV2', 'Infobox character', 'Character infobox'],
    fieldMap: {
      'Also known as': 'Aliases', 'fiances': 'Fiances',
      'spouse': 'Spouse', 'family': 'Family', 'master': 'Master',
      'status': 'Status', 'species': 'Species', 'gender': 'Gender',
      'age': 'Age', 'Hair Color': 'HairColor', 'Eye Color': 'EyeColor',
      'occupation': 'Occupation', 'affiliation': 'Affiliation',
    },
    sectionAliases: { history: ['Background', 'Plot', 'History'] },
  },
  'soulland': {
    templateNames: ['Character', 'Infobox character', 'CharacterInfo'],
    fieldMap: {
      'vital_status': 'Status', 'aliases': 'Aliases', 'also_known_as': 'Aliases',
      'title': 'Title', 'spirit': 'Spirit', 'spirit_rank': 'SpiritRank',
    },
    sectionAliases: { history: ['Background', 'Plot', 'History', 'Synopsis'] },
  },
  'thegreatruler': {
    templateNames: ['Character_Infobox', 'Character Infobox', 'CharacterInfobox'],
    fieldMap: {
      'also_known_as': 'Aliases', 'master(s)': 'Master', 'masters': 'Master',
      'chinese': 'ChineseName', 'pinyin': 'Pinyin', 'hair_color': 'HairColor',
      'eye_color': 'EyeColor', 'spouse': 'Spouse', 'family': 'Family',
      'friends': 'Friends', 'status': 'Status', 'species': 'Species',
      'gender': 'Gender', 'age': 'Age', 'affiliation': 'Affiliation',
      'occupation': 'Occupation',
    },
    sectionAliases: { history: ['Story', 'History', 'Background'] },
  },
  'xian-ni': {
    templateNames: ['Char temp 3.0', 'Character', 'Char temp'],
    fieldMap: {
      'vital_status': 'Status', 'aliases': 'Aliases',
      'title1': 'Title', 'chinese': 'ChineseName',
    },
    sectionAliases: {
      appearance: ['Overview', 'Appearance'],
      history: ['History', 'Background', 'Plot'],
    },
  },
  'wanmei-shijie': {
    templateNames: ['Character', 'CharacterInfo'],
    fieldMap: {
      'vital_status': 'Status', 'killed_by': 'KilledBy',
      'cause_of_death': 'CauseOfDeath', 'title1': 'Title',
      'aliases': 'Aliases', 'chinese': 'ChineseName', 'pinyin': 'Pinyin',
      'voice': 'VoiceActor',
    },
    sectionAliases: {
      history: ['Background', 'History', 'Synopsis'],
      appearance: ['Appearance', 'Overview'],
    },
  },
  'swallowed-star': {
    templateNames: ['Character', 'CharacterInfo', 'Infobox character'],
    fieldMap: {
      'vital_status': 'Status', 'aliases': 'Aliases', 'also_known_as': 'Aliases',
      'chinese': 'ChineseName',
    },
    sectionAliases: { history: ['Background', 'History', 'Plot'] },
  },
  'shrouding-the-heavens': {
    templateNames: ['Character', 'CharacterInfo'],
    fieldMap: {
      'vital_status': 'Status', 'aliases': 'Aliases',
      'chinese': 'ChineseName',
    },
    sectionAliases: { history: ['Background', 'History'] },
  },
  'stellar-transformations': {
    templateNames: ['Character', 'CharacterInfo', 'Infobox character'],
    fieldMap: {
      'vital_status': 'Status', 'aliases': 'Aliases',
      'chinese': 'ChineseName',
    },
    sectionAliases: { history: ['Background', 'History', 'Plot'] },
  },
  'wu-dong-qian-kun': {
    templateNames: ['Character', 'CharacterInfo', 'Infobox character'],
    fieldMap: {
      'vital_status': 'Status', 'aliases': 'Aliases', 'also_known_as': 'Aliases',
      'chinese': 'ChineseName', 'master': 'Master',
    },
    sectionAliases: { history: ['Background', 'History', 'Plot'] },
  },
};

// Global section aliases (fallbacks used for all wikis)
const GLOBAL_SECTION_ALIASES = {
  appearance:  ['Appearance', 'Overview', 'Description'],
  personality: ['Personality', 'Character', 'Traits'],
  history:     ['Background', 'History', 'Plot', 'Biography', 'Story', 'Synopsis'],
  trivia:      ['Trivia', 'Notes', 'Fun Facts'],
  quotes:      ['Quotes', 'Quotations', 'Notable Quotes'],
};

// ─────────────────────────────────────────────────────────────
// WIKITEXT TEMPLATE PARSER  (Strategy 1 — Primary for infobox)
// ─────────────────────────────────────────────────────────────

/**
 * Extract all key=value pairs from a wikitext template.
 * Handles: multi-line values, nested templates, wikilinks.
 * Returns: { fields: Record<string,string>, wikilinks: Record<string,string[]> }
 */
export function parseWikitextTemplate(wikitext, subdomain) {
  const config = WIKI_CONFIGS[subdomain] || {};
  const templateNames = config.templateNames || [];
  const fieldMap = config.fieldMap || {};

  const fields = {};
  const wikilinks = {}; // field name → array of linked entity names

  if (!wikitext) return { fields, wikilinks };

  // Build regex to find one of the known template names
  const escapedNames = templateNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!escapedNames) return { fields, wikilinks };

  const templateStartRegex = new RegExp(
    `\\{\\{\\s*(?:${escapedNames})\\s*\\n`,
    'i'
  );

  const startMatch = wikitext.match(templateStartRegex);
  if (!startMatch) return { fields, wikilinks };

  const templateStart = startMatch.index + startMatch[0].length;

  // Walk forward tracking brace depth to find template end
  let depth = 2; // {{ already consumed by finding start
  let pos = templateStart;
  let templateEnd = wikitext.length;

  while (pos < wikitext.length && depth > 0) {
    if (wikitext[pos] === '{' && wikitext[pos + 1] === '{') { depth += 2; pos += 2; }
    else if (wikitext[pos] === '}' && wikitext[pos + 1] === '}') {
      depth -= 2;
      if (depth <= 0) { templateEnd = pos; break; }
      pos += 2;
    }
    else { pos++; }
  }

  const templateBody = wikitext.substring(templateStart, templateEnd);

  // Split into | segments (top-level only)
  const segments = splitTemplateSegments(templateBody);

  for (const segment of segments) {
    const eqIdx = segment.indexOf('=');
    if (eqIdx < 0) continue;

    const rawKey = segment.substring(0, eqIdx).trim();
    const rawValue = segment.substring(eqIdx + 1).trim();

    if (!rawKey || rawKey.includes('\n') || rawKey.length > 60) continue;

    // Normalize key via field map
    const normalizedKey = fieldMap[rawKey] || fieldMap[rawKey.toLowerCase()] || rawKey;

    // Extract wikilinks from value: [[Target]] or [[Target|Display]]
    const links = [];
    const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(rawValue)) !== null) {
      links.push(linkMatch[1].trim());
    }
    if (links.length > 0) {
      wikilinks[normalizedKey] = links;
    }

    // Clean value: strip wiki markup but keep text
    const cleanValue = cleanWikiText(rawValue);
    if (cleanValue && cleanValue.length > 0) {
      fields[normalizedKey] = cleanValue;
    }
  }

  return { fields, wikilinks };
}

/**
 * Split template body into top-level | segments (respects nested {{ }} and [[ ]])
 */
function splitTemplateSegments(body) {
  const segments = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    const next = body[i + 1];

    if ((c === '{' && next === '{') || (c === '[' && next === '[')) {
      depth++;
      current += c + next;
      i++;
    } else if ((c === '}' && next === '}') || (c === ']' && next === ']')) {
      depth--;
      current += c + next;
      i++;
    } else if (c === '|' && depth === 0) {
      if (current.trim()) segments.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  if (current.trim()) segments.push(current.trim());
  return segments;
}

/**
 * Strip wikitext markup, keep readable text.
 */
function cleanWikiText(text) {
  return text
    .replace(/\{\{[Ss]idenote\|([^}]+)\}\}/g, '($1)')  // {{Sidenote|x}} → (x)
    .replace(/\{\{[Rr]ef\|[^}]+\}\}/g, '')              // {{ref|n}} → ''
    .replace(/\{\{[^}]+\}\}/g, '')                      // other templates → ''
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')      // [[X|Display]] → Display
    .replace(/\[\[([^\]]+)\]\]/g, '$1')                  // [[X]] → X
    .replace(/<[^>]+>/g, ' ')                            // strip HTML tags
    .replace(/^[\*#:;]+/gm, '')                          // strip list markers
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#91;/g, '[').replace(/&#93;/g, ']')
    .replace(/\[\d+\]/g, '')                             // [1], [2] references
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────
// HTML SECTION EXTRACTOR  (Strategy 2 — Narrative sections)
// ─────────────────────────────────────────────────────────────

/**
 * Extract narrative section text from rendered HTML.
 * Respects heading hierarchy — stops at next same-or-higher heading.
 */
export function extractSections(html, subdomain) {
  const config = WIKI_CONFIGS[subdomain] || {};
  const sectionAliases = config.sectionAliases || {};

  const result = {};

  // Clean infobox and TOC from body to prevent false heading matches
  const bodyHtml = html
    .replace(/<aside[^>]*class="[^"]*portable-infobox[^"]*"[^>]*>[\s\S]*?<\/aside>/g, '')
    .replace(/<div[^>]*id="toc"[^>]*>[\s\S]*?<\/div>/g, '');

  for (const [sectionKey, globalAliases] of Object.entries(GLOBAL_SECTION_ALIASES)) {
    const wikiAliases = sectionAliases[sectionKey] || [];
    // Wiki-specific aliases take priority, then global
    const allAliases = [...wikiAliases, ...globalAliases.filter(a => !wikiAliases.includes(a))];

    let extracted = '';
    for (const alias of allAliases) {
      extracted = extractOneSection(bodyHtml, alias);
      if (extracted) break;
    }
    result[sectionKey] = extracted;
  }

  return result;
}

function extractOneSection(bodyHtml, headingName) {
  const headingRegex = new RegExp(
    `<h([1-6])[^>]*>[\\s\\S]*?${escapeRegex(headingName)}[\\s\\S]*?<\\/h\\1>`,
    'i'
  );
  const hMatch = bodyHtml.match(headingRegex);
  if (!hMatch) return '';

  const hLevel = parseInt(hMatch[1]);
  const startIndex = hMatch.index + hMatch[0].length;
  const rest = bodyHtml.substring(startIndex);

  // Stop at the next heading of same or higher level
  const endHeadingRegex = new RegExp(`<h[1-${hLevel}]`, 'i');
  const nextHMatch = rest.match(endHeadingRegex);
  const sectionHtml = nextHMatch ? rest.substring(0, nextHMatch.index) : rest;

  const textBlocks = [];
  const blockRegex = /<(p|li)[^>]*>([\s\S]*?)<\/\1>/g;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(sectionHtml)) !== null) {
    const txt = blockMatch[2]
      .replace(/<[^>]*>/g, '')
      .replace(/&#91;\d+&#93;/g, '')
      .replace(/\[\d+\]/g, '')
      .trim();
    if (txt && txt.length > 15 && !txt.includes('mw-headline')) {
      textBlocks.push(txt);
    }
  }
  return textBlocks.join('\n\n');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────────
// HTML PORTABLE INFOBOX  (Strategy 3 — Fallback for infobox)
// ─────────────────────────────────────────────────────────────

export function parsePortableInfobox(html) {
  const fields = {};

  // Fandom Portable Infobox: <div class="pi-data ...">
  const dataItemRegex = /<div[^>]*class="[^"]*pi-data[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;
  while ((match = dataItemRegex.exec(html)) !== null) {
    const itemContent = match[1];
    const labelMatch = itemContent.match(/<h3[^>]*class="[^"]*pi-data-label[^"]*"[^>]*>([\s\S]*?)<\/h3>/);
    const valueMatch = itemContent.match(/<div[^>]*class="[^"]*pi-data-value[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (labelMatch && valueMatch) {
      const label = labelMatch[1].replace(/<[^>]*>/g, '').trim();
      const value = valueMatch[1].replace(/<[^>]*>/g, '').trim();
      if (label && value && label.length < 40) {
        fields[label] = value;
      }
    }
  }

  // Table-based infobox fallback
  if (Object.keys(fields).length === 0) {
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let trMatch;
    while ((trMatch = trRegex.exec(html)) !== null) {
      const trContent = trMatch[1];
      const thMatch = trContent.match(/<th[^>]*>([\s\S]*?)<\/th>/);
      const tdMatch = trContent.match(/<td[^>]*>([\s\S]*?)<\/td>/);
      if (thMatch && tdMatch) {
        const th = thMatch[1].replace(/<[^>]*>/g, '').trim();
        const td = tdMatch[1].replace(/<[^>]*>/g, '').trim();
        if (th && td && th.length < 30 && td.length < 200) {
          fields[th] = td;
        }
      }
    }
  }

  return fields;
}

// ─────────────────────────────────────────────────────────────
// IMAGE EXTRACTION + SCORING
// ─────────────────────────────────────────────────────────────

export function scoreImage(url) {
  if (!url) return 0;
  const lower = url.toLowerCase();
  if (
    lower.includes('placeholder') ||
    lower.includes('no_photo') ||
    lower.includes('2015060816373561467') ||
    lower.includes('x-icon') ||
    lower.includes('favicon') ||
    lower.includes('sprite')
  ) return 0;

  // Donghua/anime renders = best
  if (
    lower.includes('donghua') || lower.includes('iq.com') ||
    lower.includes('season') || lower.includes('episode') ||
    /[-_]s\d+[-_]/.test(lower) || /ep\d+/.test(lower)
  ) return 100;

  // Promotional posters
  if (lower.includes('poster') || lower.includes('profile')) return 85;

  // Novel / manhua (less preferred)
  if (lower.includes('manhua') || lower.includes('novel') || lower.includes('comic')) return 20;

  return 50;
}

export function cleanImageUrl(url) {
  if (!url) return '';
  const clean = url.replace(/\/scale-to-width-down\/\d+/, '');
  const parts = clean.split('/revision/latest');
  if (parts.length > 1) {
    const queryMatch = clean.match(/\?.*$/);
    return parts[0] + '/revision/latest' + (queryMatch ? queryMatch[0] : '');
  }
  return clean;
}

export function extractImages(html) {
  const seenUrls = new Set();
  const raw = [];

  const allImgRegex = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]*>/g;
  let m;
  while ((m = allImgRegex.exec(html)) !== null) {
    const src = m[1];
    if (
      src &&
      src.startsWith('http') &&
      !src.includes('data:image') &&
      src.includes('static.wikia.nocookie.net')
    ) {
      const cleaned = cleanImageUrl(src);
      const normalized = cleaned.split('/revision/latest')[0].toLowerCase();
      if (!seenUrls.has(normalized)) {
        seenUrls.add(normalized);
        raw.push(cleaned);
      }
    }
  }

  return raw
    .map(url => ({ url, score: scoreImage(url) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.url);
}

export function extractInfoboxImage(html) {
  const infoboxMatch = html.match(/<aside[^>]*class="[^"]*portable-infobox[^"]*"[^>]*>([\s\S]*?)<\/aside>/);
  if (infoboxMatch) {
    const images = [];
    const imgRegex = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]*>/g;
    let m;
    while ((m = imgRegex.exec(infoboxMatch[1])) !== null) {
      const src = m[1];
      if (src && !src.includes('placeholder') && !src.includes('data:image') && src.startsWith('http')) {
        images.push(cleanImageUrl(src));
      }
    }
    if (images.length > 0) {
      return images.sort((a, b) => scoreImage(b) - scoreImage(a))[0];
    }
  }
  return '';
}

// ─────────────────────────────────────────────────────────────
// INTRO TEXT EXTRACTION
// ─────────────────────────────────────────────────────────────

export function extractIntroText(html) {
  const bodyHtml = html
    .replace(/<aside[^>]*class="[^"]*portable-infobox[^"]*"[^>]*>[\s\S]*?<\/aside>/g, '')
    .replace(/<div[^>]*id="toc"[^>]*>[\s\S]*?<\/div>/g, '');

  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(bodyHtml)) !== null) {
    const pText = pMatch[1].replace(/<[^>]*>/g, '').trim();
    if (
      pText.length > 50 &&
      !pText.includes('MediaWiki') &&
      !pText.includes('Javascript') &&
      !pText.includes('Official Translations') &&
      !pText.includes('Web Novel') &&
      !pText.includes('source material rather than') &&
      !pText.startsWith('This article is based on')
    ) {
      return pText.replace(/&#91;\d+&#93;/g, '').replace(/\[\d+\]/g, '').trim();
    }
  }
  return '';
}

// ─────────────────────────────────────────────────────────────
// MAIN PARSE FUNCTION — Combines all strategies
// ─────────────────────────────────────────────────────────────

/**
 * Parse a Fandom wiki page into a normalized entity record.
 * @param {string} wikitext — Raw wikitext from action=parse&prop=wikitext
 * @param {string} html     — Rendered HTML from action=parse&prop=text
 * @param {string} subdomain — e.g. 'thegreatruler'
 */
export function parseFandomPage(wikitext, html, subdomain) {
  // Strategy 1: Wikitext template → infobox fields + wikilinks
  const { fields: wikitextFields, wikilinks } = parseWikitextTemplate(wikitext, subdomain);

  // Strategy 3: Portable infobox HTML fallback (only if wikitext gave nothing)
  const portableFields = Object.keys(wikitextFields).length === 0
    ? parsePortableInfobox(html)
    : {};

  // Merge infobox fields (wikitext wins over portable)
  const infobox = { ...portableFields, ...wikitextFields };

  // Strategy 2: HTML sections (runs always — sections never come from templates)
  const sections = extractSections(html, subdomain);

  // Images
  const allImages = extractImages(html);
  let infoboxImage = extractInfoboxImage(html);

  // Fallback image: use best-scored from allImages
  if (!infoboxImage || infoboxImage.includes('placeholder')) {
    infoboxImage = allImages[0] || '';
  }

  // Intro text
  const introText = extractIntroText(html);

  return {
    infobox,
    wikilinks,
    logoImage: infoboxImage,
    infoboxImage,
    introText,
    appearance: sections.appearance || '',
    personality: sections.personality || '',
    history: sections.history || '',
    trivia: sections.trivia || '',
    quotes: sections.quotes || '',
    allImages,
    galleryImages: [],  // explicit gallery parsing can be added per-wiki
  };
}
