import { supabase } from "@/lib/supabase";

export interface MediaOverride {
  id?: number;
  category: string;
  entity_id: string;
  card_image?: string | null;
  hero_images?: string[];
  overview_image?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetches all overrides for a given category and returns a dictionary indexed by entity_id.
 */
export async function fetchMediaOverrides(category: string): Promise<Record<string, MediaOverride>> {
  try {
    const { data, error } = await supabase
      .from("media_overrides")
      .select("*")
      .eq("category", category);

    if (error) {
      console.error(`[MediaOverrides] Failed to fetch overrides for ${category}:`, error);
      return {};
    }

    const overridesMap: Record<string, MediaOverride> = {};
    if (data) {
      data.forEach((row: any) => {
        overridesMap[row.entity_id] = {
          id: row.id,
          category: row.category,
          entity_id: row.entity_id,
          card_image: row.card_image,
          hero_images: row.hero_images || [],
          overview_image: row.overview_image,
        };
      });
    }
    return overridesMap;
  } catch (err) {
    console.error("[MediaOverrides] Error in fetchMediaOverrides:", err);
    return {};
  }
}

/**
 * Fetches a single override record for category + entity_id.
 */
export async function fetchMediaOverride(
  category: string,
  entityId: string
): Promise<MediaOverride | null> {
  try {
    const { data, error } = await supabase
      .from("media_overrides")
      .select("*")
      .eq("category", category)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (error) {
      console.error(`[MediaOverrides] Failed to fetch override for ${category}/${entityId}:`, error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("[MediaOverrides] Error in fetchMediaOverride:", err);
    return null;
  }
}

/**
 * Saves (inserts or updates) a media override record in Supabase.
 */
export async function saveMediaOverride(override: MediaOverride): Promise<MediaOverride | null> {
  try {
    const payload = {
      category: override.category,
      entity_id: override.entity_id,
      card_image: override.card_image,
      hero_images: override.hero_images || [],
      overview_image: override.overview_image,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("media_overrides")
      .upsert(payload, { onConflict: "category,entity_id" })
      .select()
      .single();

    if (error) {
      console.error("[MediaOverrides] Failed to save override:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("[MediaOverrides] Error in saveMediaOverride:", err);
    return null;
  }
}
