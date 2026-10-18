import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    // This job writes to the catalog and must bypass RLS; falling back to the
    // anon key would silently no-op every write under RLS, so fail fast.
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('sync-schedule: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return res.status(500).json({ error: "Supabase service credentials not configured" });
    }

    // Bypass RLS using service role key if available
    const supabase = createClient(supabaseUrl, supabaseKey);
    const ANILIST_API_URL = "https://graphql.anilist.co";
    
    // Vercel Cron Security: Only allow requests from Vercel's Cron unless manual bypass is tested
    const authHeader = req.headers.authorization;
    const isManualTrigger = req.query.manual === "true";
    
    // Check Cron or manual secret verification (preventing anonymous triggers via ?manual=true)
    const isValidCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isValidManual = isManualTrigger && process.env.ADMIN_SYNC_TOKEN && authHeader === `Bearer ${process.env.ADMIN_SYNC_TOKEN}`;

    if (!isValidCron && !isValidManual) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const query = `
      query {
        Page(page: 1, perPage: 50) {
          airingSchedules(
            notYetAired: true, 
            sort: TIME_DESC
          ) {
            id
            airingAt
            timeUntilAiring
            episode
            media {
              id
              countryOfOrigin
              synonyms
              title { english romaji native }
            }
          }
        }
      }
    `;

    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    if (!data.data) {
      console.error("AniList Error:", JSON.stringify(data.errors, null, 2));
      return res.status(500).json({ error: "AniList API Error" });
    }
    const schedules = data.data.Page.airingSchedules.filter((s) => s.media.countryOfOrigin === 'CN');
    
    console.log(`Found ${schedules.length} upcoming Chinese Donghua episodes.`);
    
    let updatedCount = 0;

    for (const s of schedules) {
      const anilistId = s.media.id;
      const { data: animeRecord } = await supabase.from('anime').select('id, title').eq('anilist_id', anilistId).maybeSingle();
      
      if (animeRecord) {
        const airDate = new Date(s.airingAt * 1000);
        const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(airDate);
        const airTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(airDate);
        
        // 1. Update Airing Schedule
        await supabase.from('schedule').upsert({
          anime_id: animeRecord.id,
          day_of_week: dayOfWeek,
          air_time: airTime,
          episode_number: s.episode,
          is_simulcast: true,
          // Q2: store AniList's real airing timestamp so the calendar can show
          // actual dates (day_of_week/air_time remain as fallback fields)
          air_date: airDate.toISOString()
        }, { onConflict: 'anime_id' });

        // 2. Synchronize Episodes & Enrich from Simkl
        await syncEpisodesForAnime(supabase, animeRecord.id, anilistId, animeRecord.title);

        updatedCount++;
      }
    }
    
    return res.status(200).json({ success: true, message: `Updated schedule and synced episodes for ${updatedCount} anime.` });
  } catch (error) {
    console.error("Sync Error:", error);
    return res.status(500).json({ error: "Schedule sync failed" });
  }
}

