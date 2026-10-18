// Supabase Edge Function: sync-episodes
// Recurring background cron job to synchronize new episodes for active published Donghua

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DONGHUA_API_BASE = "https://www.sankavollerei.web.id/anime/donghua";

// The public anon key is a valid project JWT, so platform verify_jwt alone
// lets anyone invoke this function. Require the caller to present a
// service-role JWT (as the pg_cron jobs already do).
function isServiceRoleRequest(req: Request): boolean {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token.split(".").length !== 3) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!isServiceRoleRequest(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch only published Donghua with active slugs
    const { data: publishedDonghuas, error: fetchErr } = await supabase
      .from('anime')
      .select('id, title, slug, donghua_api_slug, episode_count')
      .or('visibility.eq.published,visibility.is.null')
      .not('donghua_api_slug', 'is', null);

    if (fetchErr) throw fetchErr;

    const summary = [];

    for (const anime of (publishedDonghuas || [])) {
      try {
        const slug = anime.donghua_api_slug;
        const res = await fetch(`${DONGHUA_API_BASE}/detail/${slug}`);
        if (!res.ok) continue;

        const details = await res.json();
        const incomingEpisodes = details.episodes_list || [];
        if (incomingEpisodes.length === 0) continue;

        // Fetch existing episodes for this anime
        const { data: existingEpisodes } = await supabase
          .from('episodes')
          .select('episode_number, id')
          .eq('anime_id', anime.id);

        const existingSet = new Set(existingEpisodes?.map(e => e.episode_number) || []);
        const newEpisodesToInsert = [];

        for (const ep of incomingEpisodes) {
          const match = ep.slug?.match(/episode-(\d+)/) || ep.episode?.match(/\d+/);
          const epNum = match ? parseInt(match[1] || match[0], 10) : 1;

          if (!existingSet.has(epNum)) {
            newEpisodesToInsert.push({
              anime_id: anime.id,
              episode_number: epNum,
              title: ep.episode || `Episode ${epNum}`,
              donghua_api_slug: ep.slug,
              created_at: new Date().toISOString()
            });
          }
        }

        if (newEpisodesToInsert.length > 0) {
          await supabase.from('episodes').insert(newEpisodesToInsert);
        }

        // Update last_sync_episodes timestamp & total count
        await supabase
          .from('anime')
          .update({
            last_sync_episodes: new Date().toISOString(),
            episode_count: Math.max(anime.episode_count || 0, incomingEpisodes.length)
          })
          .eq('id', anime.id);

        summary.push({
          id: anime.id,
          title: anime.title,
          newEpisodes: newEpisodesToInsert.length
        });
      } catch (err) {
        console.warn(`Sync failed for anime ID ${anime.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, count: summary.length, results: summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    console.error('sync-episodes failed:', err);
    return new Response(JSON.stringify({ error: 'Sync failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
