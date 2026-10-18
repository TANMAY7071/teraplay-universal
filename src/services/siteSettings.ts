import { supabase } from "@/lib/supabase";

export interface SiteSettings {
  site_name: string;
  tagline: string;
}

// Used whenever the DB is unreachable or the row is missing â€” the brand
// never renders as an empty string.
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: "TeraPlay",
  tagline: "TeraBox Online Player & Downloader",
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("site_name, tagline")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;
    if (data?.site_name) {
      return {
        site_name: data.site_name,
        tagline: data.tagline || DEFAULT_SITE_SETTINGS.tagline,
      };
    }
  } catch (err) {
    console.warn("fetchSiteSettings failed, using defaults:", err);
  }
  return DEFAULT_SITE_SETTINGS;
}

export async function saveSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const payload = {
    id: 1,
    site_name: settings.site_name?.trim() || DEFAULT_SITE_SETTINGS.site_name,
    tagline: settings.tagline?.trim() || DEFAULT_SITE_SETTINGS.tagline,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("site_settings")
    .upsert(payload)
    .select("site_name, tagline")
    .single();

  if (error) throw error;
  return data as SiteSettings;
}

