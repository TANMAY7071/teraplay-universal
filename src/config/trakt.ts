/**
 * Trakt API Configuration
 * 
 * Feature flag to toggle between default (Supabase/local) and Trakt metadata providers.
 * Set VITE_METADATA_PROVIDER to "trakt" in .env to enable the Trakt integration.
 * Set it to "default" (or leave empty) to use the existing Supabase + local data.
 */

// Trakt API credentials
// NOTE: the client secret is intentionally NOT read here. Vite inlines every
// VITE_* var into the public bundle; the secret belongs in server-side env
// vars only (handle any token exchange in an api/ serverless function).
export const TRAKT_CLIENT_ID = import.meta.env.VITE_TRAKT_CLIENT_ID || "";

// API settings
export const TRAKT_API_URL = "https://api.trakt.tv";
export const TRAKT_API_VERSION = "2";

// Feature flag: "default" | "trakt"
export const METADATA_PROVIDER: "default" | "trakt" =
  (import.meta.env.VITE_METADATA_PROVIDER as "default" | "trakt") || "default";

/**
 * Returns true when the Trakt metadata provider is active.
 * Can also be overridden at runtime via localStorage for dev testing.
 */
export function isTraktEnabled(): boolean {
  // Allow runtime override from localStorage (for the dev eval panel)
  try {
    const override = localStorage.getItem("donghua-metadata-provider");
    if (override === "trakt") return true;
    if (override === "default") return false;
  } catch {
    // localStorage not available
  }
  return METADATA_PROVIDER === "trakt";
}

/**
 * Returns true when Trakt credentials are configured.
 */
export function hasTraktCredentials(): boolean {
  return !!TRAKT_CLIENT_ID && TRAKT_CLIENT_ID.length > 10;
}