async function syncEpisodesForAnime(supabase, animeId, anilistId, animeTitle) {
  try {
    const ANILIST_API_URL = "https://graphql.anilist.co";
    
    // 1. Fetch episodes from AniList
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { english userPreferred }
          episodes
          duration
          startDate { year month day }
          coverImage { large }
          airingSchedule(page: 1, perPage: 100) {
            nodes { id airingAt timeUntilAiring episode }
          }
        }
      }
    `;
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { id: anilistId } })
    });
    const data = await response.json();
    if (!data.data || !data.data.Media) {
      console.error(`AniList media query failed for id ${anilistId}`);
      return;
    }
    const media = data.data.Media;
    const episodesCount = media.episodes || 0;
    if (episodesCount === 0) return;

    // Airing schedule map
    const scheduleMap = new Map();
    if (media.airingSchedule?.nodes) {
      media.airingSchedule.nodes.forEach(node => scheduleMap.set(node.episode, node.airingAt));
    }

    const baseYear = media.startDate?.year || new Date().getFullYear();
    const baseMonth = media.startDate?.month || 1;
    const baseDay = media.startDate?.day || 1;
    const baseStartDate = new Date(baseYear, baseMonth - 1, baseDay);

    // 2. Fetch Simkl ID and episodes for enrichment
    let simklEps = [];
    try {
      const SIMKL_CLIENT_ID = process.env.VITE_SIMKL_CLIENT_ID || "";
      const simklSearchUrl = `https://api.simkl.com/search/id?anilist=${anilistId}&client_id=${SIMKL_CLIENT_ID}`;
      const simklSearchRes = await fetch(simklSearchUrl, { headers: { 'Accept': 'application/json' } });
      if (simklSearchRes.ok) {
        const searchItems = await simklSearchRes.json();
        const simklId = searchItems?.[0]?.ids?.simkl || searchItems?.[0]?.ids?.simkl_id;
        if (simklId) {
          const simklEpisodesUrl = `https://api.simkl.com/anime/episodes/${simklId}?extended=full&client_id=${SIMKL_CLIENT_ID}`;
          const simklEpsRes = await fetch(simklEpisodesUrl, { headers: { 'Accept': 'application/json' } });
          if (simklEpsRes.ok) {
            simklEps = await simklEpsRes.json();
          }
        }
      }
    } catch (e) {
      console.warn(`Simkl search/episodes failed for anilistId ${anilistId}:`, e.message);
    }

    // 3. Get existing episodes to check locks
    const { data: existingEps } = await supabase.from('episodes').select('episode_number, locked_fields, id').eq('anime_id', animeId);
    const existingMap = new Map(existingEps?.map(ep => [ep.episode_number, ep]));

    const upsertPayload = [];
    for (let epNum = 1; epNum <= episodesCount; epNum++) {
      const existing = existingMap.get(epNum);
      const locks = existing?.locked_fields || {};

      let airDateString = null;
      const scheduleEpoch = scheduleMap.get(epNum);
      if (scheduleEpoch) {
        airDateString = new Date(scheduleEpoch * 1000).toISOString();
      } else {
        const approxDate = new Date(baseStartDate.getTime());
        approxDate.setDate(approxDate.getDate() + (epNum - 1) * 7);
        airDateString = approxDate.toISOString();
      }

      // Match Simkl
      const simklMatch = simklEps.find(s => s.episode === epNum);

      let title = `Episode ${epNum}`;
      let description = `Watch episode ${epNum} of ${media.title.english || media.title.userPreferred}.`;
      let thumbnailUrl = media.coverImage?.large || "";
      let thumbnailSource = "anilist";

      if (simklMatch) {
        if (simklMatch.title && !simklMatch.title.toLowerCase().startsWith("episode ")) {
          title = simklMatch.title;
        }
        if (simklMatch.overview) {
          description = simklMatch.overview;
        }
        if (simklMatch.img) {
          thumbnailUrl = simklMatch.img.startsWith("http")
            ? simklMatch.img
            : `https://simkl.in/episodes/${simklMatch.img}_m.jpg`;
          thumbnailSource = "simkl";
        }
      }

      upsertPayload.push({
        ...(existing ? { id: existing.id } : {}),
        anime_id: animeId,
        episode_number: epNum,
        title: locks.title ? undefined : title,
        description: locks.synopsis ? undefined : description,
        thumbnail_url: locks.poster ? undefined : thumbnailUrl,
        duration: media.duration ? `${media.duration} min` : "24 min",
        air_date: airDateString,
        locked_fields: {
          ...locks,
          thumbnail_source: locks.poster ? undefined : thumbnailSource
        }
      });
    }

    // Clean undefined
    const cleanedPayload = upsertPayload.map(p => Object.fromEntries(Object.entries(p).filter(([_, v]) => v !== undefined)));

    const { error: upsertError } = await supabase.from('episodes').upsert(cleanedPayload, { onConflict: 'anime_id, episode_number' });
    if (upsertError) throw upsertError;

    // Update anime episode count
    await supabase.from('anime').update({
      episode_count: cleanedPayload.length,
      last_sync_episodes: new Date().toISOString()
    }).eq('id', animeId);

    console.log(`[Sync] Synced ${cleanedPayload.length} episodes for ${animeTitle}`);
  } catch (err) {
    console.error(`[Sync] Failed syncing episodes for ${animeTitle}:`, err.message);
  }
}
