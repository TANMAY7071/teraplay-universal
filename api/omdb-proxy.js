// Secure proxy handler for OMDb API requests to prevent API key exposure
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { s, i, plot } = req.query || {};
  const apiKey = process.env.OMDB_API_KEY;

  if (!apiKey) {
    console.error('OMDB_API_KEY is not configured');
    return res.status(500).json({ error: 'OMDb key not configured' });
  }

  // Construct target URL parameters
  const params = new URLSearchParams();
  params.append("apikey", apiKey);
  if (s) params.append("s", s);
  if (i) params.append("i", i);
  if (plot) params.append("plot", plot);

  try {
    const response = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'OMDb request failed' });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('OMDb proxy error:', err);
    return res.status(500).json({ error: 'Upstream request failed' });
  }
}
