/**
 * Site-wide constants that aren't worth a database round-trip.
 * CHANGE ME: replace the placeholder email with the address you actually
 * monitor — it is published on the Contact, DMCA, and Privacy pages.
 */
export const CONTACT_EMAIL = "support@teraplay.app";
export const DMCA_EMAIL = "dmca@teraplay.app";
export const PRIVACY_EMAIL = "privacy@teraplay.app";

/**
 * Canonical public origin. Canonical links, og:url and the sitemap all read
 * this, so the site stops advertising three different hosts.
 * CHANGE ME: point this at the domain you actually serve from.
 */
export const SITE_URL = "https://teraplay.app";

/**
 * Build a canonical URL for a route path. Query strings and hashes are dropped
 * so a campaign URL and the clean URL are one page.
 */
export function canonicalUrl(pathname: string): string {
  const path = pathname.toLowerCase().replace(/\/+$/, "");
  return path ? `${SITE_URL}${path}` : `${SITE_URL}/`;
}

/**
 * Brand hero copy. Every route renders the same headline and lead line so the
 * dock reads as one product no matter which landing page a visitor lands on.
 * Per-route keywords stay in the document title, meta tags, and FAQ copy.
 */
export const HERO_HEADLINE_LINE_1 = "Your links.";
export const HERO_HEADLINE_LINE_2 = "Your downloads.";
export const HERO_SUBHEADLINE = "Watch or download videos from your favorite platforms.";
