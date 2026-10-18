import type { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ success: false, error: 'Method not allowed. Use GET or HEAD.' });
    return;
  }

  const { url, filename, source, ext } = req.query || {};
  const targetUrl = (url as string || '').trim();

  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.status(400).json({ success: false, error: 'Invalid or missing url query parameter.' });
    return;
  }

  const requestedExt = ((ext as string) || '').toLowerCase().replace(/^\./, '');
  const cleanFilename = ((filename as string) || 'media')
    .replace(/[^a-zA-Z0-9_\-\. ]/g, '')
    .trim() || 'media';

  const baseName = cleanFilename.replace(/\.(mp4|mp3|m4a|webm|mkv|jpg|jpeg|png|webp)$/i, '');
  const isImageTarget = targetUrl.includes('.jpg') || targetUrl.includes('dst-jpg') || targetUrl.includes('.png') || requestedExt === 'jpg' || requestedExt === 'jpeg' || requestedExt === 'png';
  const finalExt = requestedExt || (targetUrl.includes('mime=audio') || targetUrl.includes('audio') ? 'mp3' : (isImageTarget ? 'jpg' : 'mp4'));
  const downloadName = `${baseName}.${finalExt}`;

  try {
    const isInstagram = targetUrl.includes('cdninstagram.com') || targetUrl.includes('fbcdn.net') || source === 'instagram';

    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    if (req.headers && req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
    }

    if (isInstagram) {
      upstreamHeaders['Referer'] = 'https://www.instagram.com/';
      upstreamHeaders['Origin'] = 'https://www.instagram.com';
      upstreamHeaders['Sec-Fetch-Dest'] = isImageTarget ? 'image' : 'video';
      upstreamHeaders['Sec-Fetch-Mode'] = 'cors';
      upstreamHeaders['Sec-Fetch-Site'] = 'cross-site';
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: upstreamHeaders,
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      // If direct upstream fails (e.g. expired CDN token), send redirect to original target
      res.writeHead(302, { Location: targetUrl });
      res.end();
      return;
    }

    if (upstreamResponse.status === 206) {
      res.statusCode = 206;
      const contentRange = upstreamResponse.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }
    }

    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      mp4: 'video/mp4',
      webm: 'video/webm',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const contentType = mimeMap[finalExt] || upstreamResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = upstreamResponse.headers.get('content-length');

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    if (upstreamResponse.body) {
      // Pipe web stream to Node response stream
      // @ts-ignore
      const nodeStream = Readable.fromWeb(upstreamResponse.body);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('[StreamDownload] Proxy error:', err?.message);
    // Graceful fallback: Redirect to targetUrl so browser handles it directly
    try {
      res.writeHead(302, { Location: targetUrl });
      res.end();
    } catch {
      res.status(500).json({ success: false, error: 'Failed to stream video download' });
    }
  }
}
