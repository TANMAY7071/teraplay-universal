// Deno edge function: imports remote https modules and is not covered by
// the project's tsconfig, so file-wide type checking is intentionally off.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DONGHUA_API_BASE = "https://www.sankavollerei.web.id/anime/donghua";
const DONGHUB_API_BASE = "https://www.sankavollerei.web.id/anime/donghub";
const ANILIST_API_URL = "https://graphql.anilist.co";

// The public anon key is a valid project JWT, so platform verify_jwt alone
// lets anyone invoke this function. Require the caller to present a
// service-role JWT (as the pg_cron jobs already do).
function isServiceRoleRequest(req: any): boolean {
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

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!isServiceRoleRequest(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );
  }

  try {
    // 1. Initialize Supabase Client with Service Role Key for Admin Privileges
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, manual } = await req.json().catch(() => ({ type: 'Full Library', manual: false }));
    console.log(`Starting ${type} Sync Job... (Manual: ${manual})`);

    // In a real production edge function, we would:
    // 1. Fetch all anime: const { data: animes } = await supabase.from('anime').select('*');
    // 2. Loop through them in batches.
    // 3. For 'Metadata' sync -> fetchAniListMetadata() and update DB.
    // 4. For 'Episodes' sync -> fetchDonghuaDetails() and update episodes.
    // 5. For 'Streams' sync -> fetchDonghubEpisodeStreams() and update streams JSON.

    // -------------------------------------------------------------
    // Example: Automatic 6-hour Ongoing Series Check
    // -------------------------------------------------------------
    if (type === '6_HOUR_CRON' || type === 'Episodes') {
      const { data: ongoingAnime } = await supabase
        .from('anime')
        .select('id, title, donghua_api_slug')
        .eq('status', 'Ongoing');

      if (ongoingAnime) {
        for (const anime of ongoingAnime) {
          if (!anime.donghua_api_slug) continue;

          console.log(`Checking episodes for: ${anime.title}`);
          const res = await fetch(`${DONGHUA_API_BASE}/detail/${anime.donghua_api_slug}`);
          if (!res.ok) continue;
          
          const details = await res.json();
          const episodes = details.episodes_list || [];
          if (episodes.length === 0) continue;

          // Process new episodes...
          const upsertPayload = episodes.map((ep: any) => {
            const match = ep.slug?.match(/episode-(\d+)/) || ep.episode?.match(/\d+/);
            const epNum = match ? parseInt(match[1] || match[0], 10) : 1;
            return {
              anime_id: anime.id,
              episode_number: epNum,
              title: ep.episode || `Episode ${epNum}`,
              donghua_api_slug: ep.slug
            };
          });

          await supabase.from('episodes').upsert(upsertPayload, { onConflict: 'anime_id, episode_number' });
          await supabase.from('anime').update({ 
            last_sync_episodes: new Date().toISOString(),
            episode_count: upsertPayload.length
          }).eq('id', anime.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Sync job '${type}' completed successfully.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: 'Sync failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
