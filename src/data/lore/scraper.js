import fs from 'fs';
import path from 'path';

const subdomains = ['battle-through-the-heavens', 'soulland'];

const categoryMap = {
  'battle-through-the-heavens': [
    { key: 'world', fandomCat: 'Locations' },
    { key: 'characters', fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Cultivation' },
    { key: 'techniques', fandomCat: 'Dou_Techniques' },
    { key: 'artifacts', fandomCat: 'Items' },
    { key: 'clans', fandomCat: 'Clans' },
    { key: 'gallery', fandomCat: 'Images' },
    { key: 'timeline', fandomCat: 'Seasons' }
  ],
  'soulland': [
    { key: 'world', fandomCat: 'Locations' },
    { key: 'characters', fandomCat: 'Characters' },
    { key: 'cultivation', fandomCat: 'Spirit_Rank' }, 
    { key: 'techniques', fandomCat: 'Spirit_Abilities' }, 
    { key: 'artifacts', fandomCat: 'Spirit_Bones' }, 
    { key: 'clans', fandomCat: 'Sects' }, 
    { key: 'gallery', fandomCat: 'Images' },
    { key: 'timeline', fandomCat: 'Seasons' }
  ]
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function cleanImageUrl(url) {
  if (!url) return '';
  // Strip dimensions but keep cache buster query string (?cb=...)
  const cleanUrl = url.replace(/\/scale-to-width-down\/\d+/, '');
  const parts = cleanUrl.split('/revision/latest');
  if (parts.length > 1) {
    const queryMatch = cleanUrl.match(/\?.*$/);
    const queryStr = queryMatch ? queryMatch[0] : '';
    return parts[0] + '/revision/latest' + queryStr;
  }
  return cleanUrl;
}

function parseHtmlContent(html) {
  const infobox = {};
  let logoImage = '';
  let infoboxImage = '';
  let introText = '';
  const galleryImages = [];

  if (!html) return { infobox, logoImage, infoboxImage, introText, appearance: '', personality: '', history: '', trivia: '', quotes: '', galleryImages, allImages: [] };

  // Helper to score Fandom images
  function getImageScore(url) {
    const lower = url.toLowerCase();
    if (lower.includes('placeholder') || lower.includes('no_photo') || lower.includes('2015060816373561467')) {
      return 0;
    }
    if (lower.includes('donghua') || lower.includes('season') || lower.includes('episode') || /s\d+/.test(lower) || /ep\d+/.test(lower) || lower.includes('s1') || lower.includes('s2') || lower.includes('s3') || lower.includes('s4') || lower.includes('s5')) {
      return 100;
    }
    if (lower.includes('manhua') || lower.includes('novel') || lower.includes('comic') || lower.includes('manga')) {
      return 20;
    }
    return 50;
  }

  // --- Parse Infobox Key-Values ---
  const dataItemRegex = /<div[^>]*class="[^"]*pi-data[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;
  while ((match = dataItemRegex.exec(html)) !== null) {
    const itemContent = match[1];
    const labelMatch = itemContent.match(/<h3[^>]*class="[^"]*pi-data-label[^"]*"[^>]*>([\s\S]*?)<\/h3>/);
    const valueMatch = itemContent.match(/<div[^>]*class="[^"]*pi-data-value[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (labelMatch && valueMatch) {
      const label = labelMatch[1].replace(/<[^>]*>/g, '').trim();
      const value = valueMatch[1].replace(/<[^>]*>/g, '').trim();
      if (label && value) {
        infobox[label] = value;
      }
    }
  }

  if (Object.keys(infobox).length === 0) {
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
          infobox[th] = td;
        }
      }
    }
  }

  // --- Collect & Score Portable Infobox Images ---
  const infoboxHtmlMatch = html.match(/<aside[^>]*class="[^"]*portable-infobox[^"]*"[^>]*>([\s\S]*?)<\/aside>/);
  if (infoboxHtmlMatch) {
    const infoboxHtml = infoboxHtmlMatch[1];
    const infoboxImages = [];
    const infoboxImgRegex = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = infoboxImgRegex.exec(infoboxHtml)) !== null) {
      const src = imgMatch[1];
      if (src && !src.includes('placeholder') && !src.includes('data:image') && src.startsWith('http')) {
        infoboxImages.push(cleanImageUrl(src));
      }
    }
    if (infoboxImages.length > 0) {
      const scoredInfobox = infoboxImages
        .map(url => ({ url, score: getImageScore(url) }))
        .sort((a, b) => b.score - a.score);
      logoImage = scoredInfobox[0].url;
      infoboxImage = logoImage;
    }
  }

  // Fallback to first image tag on page if infobox image is missing
  if (!logoImage) {
    const imgRegex = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const src = imgMatch[1];
      if (src && !src.includes('placeholder') && !src.includes('data:image') && !src.includes('sprite') && src.startsWith('http')) {
        logoImage = cleanImageUrl(src);
        break;
      }
    }
  }

  // --- Clean Body HTML (strip infobox and TOC) to prevent false heading matches ---
  const bodyHtml = html
    .replace(/<aside[^>]*class="[^"]*portable-infobox[^"]*"[^>]*>([\s\S]*?)<\/aside>/g, '')
    .replace(/<div[^>]*id="toc"[^>]*>([\s\S]*?)<\/div>/g, '');

  // --- Parse Intro Text (skipping disclaimers) ---
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
      introText = pText;
      break;
    }
  }

  // --- Parse Section Content with Heading-Level Boundaries ---
  const extractSection = (headingName) => {
    const headingRegex = new RegExp(`<h([1-6])[^>]*>[\\s\\S]*?(${headingName})[\\s\\S]*?</h\\1>`, 'i');
    const hMatch = bodyHtml.match(headingRegex);
    if (!hMatch) return '';
    
    const hLevel = parseInt(hMatch[1]);
    const startIndex = hMatch.index + hMatch[0].length;
    const rest = bodyHtml.substring(startIndex);
    
    const endHeadingRegex = new RegExp(`<h[1-${hLevel}]`, 'i');
    const nextHMatch = rest.match(endHeadingRegex);
    const sectionHtml = nextHMatch ? rest.substring(0, nextHMatch.index) : rest;
    
    const textBlocks = [];
    const blockRegex = /<(p|li)[^>]*>([\s\S]*?)<\/\1>/g;
    let blockMatch;
    while ((blockMatch = blockRegex.exec(sectionHtml)) !== null) {
      const txt = blockMatch[2].replace(/<[^>]*>/g, '').trim();
      if (txt && txt.length > 15 && !txt.includes('mw-headline')) {
        textBlocks.push(txt);
      }
    }
    return textBlocks.join('\n\n');
  };

  const appearance = extractSection('Appearance');
  const personality = extractSection('Personality');
  const history = extractSection('Background|History|Biography|Plot');
  const trivia = extractSection('Trivia');
  const quotes = extractSection('Quotes');

  // --- Parse Gallery Images ---
  const galleryImgRegex = /<div[^>]*class="[^"]*gallerytext[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let galMatch;
  while ((galMatch = galleryImgRegex.exec(html)) !== null) {
    const galHtml = galMatch[1];
    let gImgMatch;
    const innerImgRegex = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]*>/g;
    while ((gImgMatch = innerImgRegex.exec(galHtml)) !== null) {
      const src = gImgMatch[1];
      if (src && !src.includes('placeholder') && !src.includes('data:image') && src.startsWith('http')) {
        galleryImages.push(cleanImageUrl(src));
      }
    }
  }

  // --- Collect ALL images on page ---
  const allImages = [];
  const allImgRegex = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]*>/g;
  let allImgMatch;
  const seenUrls = new Set();
  const rawAllImages = [];
  while ((allImgMatch = allImgRegex.exec(html)) !== null) {
    const src = allImgMatch[1];
    if (
      src &&
      src.startsWith('http') &&
      !src.includes('data:image') &&
      !src.includes('sprite') &&
      !src.includes('placeholder') &&
      !src.includes('x-icon') &&
      !src.includes('favicon') &&
      !src.includes('tracking') &&
      !src.includes('pixel') &&
      !src.includes('1x1') &&
      src.includes('static.wikia.nocookie.net')
    ) {
      const cleaned = cleanImageUrl(src);
      const normalized = cleaned.split('/revision/latest')[0].toLowerCase();
      if (!seenUrls.has(normalized)) {
        seenUrls.add(normalized);
        rawAllImages.push(cleaned);
      }
    }
  }

  const scoredAllImages = rawAllImages
    .map(url => ({ url, score: getImageScore(url) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.url);

  let finalLogo = logoImage;
  let finalInfoboxImg = infoboxImage;

  const isLogoPlaceholder = !finalLogo || finalLogo.includes('2015060816373561467') || finalLogo.includes('No_Photo_Available') || finalLogo.includes('placeholder');
  if (isLogoPlaceholder && scoredAllImages.length > 0) {
    finalLogo = scoredAllImages[0];
    finalInfoboxImg = scoredAllImages[0];
  }

  const uniqueGallery = [...new Set(galleryImages)];

  return {
    infobox,
    logoImage: finalLogo,
    infoboxImage: finalInfoboxImg,
    introText,
    appearance,
    personality,
    history,
    trivia,
    quotes,
    galleryImages: uniqueGallery,
    allImages: scoredAllImages
  };
}

async function scrapeAll() {
  console.log('Starting Fandom Lore scraper...');
  const allData = {};

  for (const subdomain of subdomains) {
    allData[subdomain] = {};
    const categories = categoryMap[subdomain] || categoryMap['battle-through-the-heavens'];

    for (const catInfo of categories) {
      const { key, fandomCat } = catInfo;
      console.log(`\nFetching ${subdomain} -> Category:${fandomCat}...`);
      
      try {
        const members = [];
        let cmcontinue = '';
        do {
          const membersUrl = `https://${subdomain}.fandom.com/api.php?origin=*&format=json&action=query&list=categorymembers&cmtitle=Category:${fandomCat}&cmlimit=500${cmcontinue ? `&cmcontinue=${encodeURIComponent(cmcontinue)}` : ''}`;
          const membersRes = await fetch(membersUrl).then(r => r.json());
          const list = membersRes.query?.categorymembers || [];
          members.push(...list);
          cmcontinue = membersRes['query-continue']?.categorymembers?.cmcontinue || membersRes.continue?.cmcontinue || '';
        } while (cmcontinue);
        
        console.log(`Found ${members.length} members.`);
        allData[subdomain][key] = [];

        for (const m of members) {
          // Filter out subcategories, files, and templates
          if (m.title.startsWith('Category:') || m.title.startsWith('File:') || m.title.startsWith('Template:') || m.title.startsWith('Special:')) {
            continue;
          }

          console.log(`  -> Scraping page: "${m.title}"`);
          await sleep(20); 

          try {
            const parseUrl = `https://${subdomain}.fandom.com/api.php?action=parse&page=${encodeURIComponent(m.title)}&prop=text&redirects=1&format=json&origin=*`;
            const parseRes = await fetch(parseUrl).then(r => r.json());
            const parsed = parseRes?.parse || {};
            const html = parsed.text?.['*'] || '';
            const title = parsed.title || m.title;

            const parsedContent = parseHtmlContent(html);

            allData[subdomain][key].push({
              id: m.pageid,
              title,
              url: `https://${subdomain}.fandom.com/wiki/${encodeURIComponent(title)}`,
              ...parsedContent
            });
          } catch (pageErr) {
            console.error(`  Error scraping page "${m.title}":`, pageErr.message);
          }
        }
      } catch (catErr) {
        console.error(`Error scraping category "${fandomCat}":`, catErr.message);
      }
    }
  }

  const outputDir = path.resolve('public/data/lore');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const [sub, subData] of Object.entries(allData)) {
    const subPath = path.join(outputDir, `${sub}.json`);
    fs.writeFileSync(subPath, JSON.stringify(subData), 'utf-8');
    console.log(`Saved lore for ${sub} to: ${subPath}`);
  }
  console.log(`\nSuccessfully scraped all lore database.`);
}

scrapeAll().catch(err => {
  console.error('Fatal scrape error:', err);
});
