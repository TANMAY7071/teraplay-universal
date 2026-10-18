import { useQuery } from "@tanstack/react-query";
import { fetchSiteSettings, DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/services/siteSettings";

/**
 * Site-wide branding (site name, tagline) from the admin-editable
 * site_settings table. Falls back to defaults while loading or on error,
 * so the brand never flashes empty.
 */
export function useSiteSettings(): SiteSettings {
  const { data } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
  });
  return data ?? DEFAULT_SITE_SETTINGS;
}
