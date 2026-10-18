// DonghuaStream Alternative Title AniList Matcher (with Title Splitting)
// Usage: node enrich-by-alternative.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwgvezljjaceoiybhklh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DONGHUA_API_BASE = 'https://www.sankavollerei.web.id/anime/donghua';
const ANILIST_API = 'https://graphql.anilist.co';

const RATE_LIMIT_MS = 2500;

const SEARCH_QUERY = `
query ($search: String) {
  Media (search: $search, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
    }
    bannerImage
    description
    genres
    averageScore
    studios(isMain: true) {
      nodes {
        name
      }
    }
  }
}
`;

function cleanDescription(desc) {
  if (!desc) return '';
  return desc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();
}

async function fetchSankaAlterTitle(slug) {
  const url = `${DONGHUA_API_BASE}/detail/${slug}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DonghuaStream-Sync/1.0', 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.alter_title || null;
  } catch (err) {
    return null;
  }
}

async function searchAniList(title) {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { search: title }
      })
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      console.warn(`  ⚠️ Rate limited. Waiting ${retryAfter}s...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return searchAniList(title); // retry
    }

    if (!response.ok) return null;
    const json = await response.json();
    return json?.data?.Media || null;
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   DonghuaStream — Alternative Title Enricher ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ ERROR: You must set your Supabase service_role key!');
    process.exit(1);
  }

  // 1. Find shows with watermarked posters (containing anichin)
  const { data: dbAnime, error: fetchErr } = await supabase
    .from('anime')
    .select('id, title, slug, poster_url');

  if (fetchErr || !dbAnime) {
    console.error('❌ Failed to fetch shows:', fetchErr?.message);
    process.exit(1);
  }

  const watermarkedShows = dbAnime.filter(show => {
    return show.poster_url && (show.poster_url.includes('anichin') || show.poster_url.includes('wp-content'));
  });

  console.log(`📡 Found ${watermarkedShows.length} shows using watermarked posters.\n`);

  let resolvedCount = 0;

  for (const show of watermarkedShows) {
    console.log(`🎬 Checking: "${show.title}"...`);
    
    // 2. Get alternative title from Sanka detail
    const alterTitle = await fetchSankaAlterTitle(show.slug);
    if (!alterTitle || alterTitle.trim() === '') {
      console.log(`  ➖ No alternative title found on Sanka. Keeping existing poster.`);
      continue;
    }
    
    console.log(`  Sanka alternative title(s): "${alterTitle}"`);

    // Split title by comma, semicolon or slash, and clean each candidate
    const candidates = alterTitle
      .split(/[,;/\|]/)
      .map(c => c.trim())
      .filter(c => c.length > 2);

    let matchedMedia = null;

    for (const rawCandidate of candidates) {
      // Clean candidate title (remove brackets, etc.)
      const candidate = rawCandidate.replace(/\(.*?\)/g, '').trim();
      if (candidate.length < 3) continue;

      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
      console.log(`    🔍 Searching AniList for synonym: "${candidate}"...`);
      const media = await searchAniList(candidate);

      if (media) {
        matchedMedia = media;
        console.log(`    ✓ Match found on AniList!`);
        break; // Stop searching candidate synonyms
      }
    }

    if (!matchedMedia) {
      console.log(`  ✗ None of the alternative titles matched on AniList.`);
      continue;
    }

    const cleanPoster = matchedMedia.coverImage?.extraLarge || matchedMedia.coverImage?.large;
    if (cleanPoster) {
      const updateData = {
        poster_url: cleanPoster,
        updated_at: new Date().toISOString()
      };

      if (matchedMedia.bannerImage) updateData.banner_url = matchedMedia.bannerImage;
      const desc = cleanDescription(matchedMedia.description);
      if (desc) updateData.synopsis = desc;
      if (matchedMedia.genres) updateData.genres = matchedMedia.genres;

      // Update Database
      const { error: updateErr } = await supabase
        .from('anime')
        .update(updateData)
        .eq('id', show.id);

      if (updateErr) {
        console.warn(`  ✗ Failed to update: ${updateErr.message}`);
      } else {
        console.log(`  🎉 Success! Replaced with clean AniList cover: ${cleanPoster}`);
        resolvedCount++;
      }
    }
  }

  console.log(`\n🎉 Replaced ${resolvedCount} watermarked posters with clean AniList cover images!`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
