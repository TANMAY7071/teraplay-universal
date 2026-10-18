// DonghuaStream AniList Metadata Enrichment Script (with 429 Retry handling)
// Usage: node enrich-metadata.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwgvezljjaceoiybhklh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ANILIST_API = 'https://graphql.anilist.co';

const RATE_LIMIT_MS = 2500; // Increase to 2.5 seconds to be safe under AniList limits

// GraphQL search query
const SEARCH_QUERY = `
query ($search: String) {
  Media (search: $search, type: ANIME) {
    id
    title {
      romaji
      english
      native
      userPreferred
    }
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    description
    genres
    averageScore
    seasonYear
    studios(isMain: true) {
      nodes {
        name
      }
    }
  }
}
`;

// Helper: Clean HTML tags from AniList descriptions
function cleanDescription(desc) {
  if (!desc) return '';
  return desc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();
}

// Helper: Rate-limited AniList request with 429 Retry handling
async function searchAniList(title) {
  let attempt = 0;
  const maxAttempts = 3;
  
  while (attempt < maxAttempts) {
    attempt++;
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    console.log(`🔍 Searching AniList for: "${title}" (Attempt ${attempt})...`);
    
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
        // Read Retry-After header if present, otherwise default to 60 seconds
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        console.warn(`  ⚠️ Rate limited (429). Waiting for ${retryAfter} seconds before retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue; // Retry the loop
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`  ⚠ AniList returned HTTP ${response.status}: ${errText}`);
        return null;
      }

      const json = await response.json();
      return json?.data?.Media || null;
    } catch (err) {
      console.error(`  ✗ Error searching AniList for "${title}":`, err.message);
      return null;
    }
  }
  
  console.warn(`  ✗ Exceeded max attempts searching AniList for "${title}"`);
  return null;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   DonghuaStream — AniList Metadata Enrichment ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ ERROR: You must set your Supabase service_role key!');
    process.exit(1);
  }

  // 1. Fetch all shows from Supabase that haven't been enriched by AniList yet
  console.log('📡 Fetching unenriched shows from Supabase...');
  const { data: dbAnime, error: fetchErr } = await supabase
    .from('anime')
    .select('id, title, slug, poster_url, synopsis');

  if (fetchErr || !dbAnime) {
    console.error('❌ Failed to fetch shows from Supabase:', fetchErr?.message);
    process.exit(1);
  }

  // Filter shows locally: skip if the poster already comes from anilist.co
  const unenrichedShows = dbAnime.filter(show => {
    return !show.poster_url || !show.poster_url.includes('anilist.co');
  });

  console.log(`   Found ${dbAnime.length} total shows, ${unenrichedShows.length} need enrichment.\n`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const show of unenrichedShows) {
    // Clean search title: remove Season indicators to improve search hits (e.g. "Battle Through the Heavens Season 5" -> "Battle Through the Heavens")
    const cleanSearchTitle = show.title
      .replace(/\s+Season\s+\d+/i, '')
      .replace(/\s+S\d+/i, '')
      .replace(/:\s+.*$/, '') // remove subtitle/arcs
      .trim();

    const media = await searchAniList(cleanSearchTitle);

    if (!media) {
      console.log(`  ✗ No match on AniList for: "${show.title}" (searched as "${cleanSearchTitle}")`);
      notFoundCount++;
      continue;
    }

    // Prepare update parameters
    const updateData = {};

    // 1. Clean Cover Image (watermark-free from AniList)
    const cleanPoster = media.coverImage?.extraLarge || media.coverImage?.large;
    if (cleanPoster && show.poster_url !== cleanPoster) {
      updateData.poster_url = cleanPoster;
      console.log(`  📸 Poster found: ${cleanPoster.substring(0, 60)}...`);
    }

    // 2. Banner URL
    if (media.bannerImage) {
      updateData.banner_url = media.bannerImage;
    }

    // 3. Clean English Synopsis (no HTML tags)
    const cleanDesc = cleanDescription(media.description);
    if (cleanDesc && cleanDesc.length > 10) {
      updateData.synopsis = cleanDesc;
    }

    // 4. Genres (mapped to array)
    if (media.genres && media.genres.length > 0) {
      updateData.genres = media.genres;
    }

    // 5. Studio
    const studioName = media.studios?.nodes?.[0]?.name;
    if (studioName) {
      updateData.studio = studioName;
    }

    // 6. Rating (AniList gives a score out of 100, normalize it to 10.0 scale)
    if (media.averageScore) {
      updateData.rating = parseFloat((media.averageScore / 10).toFixed(1));
    }

    // 7. Year
    if (media.seasonYear) {
      updateData.year = media.seasonYear;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      
      const { error: updateErr } = await supabase
        .from('anime')
        .update(updateData)
        .eq('id', show.id);

      if (updateErr) {
        console.warn(`  ✗ Database update failed for "${show.title}":`, updateErr.message);
      } else {
        console.log(`  ✓ Successfully enriched: "${show.title}" (AniList ID: ${media.id})`);
        updatedCount++;
      }
    } else {
      console.log(`  ➖ "${show.title}" is already up-to-date.`);
    }
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🎉 ENRICHMENT COMPLETE                     ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║   Shows updated:    ${updatedCount.toString().padEnd(25)}║`);
  console.log(`║   No match found:   ${notFoundCount.toString().padEnd(25)}║`);
  console.log('╚══════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
