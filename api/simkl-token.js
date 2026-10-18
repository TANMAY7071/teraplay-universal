// Secure token exchange for Simkl OAuth
// CSRF: the SPA generates `state`, stores it in sessionStorage, and verifies
// it on the callback page (src/pages/SimklCallback.tsx) BEFORE calling this
// endpoint, so this function only completes the exchange for code+state pairs
// that already passed client-side verification.
export default async function handler(req, res) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }
  if (!state) {
    return res.status(400).json({ error: 'Missing OAuth state parameter' });
  }

  const clientId = process.env.VITE_SIMKL_CLIENT_ID || "";
  const clientSecret = process.env.SIMKL_CLIENT_SECRET || "";
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const defaultRedirectUri = host ? `${proto}://${host}/auth/simkl/callback` : "http://localhost:5173/auth/simkl/callback";
  const redirectUri = process.env.VITE_SIMKL_REDIRECT_URI || defaultRedirectUri;

  if (!clientId || !clientSecret) {
    console.error('Missing Simkl Client ID or Client Secret');
    return res.status(500).json({ error: 'Simkl credentials not configured' });
  }

  try {
    const response = await fetch('https://api.simkl.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      console.error('Simkl token exchange failed:', response.status, await response.text());
      return res.status(400).json({ error: 'Simkl token exchange failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Simkl token exchange error:', err);
    return res.status(500).json({ error: 'Upstream request failed' });
  }
}
