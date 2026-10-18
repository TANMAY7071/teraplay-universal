// DonghuaStream Sanka Detail Enrichment Script
// Usage: node enrich-from-sanka.js
//
// This script:
// 1. Fetches all shows from Supabase that are missing synopsis or genres.
// 2. Fetches details from Sanka's detail endpoint: /detail/${slug}.
// 3. Updates Supabase with genres, synopsis, studio, rating, and year.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwgvezljjaceoiybhklh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DONGHUA_API_BASE = 'https://www.sankavollerei.web.id/anime/donghua';

const RATE_LIMIT_MS = 2000; // 2 seconds between requests to be safe under Sanka's 50 req/min cap

async function fetchSankaDetail(slug) {
  const url = `${DONGHUA_API_BASE}/detail/${slug}`;
  console.log(`  → Fetching Sanka details for: ${slug}...`);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DonghuaStream-Sync/1.0',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.warn(`  ⚠ Sanka returned HTTP ${response.status} for "${slug}"`);
      return null;
    }

    const data = await response.json();
    if (data && data.title) {
      return data;
    }
  } catch (err) {
    console.error(`  ✗ Error fetching Sanka details for "${slug}":`, err.message);
  }
  return null;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   DonghuaStream — Sanka Detail Enrichment    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ ERROR: You must set your Supabase service_role key!');
    process.exit(1);
  }

  // 1. Fetch all shows from Supabase
  console.log('📡 Fetching all shows from Supabase...');
  const { data: dbAnime, error: fetchErr } = await supabase
    .from('anime')
    .select('id, title, slug, synopsis, genres');

  if (fetchErr || !dbAnime) {
    console.error('❌ Failed to fetch shows from Supabase:', fetchErr?.message);
    process.exit(1);
  }

  // Filter shows missing synopsis OR genres
  const showsToEnrich = dbAnime.filter(show => {
    const missingSynopsis = !show.synopsis || show.synopsis.trim() === '';
    const missingGenres = !show.genres || !Array.isArray(show.genres) || show.genres.length === 0;
    return missingSynopsis || missingGenres;
  });

  console.log(`   Found ${dbAnime.length} total shows, ${showsToEnrich.length} need Sanka details enrichment.\n`);

  let enrichedCount = 0;
  let failedCount = 0;

  for (const show of showsToEnrich) {
    // Wait to respect rate limits
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));

    const detail = await fetchSankaDetail(show.slug);
    if (!detail) {
      failedCount++;
      continue;
    }

    const updateData = {};

    // 1. Synopsis (keep Indonesian synopsis since no AniList was found)
    if (detail.synopsis && (!show.synopsis || show.synopsis.trim() === '')) {
      updateData.synopsis = detail.synopsis;
    }

    // 2. Genres
    if (detail.genres && Array.isArray(detail.genres) && (!show.genres || show.genres.length === 0)) {
      updateData.genres = detail.genres.map(g => g.name || g).filter(Boolean);
    }

    // 3. Studio
    if (detail.studio) {
      updateData.studio = detail.studio;
    }

    // 4. Rating
    if (detail.rating) {
      const rating = parseFloat(detail.rating);
      if (!isNaN(rating)) {
        updateData.rating = rating;
      }
    }

    // 5. Year
    if (detail.season) {
      updateData.year = parseInt(detail.season, 10) || new Date().getFullYear();
    } else if (detail.released_on) {
      const match = detail.released_on.match(/\d{4}/);
      if (match) {
        updateData.year = parseInt(match[0], 10);
      }
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from('anime')
        .update(updateData)
        .eq('id', show.id);

      if (updateErr) {
        console.warn(`  ✗ Database update failed for "${show.title}":`, updateErr.message);
        failedCount++;
      } else {
        console.log(`  ✓ Successfully enriched from Sanka: "${show.title}"`);
        enrichedCount++;
      }
    } else {
      console.log(`  ➖ "${show.title}" details are already up-to-date.`);
    }
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🎉 SANKA ENRICHMENT COMPLETE               ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║   Shows enriched:   ${enrichedCount.toString().padEnd(25)}║`);
  console.log(`║   Failed / Ignored: ${failedCount.toString().padEnd(25)}║`);
  console.log('╚══════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
