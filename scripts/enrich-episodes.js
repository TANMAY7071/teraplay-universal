import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwgvezljjaceoiybhklh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const ANILIST_QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    trailer {
      id
      site
    }
    streamingEpisodes {
      title
      thumbnail
    }
  }
}
`;

async function main() {
  console.log('🚀 Starting anime enrichment process...');

  // Fetch all anime
  const { data: animes, error } = await supabase
    .from('anime')
    .select('id, title, original_title');

  if (error) {
    console.error('❌ Error fetching anime from Supabase:', error);
    return;
  }

  console.log(`📦 Found ${animes.length} anime records to process.`);

  for (const anime of animes) {
    const searchQuery = anime.original_title || anime.title;
    
    if (!searchQuery) {
      console.log(`⚠️ Skipping anime ID ${anime.id} due to missing title.`);
      continue;
    }

    console.log(`\n⏳ Fetching AniList data for: "${searchQuery}"`);
    
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: ANILIST_QUERY,
          variables: { search: searchQuery }
        })
      });

      if (response.status === 429) {
        console.warn('⚠️ Rate limit hit. Waiting 10 seconds...');
        await sleep(10000);
        // We will skip this one and let it retry next time, or we could implement a retry loop.
        // For simplicity, we continue after sleeping.
        continue; 
      }

      const json = await response.json();
      
      if (json.errors) {
        console.error(`❌ AniList GraphQL Error for "${searchQuery}":`, json.errors[0].message);
      } else if (json.data && json.data.Media) {
        const media = json.data.Media;
        
        // 1. Update Trailer
        if (media.trailer && media.trailer.site === 'youtube') {
          const trailerUrl = `https://www.youtube.com/embed/${media.trailer.id}`;
          console.log(`🎥 Updating trailer URL: ${trailerUrl}`);
          
          const { error: updateError } = await supabase
            .from('anime')
            .update({ trailer_url: trailerUrl })
            .eq('id', anime.id);
            
          if (updateError) {
            console.error('❌ Error updating trailer:', updateError);
          }
        }

        // 2. Insert/Update Episodes
        if (media.streamingEpisodes && media.streamingEpisodes.length > 0) {
          console.log(`📺 Found ${media.streamingEpisodes.length} streaming episodes. Processing...`);
          
          for (const ep of media.streamingEpisodes) {
            // e.g. "Episode 1 - The Beginning" -> 1
            const match = ep.title.match(/Episode\s+(\d+(?:\.\d+)?)/i);
            const epNum = match ? parseFloat(match[1]) : null;
            
            if (epNum === null) {
              console.log(`⚠️ Could not parse episode number from: "${ep.title}". Skipping.`);
              continue;
            }

            // Check if episode already exists
            const { data: existingEp } = await supabase
              .from('episodes')
              .select('id')
              .eq('anime_id', anime.id)
              .eq('episode_number', epNum)
              .single();

            if (existingEp) {
              // Update
              await supabase
                .from('episodes')
                .update({ title: ep.title, thumbnail_url: ep.thumbnail })
                .eq('id', existingEp.id);
            } else {
              // Insert
              await supabase
                .from('episodes')
                .insert({
                  anime_id: anime.id,
                  episode_number: epNum,
                  title: ep.title,
                  thumbnail_url: ep.thumbnail
                });
            }
          }
          console.log(`✅ Episodes updated for "${searchQuery}".`);
        } else {
          console.log(`ℹ️ No streaming episodes found for "${searchQuery}".`);
        }
      } else {
        console.log(`❓ No Media found on AniList for "${searchQuery}".`);
      }
    } catch (err) {
      console.error(`❌ Fetch error for "${searchQuery}":`, err.message);
    }

    // Rate limiting delay
    await sleep(2000);
  }

  console.log('\n🎉 Enrichment process completed!');
}

main().catch(console.error);
