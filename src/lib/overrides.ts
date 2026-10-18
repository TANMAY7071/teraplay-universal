export interface BrandingOverrides {
  logo?: string;
  logoDisplayMode?: 'desktop_only' | 'both' | 'none';
  poster?: string;
  banner?: string;
  verifiedEpisodeThumbnails?: Record<number, string>;
  verifiedEpisodeTitles?: Record<number, string>;
}

const OVERRIDES_KEY = "donghuastream_branding_overrides";

// Retrieve all overrides
export const getAllOverrides = (): Record<string, Record<string, BrandingOverrides>> => {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Failed to load overrides from localStorage", error);
    return {};
  }
};

// Get overrides for a specific universe and optionally a specific installment
export const getBrandingOverrides = (
  universeSlug: string,
  installmentId?: string | number
): BrandingOverrides => {
  const all = getAllOverrides();
  let universeData = all[universeSlug] || {};
  
  // Fallback to base series slug if season variant slug passed (e.g., "the-great-ruler-season-2" -> "the-great-ruler")
  if (!universeData["default"] && universeSlug.includes("-season-")) {
    const baseSlug = universeSlug.split("-season-")[0];
    if (all[baseSlug]) {
      universeData = all[baseSlug];
    }
  }
  
  const overrides: BrandingOverrides = {};
  
  // Base universe overrides (like logo or default banner)
  if (universeData["default"]) {
    if (universeData["default"].logo) overrides.logo = universeData["default"].logo;
    if (universeData["default"].logoDisplayMode) overrides.logoDisplayMode = universeData["default"].logoDisplayMode;
    if (universeData["default"].banner) overrides.banner = universeData["default"].banner;
    if (universeData["default"].poster) overrides.poster = universeData["default"].poster;
    if (universeData["default"].verifiedEpisodeThumbnails) overrides.verifiedEpisodeThumbnails = universeData["default"].verifiedEpisodeThumbnails;
    if (universeData["default"].verifiedEpisodeTitles) overrides.verifiedEpisodeTitles = universeData["default"].verifiedEpisodeTitles;
  }
  
  // Specific installment overrides
  if (installmentId && universeData[String(installmentId)]) {
    const instData = universeData[String(installmentId)];
    if (instData.logo) overrides.logo = instData.logo;
    if (instData.logoDisplayMode) overrides.logoDisplayMode = instData.logoDisplayMode;
    if (instData.banner) overrides.banner = instData.banner;
    if (instData.poster) overrides.poster = instData.poster;
    if (instData.verifiedEpisodeThumbnails) overrides.verifiedEpisodeThumbnails = {
      ...(overrides.verifiedEpisodeThumbnails || {}),
      ...instData.verifiedEpisodeThumbnails
    };
    if (instData.verifiedEpisodeTitles) overrides.verifiedEpisodeTitles = {
      ...(overrides.verifiedEpisodeTitles || {}),
      ...instData.verifiedEpisodeTitles
    };
  }
  
  return overrides;
};

// Save overrides for a universe/installment
export const saveBrandingOverrides = (
  universeSlug: string,
  installmentId: string | number | "default",
  overrides: BrandingOverrides
): void => {
  try {
    const all = getAllOverrides();
    if (!all[universeSlug]) {
      all[universeSlug] = {};
    }
    
    all[universeSlug][String(installmentId)] = {
      ...all[universeSlug][String(installmentId)],
      ...overrides
    };
    
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("branding_overrides_updated", {
        detail: { universeSlug, installmentId }
      }));
    }
  } catch (error) {
    console.error("Failed to save overrides to localStorage", error);
  }
};
