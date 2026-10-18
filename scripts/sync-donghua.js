// DonghuaStream Sync Script — Imports real donghua data from Donghua API + Donghub API into Supabase
// Usage: node sync-donghua.js
//
// This script:
// 1. Fetches all ongoing + completed donghua from the Donghua API
// 2. Fetches details for each show (genres, synopsis, episode count)
// 3. Upserts everything into your Supabase `anime` table
// 4. Fetches the weekly schedule and populates the `schedule` table
// 5. Rate-limited to ~30 requests/minute (well under the 50/min cap)

import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://wwgvezljjaceoiybhklh.supabase.co';
// You MUST replace this with your service_role key from Supabase Dashboard → Settings → API
// The service_role key can INSERT data, unlike the anon key which is read-only for catalog tables.
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

const DONGHUA_API_BASE = 'https://www.sankavollerei.web.id/anime/donghua';
const DONGHUB_API_BASE = 'https://www.sankavollerei.web.id/anime/donghub';

const RATE_LIMIT_MS = 2000; // 2 seconds between requests = 30 req/min (safe under 50/min limit)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// UTILITY: Rate-limited fetch
// ============================================
let lastRequestTime = 0;

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  console.log(`  → Fetching: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DonghuaStream-Sync/1.0',
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
  }

  return response.json();
}

// ============================================
// HELPER: Clean title (remove episode info from titles)
// ============================================
function cleanTitle(title) {
  // Remove patterns like "Episode 278 Subtitle Indonesia" from titles
  return title
    .replace(/\s+Episode\s+\d+.*$/i, '')
    .replace(/\s+Subtitle\s+Indonesia$/i, '')
    .replace(/\s+Tamat.*$/i, '')
    .replace(/\t+.*$/, '') // Remove tab-separated duplicates from Donghub
    .trim();
}

// ============================================
// HELPER: Extract clean slug (base show slug, not episode slug)
// ============================================
function cleanSlug(slug) {
  return slug
    .replace(/-episode-\d+.*$/i, '')
    .replace(/\/$/, '')
    .trim();
}

// ============================================
// HELPER: Extract episode number from string
// ============================================
function extractEpisodeNumber(str) {
  if (!str) return null;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

// ============================================
// STEP 1: Fetch ongoing donghua list from Donghua API (paginated)
// ============================================
async function fetchOngoingDonghua(maxPages = 5) {
  const allShows = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const data = await rateLimitedFetch(`${DONGHUA_API_BASE}/ongoing/${page}`);
      if (data.status !== 'success' || !data.ongoing_donghua || data.ongoing_donghua.length === 0) {
        break;
      }
      allShows.push(...data.ongoing_donghua);
      console.log(`  ✓ Ongoing page ${page}: ${data.ongoing_donghua.length} shows`);
    } catch (err) {
      console.warn(`  ✗ Ongoing page ${page} failed:`, err.message);
      break;
    }
  }

  return allShows;
}

// ============================================
// STEP 2: Fetch completed donghua list (paginated)
// ============================================
async function fetchCompletedDonghua(maxPages = 5) {
  const allShows = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const data = await rateLimitedFetch(`${DONGHUA_API_BASE}/completed/${page}`);
      if (data.status !== 'success' || !data.completed_donghua || data.completed_donghua.length === 0) {
        break;
      }
      allShows.push(...data.completed_donghua);
      console.log(`  ✓ Completed page ${page}: ${data.completed_donghua.length} shows`);
    } catch (err) {
      console.warn(`  ✗ Completed page ${page} failed:`, err.message);
      break;
    }
  }

  return allShows;
}

// ============================================
// STEP 3: Fetch show details (genres, synopsis, episode list)
// ============================================
async function fetchShowDetail(slug) {
  try {
    const data = await rateLimitedFetch(`${DONGHUA_API_BASE}/detail/${slug}`);
    if (data && data.title) {
      return data;
    }
  } catch (err) {
    console.warn(`  ✗ Detail fetch failed for ${slug}:`, err.message);
  }
  return null;
}

// ============================================
// STEP 4: Fetch weekly schedule
// ============================================
async function fetchSchedule() {
  try {
    const data = await rateLimitedFetch(`${DONGHUA_API_BASE}/schedule`);
    if (data.status === 'success' && data.schedule) {
      return data.schedule;
    }
  } catch (err) {
    console.warn(`  ✗ Schedule fetch failed:`, err.message);
  }
  return [];
}

// ============================================
// STEP 5: Also get data from Donghub API for richer metadata
// ============================================
async function fetchDonghubHome() {
  try {
    const data = await rateLimitedFetch(`${DONGHUB_API_BASE}/home`);
    if (data.status === 'success' && data.data) {
      return data.data;
    }
  } catch (err) {
    console.warn(`  ✗ Donghub home fetch failed:`, err.message);
  }
  return null;
}

// ============================================
// STEP 6: Fetch all genres from Donghua API
// ============================================
async function fetchGenres() {
  try {
    const data = await rateLimitedFetch(`${DONGHUA_API_BASE}/genres`);
    if (data.status === 'success') {
      return data.genres || data.genre_list || [];
    }
  } catch (err) {
    console.warn(`  ✗ Genres fetch failed:`, err.message);
  }
  return [];
}

// ============================================
// MAIN SYNC: Upsert shows into Supabase
// ============================================
async function syncShowsToSupabase(shows, status = 'Ongoing') {
  let successCount = 0;
  let errorCount = 0;

  for (const show of shows) {
    const title = cleanTitle(show.title);
    const slug = cleanSlug(show.slug);

    // Skip if slug is too generic or empty
    if (!slug || slug.length < 3) {
      console.warn(`  ⚠ Skipping show with invalid slug: "${show.title}"`);
      continue;
    }

    const episodeCount = extractEpisodeNumber(show.current_episode || show.episode);

    const upsertData = {
      slug: slug,
      title: title,
      poster_url: show.poster || '',
      status: status,
      format: show.type === 'Movie' ? 'Movie' : '3D',
      episode_count: episodeCount || 0,
      year: new Date().getFullYear(), // Will be enriched from detail endpoint
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('anime')
        .upsert(upsertData, { onConflict: 'slug' });

      if (error) {
        console.warn(`  ✗ Upsert failed for "${title}":`, error.message);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err) {
      console.warn(`  ✗ Exception upserting "${title}":`, err.message);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

// ============================================
// DETAIL ENRICHMENT: Fetch and update show details
// ============================================
async function enrichShowDetails(slugs, maxEnrich = 50) {
  let enriched = 0;

  for (const slug of slugs.slice(0, maxEnrich)) {
    const detail = await fetchShowDetail(slug);
    if (!detail) continue;

    const updateData = {};

    // Extract synopsis
    if (detail.synopsis) {
      updateData.synopsis = detail.synopsis;
    }

    // Extract genres as array
    if (detail.genres && Array.isArray(detail.genres)) {
      updateData.genres = detail.genres.map(g => g.name || g).filter(Boolean);
    }

    // Extract year from detail if available
    if (detail.season) {
      updateData.year = parseInt(detail.season, 10) || new Date().getFullYear();
    } else if (detail.released_on) {
      const match = detail.released_on.match(/\d{4}/);
      if (match) {
        updateData.year = parseInt(match[0], 10);
      }
    }

    // Extract studio
    if (detail.studio) {
      updateData.studio = detail.studio;
    }

    // Extract rating
    if (detail.rating) {
      const rating = parseFloat(detail.rating);
      if (!isNaN(rating)) {
        updateData.rating = rating;
      }
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('anime')
        .update(updateData)
        .eq('slug', slug);

      if (error) {
        console.warn(`  ✗ Enrichment failed for "${slug}":`, error.message);
      } else {
        enriched++;
        console.log(`  ✓ Enriched: ${slug}`);
      }
    }
  }

  return enriched;
}

// ============================================
// SCHEDULE SYNC: Populate the schedule table
// ============================================
async function syncScheduleToSupabase(schedule) {
  let successCount = 0;

  // First, clear old schedule data
  const { error: deleteError } = await supabase
    .from('schedule')
    .delete()
    .neq('id', 0); // Delete all rows

  if (deleteError) {
    console.warn('  ✗ Failed to clear old schedule:', deleteError.message);
  }

  for (const dayEntry of schedule) {
    const dayOfWeek = dayEntry.day; // "Monday", "Tuesday", etc.

    for (const show of dayEntry.donghua_list) {
      const slug = show.slug;
      const airTime = show.release_time || '';
      const episodeNum = extractEpisodeNumber(show.episode);

      // Look up the anime_id from our anime table
      const { data: animeRow } = await supabase
        .from('anime')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!animeRow) {
        // If the show isn't in our DB yet, insert a basic entry first
        const { data: newAnime, error: insertErr } = await supabase
          .from('anime')
          .upsert({
            slug: slug,
            title: show.title,
            poster_url: show.poster || '',
            status: 'Ongoing',
            year: new Date().getFullYear(),
            format: '3D',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'slug' })
          .select('id')
          .single();

        if (insertErr || !newAnime) {
          console.warn(`  ✗ Schedule: Could not find/create anime for slug "${slug}"`);
          continue;
        }

        const scheduleEntry = {
          anime_id: newAnime.id,
          day_of_week: dayOfWeek,
          air_time: airTime,
          episode_number: episodeNum || 0,
        };

        const { error } = await supabase.from('schedule').insert(scheduleEntry);
        if (!error) successCount++;
        continue;
      }

      const scheduleEntry = {
        anime_id: animeRow.id,
        day_of_week: dayOfWeek,
        air_time: airTime,
        episode_number: episodeNum || 0,
      };

      const { error } = await supabase.from('schedule').insert(scheduleEntry);
      if (error) {
        console.warn(`  ✗ Schedule insert failed for "${show.title}":`, error.message);
      } else {
        successCount++;
      }
    }
  }

  return successCount;
}

// ============================================
// DONGHUB ENRICHMENT: Add slider/banner data
// ============================================
async function enrichFromDonghub(donghubData) {
  if (!donghubData || !donghubData.slider) return 0;

  let enriched = 0;

  for (const item of donghubData.slider) {
    const slug = item.slug;
    const synopsis = item.synopsis || '';
    const bannerPoster = item.poster || '';

    if (slug && (synopsis || bannerPoster)) {
      const updateData = { updated_at: new Date().toISOString() };
      if (synopsis) updateData.synopsis = synopsis;
      if (bannerPoster) updateData.banner_url = bannerPoster;

      const { error } = await supabase
        .from('anime')
        .update(updateData)
        .eq('slug', slug);

      if (!error) {
        enriched++;
        console.log(`  ✓ Donghub enrichment: ${slug}`);
      }
    }
  }

  return enriched;
}

// ============================================
// LOG SYNC RESULT
// ============================================
async function logSync(source, status, itemsSynced, errorMsg = null) {
  try {
    await supabase.from('sync_log').insert({
      source,
      status,
      items_synced: itemsSynced,
      error_msg: errorMsg,
    });
  } catch (err) {
    // sync_log table might not exist yet, that's fine
    console.log(`  (sync_log not available: ${err.message})`);
  }
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   DonghuaStream — Data Sync Script          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ ERROR: You must set your Supabase service_role key!');
    console.error('');
    console.error('   Find it at: Supabase Dashboard → Settings → API → service_role key');
    console.error('');
    console.error('   Then run:');
    console.error('   SUPABASE_SERVICE_KEY="eyJ..." node sync-donghua.js');
    console.error('');
    console.error('   ⚠️  The service_role key is SECRET. Never commit it to git.');
    process.exit(1);
  }

  const startTime = Date.now();

  // ── Step 1: Fetch ongoing donghua ──
  console.log('📡 Step 1/6: Fetching ongoing donghua...');
  const ongoing = await fetchOngoingDonghua(5);
  console.log(`   Found ${ongoing.length} ongoing donghua\n`);

  // ── Step 2: Fetch completed donghua ──
  console.log('📡 Step 2/6: Fetching completed donghua...');
  const completed = await fetchCompletedDonghua(3);
  console.log(`   Found ${completed.length} completed donghua\n`);

  // ── Step 3: Upsert all shows ──
  console.log('💾 Step 3/6: Syncing shows to Supabase...');
  const ongoingResult = await syncShowsToSupabase(ongoing, 'Ongoing');
  const completedResult = await syncShowsToSupabase(completed, 'Completed');
  const totalSynced = ongoingResult.successCount + completedResult.successCount;
  const totalErrors = ongoingResult.errorCount + completedResult.errorCount;
  console.log(`   ✅ Synced: ${totalSynced} | ❌ Errors: ${totalErrors}\n`);

  // ── Step 4: Enrich with details ──
  console.log('🔍 Step 4/6: Enriching show details (genres, synopsis)...');
  const allSlugs = [...new Set([
    ...ongoing.map(s => cleanSlug(s.slug)),
    ...completed.map(s => cleanSlug(s.slug)),
  ])];
  const enrichedCount = await enrichShowDetails(allSlugs, 30); // Limit to 30 to stay under rate limits
  console.log(`   ✅ Enriched: ${enrichedCount} shows\n`);

  // ── Step 5: Sync schedule ──
  console.log('📅 Step 5/6: Syncing weekly schedule...');
  const schedule = await fetchSchedule();
  const scheduleCount = await syncScheduleToSupabase(schedule);
  console.log(`   ✅ Schedule entries: ${scheduleCount}\n`);

  // ── Step 6: Donghub enrichment ──
  console.log('🎬 Step 6/6: Enriching from Donghub API (banners, synopsis)...');
  const donghubData = await fetchDonghubHome();
  const donghubEnriched = await enrichFromDonghub(donghubData);
  console.log(`   ✅ Donghub enriched: ${donghubEnriched}\n`);

  // ── Summary ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   ✅ SYNC COMPLETE                          ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║   Shows synced:     ${totalSynced.toString().padEnd(25)}║`);
  console.log(`║   Shows enriched:   ${enrichedCount.toString().padEnd(25)}║`);
  console.log(`║   Schedule entries: ${scheduleCount.toString().padEnd(25)}║`);
  console.log(`║   Donghub enriched: ${donghubEnriched.toString().padEnd(25)}║`);
  console.log(`║   Errors:           ${totalErrors.toString().padEnd(25)}║`);
  console.log(`║   Time taken:       ${(elapsed + 's').padEnd(25)}║`);
  console.log('╚══════════════════════════════════════════════╝');

  // Log the sync
  await logSync('donghua-api+donghub', totalErrors > 0 ? 'partial' : 'success', totalSynced);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
