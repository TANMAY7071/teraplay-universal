import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wwgvezljjaceoiybhklh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY is required.");
  process.exit(1);
}

if (!YOUTUBE_API_KEY) {
  console.warn("⚠️ YOUTUBE_API_KEY is not defined. Script will run in DRY-RUN mode (logging queries without calling YouTube API).");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to delay execution (rate limiting)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 Starting Automated Trailer Scout...");

  // 1. Fetch all anime catalog to map IDs to titles
  const { data: animes, error: animeError } = await supabase
    .from('anime')
    .select('id, title');

  if (animeError) {
    console.error("❌ Failed to fetch anime:", animeError);
    return;
  }

  const animeMap = new Map(animes.map(a => [a.id, a.title]));
  console.log(`📦 Loaded ${animeMap.size} anime titles for mapping.`);

  // 2. Fetch episodes that lack a trailer ID
  const { data: episodes, error: epError } = await supabase
    .from('episodes')
    .select('id, anime_id, episode_number')
    .is('youtube_trailer_id', null)
    .order('created_at', { ascending: false });

  if (epError) {
    console.error("❌ Failed to fetch episodes:", epError);
    return;
  }

  console.log(`🔍 Found ${episodes.length} episodes lacking a trailer.`);

  // 3. Process each episode with rate limiting
  for (const ep of episodes) {
    const animeTitle = animeMap.get(ep.anime_id);
    if (!animeTitle) continue;

    const searchQuery = `${animeTitle} Episode ${ep.episode_number} Trailer`;
    console.log(`📡 Scouting: "${searchQuery}"`);

    if (!YOUTUBE_API_KEY) {
      console.log(`[DRY-RUN] Would search YouTube for: "${searchQuery}"`);
      await sleep(500);
      continue;
    }

    try {
      // Query YouTube API v3 search endpoint
      const params = new URLSearchParams({
        q: searchQuery,
        part: 'snippet',
        maxResults: '1',
        type: 'video',
        key: YOUTUBE_API_KEY
      });

      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      
      if (response.status === 429) {
        console.warn("⚠️ YouTube API quota exceeded or rate limited. Sleeping for 30s...");
        await sleep(30000);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ YouTube API error: ${response.status} - ${errText}`);
        await sleep(2000);
        continue;
      }

      const ytData = await response.json();
      const videoId = ytData.items?.[0]?.id?.videoId;

      if (videoId) {
        console.log(`✨ Match found! YouTube ID: ${videoId} for ${animeTitle} Ep ${ep.episode_number}`);

        const { error: updateError } = await supabase
          .from('episodes')
          .update({ youtube_trailer_id: videoId })
          .eq('id', ep.id);

        if (updateError) {
          console.error(`❌ Failed to update episode in database:`, updateError);
        } else {
          console.log(`✅ Saved to database.`);
        }
      } else {
        console.log(`❓ No match found on YouTube for "${searchQuery}"`);
      }
    } catch (err) {
      console.error(`❌ Request failed:`, err);
    }

    // Respectful rate limiting: wait 2 seconds between queries
    await sleep(2000);
  }

  console.log("🏁 Automated Trailer Scout completed.");
}

main();
