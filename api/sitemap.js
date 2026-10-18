// Dynamic sitemap generator: core routes + every anime slug from Supabase.
// Served at /sitemap.xml via the vercel.json rewrite. Stays current with
// the catalog automatically — no redeploy needed when content changes.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
// CHANGE ME: set SITE_URL in Vercel env vars once your domain is attached.
const SITE_URL = (process.env.SITE_URL || "https://donghuastream.vercel.app").replace(/\/$/, "");

const STATIC_PATHS = [
  "/",
  "/explore",
  "/calendar",
  "/search",
  "/community",
  "/dmca",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/contact",
];

function escapeXml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");

  let urls = STATIC_PATHS.map(
    (p) => `<url><loc>${escapeXml(SITE_URL + p)}</loc></url>`
  ).join("");

  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/anime?select=slug,updated_at&order=updated_at.desc&limit=5000`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (response.ok) {
        const rows = await response.json();
        urls += (rows || [])
          .filter((r) => r.slug)
          .map(
            (r) =>
              `<url><loc>${escapeXml(`${SITE_URL}/anime/${r.slug}`)}</loc>${
                r.updated_at ? `<lastmod>${escapeXml(r.updated_at)}</lastmod>` : ""
              }</url>`
          )
          .join("");
      } else {
        console.error("sitemap: anime fetch failed", response.status);
      }
    } else {
      console.error("sitemap: Supabase env vars not configured, emitting static paths only");
    }
  } catch (err) {
    console.error("sitemap: anime fetch error", err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return res.status(200).send(xml);
}
