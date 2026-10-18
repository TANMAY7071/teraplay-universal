import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwgvezljjaceoiybhklh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_KEY) {
  console.error("❌ SUPABASE_SERVICE_KEY environment variable is required.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseSeasonInfo(title) {
  // Regex to match common season patterns like "Season 2", "S2", "2nd Season", "Part 2"
  const seasonMatch = title.match(/(?:Season\s*(\d+)|S(\d+)|(\d+)(?:st|nd|rd|th)\s*Season|Part\s*(\d+))/i);
  
  if (seasonMatch) {
    const seasonOrder = parseInt(seasonMatch[1] || seasonMatch[2] || seasonMatch[3] || seasonMatch[4], 10);
    const baseTitle = title.replace(seasonMatch[0], '').trim().replace(/[-:]\s*$/, '').trim();
    return { baseTitle, seasonOrder };
  }
  
  return { baseTitle: title, seasonOrder: 1 };
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

async function main() {
  console.log("🚀 Starting Series Group Clustering...");
  
  const { data: animes, error } = await supabase.from('anime').select('id, title');
  
  if (error) {
    console.error("❌ Failed to fetch anime:", error);
    return;
  }
  
  console.log(`📦 Found ${animes.length} anime entries.`);
  
  const seriesGroups = {};
  
  // Parse and group
  for (const anime of animes) {
    const { baseTitle, seasonOrder } = parseSeasonInfo(anime.title);
    const groupSlug = slugify(baseTitle);
    
    if (!seriesGroups[groupSlug]) {
      seriesGroups[groupSlug] = [];
    }
    
    seriesGroups[groupSlug].push({
      id: anime.id,
      title: anime.title,
      seasonOrder
    });
  }
  
  // Update database
  for (const [groupSlug, items] of Object.entries(seriesGroups)) {
    // Sort by season order
    items.sort((a, b) => a.seasonOrder - b.seasonOrder);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isCurrent = i === items.length - 1; // Highest season order is current
      
      console.log(`Updating ${item.title} -> Group: ${groupSlug} | Order: ${item.seasonOrder} | Current: ${isCurrent}`);
      
      const { error: updateError } = await supabase
        .from('anime')
        .update({
          series_group: groupSlug,
          season_order: item.seasonOrder,
          is_current_season: isCurrent
        })
        .eq('id', item.id);
        
      if (updateError) {
        console.error(`❌ Failed to update ${item.title}:`, updateError);
      }
    }
  }
  
  console.log("✅ Clustering complete.");
}

main();
