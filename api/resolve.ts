import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TranscriptItem {
  start: number;
  duration: number;
  text: string;
}

interface TranscriptData {
  language: string;
  items: TranscriptItem[];
  count: number;
}

interface ResolveResponse {
  success: boolean;
  title?: string;
  thumbnail?: string;
  text_content?: string;
  embed_url?: string;
  thumbnails?: Array<{
    url: string;
    width?: number;
    height?: number;
    resolution?: string;
    quality_label?: string;
  }>;
  m3u8_url?: string;
  fast_download_url?: string;
  size?: string;
  duration?: number;
  shareId?: string;
  serverTime?: string;
  source?: string;
  platform?:
    | 'terabox'
    | 'youtube'
    | 'direct'
    | 'instagram'
    | 'facebook'
    | 'whatsapp'
    | 'tiktok'
    | 'bilibili'
    | 'dailymotion'
    | 'snapchat'
    | 'linkedin'
    | 'twitch'
    | 'twitter'
    | 'vimeo'
    | 'universal';
  youtube_id?: string;
  transcript?: TranscriptData | null;
  formats?: Array<{
    format_id: string;
    quality: string;
    height?: number;
    ext: string;
    filesize?: string;
    url: string;
    download_url?: string;
    audio_url?: string;
    can_mux?: boolean;
    has_audio: boolean;
    has_video: boolean;
    is_audio_only?: boolean;
    is_progressive?: boolean;
  }>;
  video_formats?: Array<any>;
  audio_formats?: Array<any>;
  media_type?: 'video' | 'carousel' | 'image';
  is_vertical?: boolean;
  aspect_ratio?: string;
  is_mock?: boolean;
  error?: string;
}

function extractShareId(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();

  // Pattern 1: /s/1[a-zA-Z0-9_-]+
  const slashMatch = clean.match(/\/s\/(?:1)?([a-zA-Z0-9_-]+)/i);
  if (slashMatch && slashMatch[1]) return slashMatch[1];

  // Pattern 2: ?surl=[a-zA-Z0-9_-]+
  const surlMatch = clean.match(/[?&]surl=([a-zA-Z0-9_-]+)/i);
  if (surlMatch && surlMatch[1]) return surlMatch[1];

  // Pattern 3: direct ID
  if (/^[a-zA-Z0-9_-]{10,40}$/.test(clean)) return clean;

  return null;
}

function extractUrlFromText(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/https?:\/\/[^\s"'<>()[\]【】]+/i);
  return match ? match[0] : trimmed;
}


// In-memory cache for resolved media links (TTL 1 hour)
interface CacheItem {
  data: ResolveResponse;
  expiresAt: number;
}
const MEDIA_CACHE = new Map<string, CacheItem>();
const CACHE_TTL_MS = 2 * 60 * 1000;
const MEDIA_CACHE_MAX_ENTRIES = 200;

/**
 * Store a resolve result.
 *
 * The key is the caller-supplied URL, so the map needs a size cap and
 * expired-entry eviction. Without them a warm instance grows until the
 * platform recycles it.
 */
function cacheSet(key: string, data: ResolveResponse): void {
  const now = Date.now();
  if (MEDIA_CACHE.size >= MEDIA_CACHE_MAX_ENTRIES) {
    for (const [k, v] of MEDIA_CACHE) {
      if (v.expiresAt <= now) MEDIA_CACHE.delete(k);
    }
    while (MEDIA_CACHE.size >= MEDIA_CACHE_MAX_ENTRIES) {
      const oldest = MEDIA_CACHE.keys().next();
      if (oldest.done) break;
      MEDIA_CACHE.delete(oldest.value);
    }
  }
  MEDIA_CACHE.set(key, { data, expiresAt: now + CACHE_TTL_MS });
}

function runLocalExtractor(targetUrl: string): Promise<ResolveResponse | null> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const venvPython = isWin
      ? path.resolve(process.cwd(), '.venv', 'Scripts', 'python.exe')
      : path.resolve(process.cwd(), '.venv', 'bin', 'python');
    const fallbackPython = isWin ? 'python' : 'python3';
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'extractor.py');

    const pythonBin = fs.existsSync(venvPython) ? venvPython : fallbackPython;

    // 45s ceiling: the TeraBox path can spend 10s on the share page, 10s on
    // share/list, then retry the legacy gateway. A 20s kill returned no result
    // and the request fell through to the demo fallback.
    execFile(pythonBin, [scriptPath, targetUrl], { timeout: 45000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (!stdout) {
        console.warn('[LocalExtractor] Exec notice:', error?.message || stderr);
        resolve(null);
        return;
      }
      // The extractor prints its JSON result and exits non-zero on failure.
      // That JSON carries the honest error message, so keep it.
      if (error) {
        console.warn('[LocalExtractor] Exit notice:', error.message);
      }
      try {
        const rawStdout = stdout.trim();
        const firstBrace = rawStdout.indexOf('{');
        const lastBrace = rawStdout.lastIndexOf('}');
        const jsonStr = (firstBrace !== -1 && lastBrace !== -1)
          ? rawStdout.slice(firstBrace, lastBrace + 1)
          : rawStdout;
        const parsed = JSON.parse(jsonStr);
        if (parsed.success === false) {
          resolve({
            success: false,
            error: parsed.error || 'Video is unavailable or restricted on host platform',
          });
          return;
        }

        if (parsed.success && parsed.text_content) {
          // Document results (Wattpad stories): the text is delivered to the
          // browser and turned into a file client-side, so no stream URL exists.
          resolve({
            success: true,
            title: parsed.title,
            thumbnail: parsed.thumbnail || '',
            text_content: parsed.text_content,
            size: parsed.size || 'Text',
            duration: 0,
            shareId: 'text',
            serverTime: new Date().toISOString(),
            source: parsed.source || 'wattpad_api',
            platform: parsed.platform || 'wattpad',
            is_mock: false,
          });
          return;
        }

        if (parsed.success && (parsed.stream_url || parsed.download_url)) {
          const directMedia = parsed.stream_url || parsed.download_url;
          const cleanTitle = (parsed.title || 'video').replace(/[^a-zA-Z0-9_-]/g, '_');
          // When the extractor already returns a proxied (relative) URL â€” e.g. the audio-mux
          // player stream â€” use it as-is; nesting a relative path inside another proxy's
          // `url=` param would break server-side fetching.
          const downloadProxy = directMedia.startsWith('/api/')
            ? directMedia
            : `/api/stream-download?url=${encodeURIComponent(directMedia)}&filename=${encodeURIComponent(cleanTitle)}&source=${encodeURIComponent(parsed.source || '')}`;

          const mapFormat = (f: any) => {
            const ytId = parsed.youtube_id || '';
            const fileSuffix = ytId ? `${cleanTitle}_${ytId}_${f.format_id}` : `${cleanTitle}_${f.format_id}`;
            const ytParam = ytId ? `&v=${encodeURIComponent(ytId)}` : '';
            return {
              ...f,
              // The extractor can hand back an already-proxied link (TeraBox
              // dlinks). Re-wrapping it nests one proxy inside another and the
              // endpoint rejects the relative url.
              download_url: f.download_url && f.download_url.startsWith('/api/stream-download')
                ? f.download_url
                : f.url
                ? `/api/stream-download?url=${encodeURIComponent(f.url)}${f.audio_url ? `&audio_url=${encodeURIComponent(f.audio_url)}` : ''}&filename=${encodeURIComponent(fileSuffix)}&ext=${encodeURIComponent(f.ext || (f.is_audio_only ? 'mp3' : 'mp4'))}&source=${encodeURIComponent(parsed.source || '')}${ytParam}`
                : f.download_url || '',
            };
          };

          const mappedFormats = Array.isArray(parsed.formats) ? parsed.formats.map(mapFormat) : [];
          const mappedVideoFormats = Array.isArray(parsed.video_formats) ? parsed.video_formats.map(mapFormat) : [];
          const mappedAudioFormats = Array.isArray(parsed.audio_formats) ? parsed.audio_formats.map(mapFormat) : [];

          resolve({
            success: true,
            title: parsed.title,
            thumbnail: parsed.thumbnail || '',
            thumbnails: Array.isArray(parsed.thumbnails) ? parsed.thumbnails : [],
            m3u8_url: directMedia,
            fast_download_url: downloadProxy,
            size: parsed.size || 'HD Quality',
            duration: parsed.duration || 0,
            shareId: parsed.shareId || 'stream',
            serverTime: new Date().toISOString(),
            source: parsed.source || 'local_extractor',
            platform: parsed.platform || (parsed.youtube_id ? 'youtube' : 'universal'),
            youtube_id: parsed.youtube_id,
            embed_url: parsed.embed_url || (parsed.platform === 'terabox' && parsed.stream_url?.includes('embed') ? parsed.stream_url : undefined),
            transcript: parsed.transcript || null,
            formats: mappedFormats,
            video_formats: mappedVideoFormats,
            audio_formats: mappedAudioFormats,
            media_type: parsed.media_type || (parsed.formats?.some((f: any) => f.ext === 'jpg') ? 'carousel' : 'video'),
            is_vertical: Boolean(parsed.is_vertical),
            aspect_ratio: parsed.aspect_ratio || undefined,
            is_mock: false,
          });
          return;
        }
      } catch (err) {
        console.warn('[LocalExtractor] JSON parse notice:', err);
      }
      resolve(null);
    });
  });
}

async function runRemoteResolver(targetUrl: string): Promise<ResolveResponse | null> {
  const remoteEndpoint = process.env.PYTHON_RESOLVER_URL || process.env.RESOLVER_SERVICE_URL;
  if (!remoteEndpoint) return null;

  try {
    const base = remoteEndpoint.replace(/\/$/, '');
    const res = await fetch(`${base}/resolve?url=${encodeURIComponent(targetUrl)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[RemoteResolver] Service returned HTTP ${res.status}`);
      return null;
    }

    const parsed = (await res.json()) as any;
    if (!parsed) return null;

    if (parsed.success === false) {
      return {
        success: false,
        error: parsed.error || 'Video is unavailable or restricted on host platform',
      };
    }

    if (parsed.success && (parsed.stream_url || parsed.download_url)) {
      const directMedia = parsed.stream_url || parsed.download_url;
      const cleanTitle = (parsed.title || 'video').replace(/[^a-zA-Z0-9_-]/g, '_');
      const downloadProxy = directMedia.startsWith('/api/')
        ? directMedia
        : `/api/stream-download?url=${encodeURIComponent(directMedia)}&filename=${encodeURIComponent(cleanTitle)}&source=${encodeURIComponent(parsed.source || '')}`;

      const mapFormat = (f: any) => ({
        ...f,
        // Already-proxied links (TeraBox dlinks) pass through untouched.
        download_url: f.download_url && f.download_url.startsWith('/api/stream-download')
          ? f.download_url
          : f.url
          ? `/api/stream-download?url=${encodeURIComponent(f.url)}${f.audio_url ? `&audio_url=${encodeURIComponent(f.audio_url)}` : ''}&filename=${encodeURIComponent(`${cleanTitle}_${f.format_id}`)}&ext=${encodeURIComponent(f.ext || (f.is_audio_only ? 'mp3' : 'mp4'))}&source=${encodeURIComponent(parsed.source || '')}`
          : f.download_url || '',
      });

      const mappedFormats = Array.isArray(parsed.formats) ? parsed.formats.map(mapFormat) : [];
      const mappedVideoFormats = Array.isArray(parsed.video_formats) ? parsed.video_formats.map(mapFormat) : [];
      const mappedAudioFormats = Array.isArray(parsed.audio_formats) ? parsed.audio_formats.map(mapFormat) : [];

      return {
        success: true,
        title: parsed.title,
        thumbnail: parsed.thumbnail || '',
        thumbnails: Array.isArray(parsed.thumbnails) ? parsed.thumbnails : [],
        m3u8_url: directMedia,
        fast_download_url: downloadProxy,
        size: parsed.size || 'HD Quality',
        duration: parsed.duration || 0,
        shareId: parsed.shareId || 'stream',
        serverTime: new Date().toISOString(),
        source: parsed.source || 'remote_microservice',
        platform: parsed.platform || (parsed.youtube_id ? 'youtube' : 'universal'),
        youtube_id: parsed.youtube_id,
        transcript: parsed.transcript || null,
        formats: mappedFormats,
        video_formats: mappedVideoFormats,
        audio_formats: mappedAudioFormats,
        media_type: parsed.media_type,
        is_vertical: Boolean(parsed.is_vertical),
        aspect_ratio: parsed.aspect_ratio || undefined,
        is_mock: false,
      };
    }
  } catch (err: any) {
    console.warn('[RemoteResolver] Fetch failed:', err?.message || err);
  }
  return null;
}

function extractInstagramShortcode(input: string): string | null {
  const match = input.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv|stories)\/([A-Za-z0-9_-]+)/i);
  return match ? match[2] : null;
}

async function extractInstagramEmbed(shortcode: string): Promise<Partial<ResolveResponse> | null> {
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.ok) {
      const html = await response.text();
      const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/) || html.match(/video_url\s*:\s*'([^']+)'/);
      const thumbMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/) || html.match(/"thumbnail_src"\s*:\s*"([^"]+)"/);
      const titleMatch = html.match(/<div class="Caption">([\s\S]*?)<\/div>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);

      if (videoMatch && videoMatch[1]) {
        const cleanVideoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
        const cleanThumb = thumbMatch && thumbMatch[1] ? thumbMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '') : '';
        const rawTitle = titleMatch && titleMatch[1] ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const title = rawTitle.slice(0, 90) || `Instagram Reel [${shortcode}]`;

        return {
          title,
          thumbnail: cleanThumb,
          m3u8_url: cleanVideoUrl,
          fast_download_url: `/api/stream-download?url=${encodeURIComponent(cleanVideoUrl)}&filename=${encodeURIComponent(`instagram_reel_${shortcode}`)}&source=instagram`,
          size: 'HD 1080p',
          duration: 30,
          source: 'instagram_embed_engine',
          platform: 'instagram',
          media_type: 'video',
          is_vertical: true,
          aspect_ratio: '9:16',
          is_mock: false,
        };
      }
    }
  } catch (err: any) {
    console.warn('[InstagramEmbedExtractor] Upstream query error:', err?.message);
  }
  return null;
}

async function extractTikTokDirect(targetUrl: string): Promise<ResolveResponse | null> {
  try {
    const endpoint = `https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl.trim())}`;
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const payload = (await res.json()) as any;
    if (payload?.code !== 0 || !payload?.data) return null;

    const data = payload.data;
    const videoId = String(data.id || 'tiktok_video');
    const title = data.title || `TikTok Video [${videoId}]`;
    const cover = data.cover || data.origin_cover || '';
    const duration = Number(data.duration || 0);

    const images: string[] = Array.isArray(data.images) ? data.images : [];
    if (images.length > 0) {
      const thumbnails = images.map((imgUrl, idx) => ({
        url: imgUrl,
        width: 1080,
        height: 1920,
        resolution: '1080 Ã— 1920',
        quality_label: `Slide ${idx + 1} of ${images.length} (HD Photo)`,
      }));
      const formats = images.map((imgUrl, idx) => ({
        format_id: `slide_${idx + 1}`,
        quality: `Slide ${idx + 1} Photo (JPG)`,
        height: 1920,
        ext: 'jpg',
        filesize: 'HD Photo',
        url: imgUrl,
        download_url: `/api/stream-download?url=${encodeURIComponent(imgUrl)}&filename=${encodeURIComponent(`tiktok_slide_${idx + 1}`)}&ext=jpg&source=tiktok`,
        has_audio: false,
        has_video: false,
        is_audio_only: false,
        is_progressive: true,
      }));

      const audioFormats = data.music
        ? [
            {
              format_id: 'music_audio',
              quality: 'Original Audio (MP3)',
              height: 0,
              ext: 'mp3',
              filesize: 'Audio Track',
              url: data.music,
              download_url: `/api/stream-download?url=${encodeURIComponent(data.music)}&filename=${encodeURIComponent(`tiktok_audio_${videoId}`)}&ext=mp3&source=tiktok`,
              has_audio: true,
              has_video: false,
              is_audio_only: true,
              is_progressive: false,
            },
          ]
        : [];

      return {
        success: true,
        title,
        thumbnail: cover || thumbnails[0]?.url || '',
        thumbnails,
        m3u8_url: thumbnails[0]?.url || '',
        fast_download_url: formats[0]?.download_url,
        size: `${images.length} HD Slides`,
        duration: 0,
        shareId: videoId,
        serverTime: new Date().toISOString(),
        source: 'tiktok_tikwm_engine',
        platform: 'tiktok',
        media_type: 'carousel',
        is_vertical: true,
        aspect_ratio: '9:16',
        formats,
        video_formats: formats,
        audio_formats: audioFormats,
        is_mock: false,
      };
    }

    const hdPlayUrl = data.hdplay;
    const playUrl = data.play;
    const wmUrl = data.wmplay;
    const primaryStream = hdPlayUrl || playUrl || wmUrl;
    if (!primaryStream) return null;

    const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const formats = [];

    // 1. HD No Watermark (if provided by TikWM)
    if (hdPlayUrl) {
      const hdSizeBytes = Number(data.hd_size || data.size || 0);
      const hdSizeLabel = hdSizeBytes > 0 ? `${(hdSizeBytes / (1024 * 1024)).toFixed(1)} MB` : '1080p HD';
      formats.push({
        format_id: 'hd_no_watermark',
        quality: '1080p Full HD (No Watermark)',
        height: 1080,
        ext: 'mp4',
        filesize: hdSizeLabel,
        url: hdPlayUrl,
        download_url: `/api/stream-download?url=${encodeURIComponent(hdPlayUrl)}&filename=${encodeURIComponent(`${cleanTitle}_1080p`)}&source=tiktok`,
        has_audio: true,
        has_video: true,
        is_audio_only: false,
        is_progressive: true,
      });
    }

    // 2. Clean standard stream (No Watermark)
    if (playUrl && playUrl !== hdPlayUrl) {
      const sizeBytes = Number(data.size || 0);
      const sizeLabel = sizeBytes > 0 ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB` : (hdPlayUrl ? '720p HD' : 'HD Quality');
      const height = hdPlayUrl ? 720 : 1080;
      const label = hdPlayUrl ? '720p HD (No Watermark)' : '1080p Full HD (No Watermark)';
      formats.push({
        format_id: hdPlayUrl ? 'sd_no_watermark' : 'hd_no_watermark',
        quality: label,
        height,
        ext: 'mp4',
        filesize: sizeLabel,
        url: playUrl,
        download_url: `/api/stream-download?url=${encodeURIComponent(playUrl)}&filename=${encodeURIComponent(cleanTitle)}&source=tiktok`,
        has_audio: true,
        has_video: true,
        is_audio_only: false,
        is_progressive: true,
      });
    }

    // 3. Watermarked version (Official TikTok copy)
    if (wmUrl && wmUrl !== playUrl && wmUrl !== hdPlayUrl) {
      const wmSizeBytes = Number(data.wm_size || data.size || 0);
      const wmSizeLabel = wmSizeBytes > 0 ? `${(wmSizeBytes / (1024 * 1024)).toFixed(1)} MB` : 'Original';
      formats.push({
        format_id: 'watermark',
        quality: 'Original (With Watermark)',
        height: 1080,
        ext: 'mp4',
        filesize: wmSizeLabel,
        url: wmUrl,
        download_url: `/api/stream-download?url=${encodeURIComponent(wmUrl)}&filename=${encodeURIComponent(`${cleanTitle}_wm`)}&source=tiktok`,
        has_audio: true,
        has_video: true,
        is_audio_only: false,
        is_progressive: true,
      });
    }

    const primaryFormat = formats[0];
    const downloadProxy = primaryFormat?.download_url || `/api/stream-download?url=${encodeURIComponent(primaryStream)}&filename=${encodeURIComponent(cleanTitle)}&source=tiktok`;
    const sizeLabel = primaryFormat?.filesize || (data.size ? `${(Number(data.size) / (1024 * 1024)).toFixed(1)} MB` : 'HD Quality');

    const audioFormats = [];
    if (data.music) {
      const audioObj = {
        format_id: 'music_mp3',
        quality: 'Original Audio (MP3)',
        height: 0,
        ext: 'mp3',
        filesize: 'Audio MP3',
        url: data.music,
        download_url: `/api/stream-download?url=${encodeURIComponent(data.music)}&filename=${encodeURIComponent(`${cleanTitle}_audio`)}&ext=mp3&source=tiktok`,
        has_audio: true,
        has_video: false,
        is_audio_only: true,
        is_progressive: false,
      };
      audioFormats.push(audioObj);
      formats.push(audioObj);
    }

    return {
      success: true,
      title,
      thumbnail: cover,
      thumbnails: cover
        ? [
            {
              url: cover,
              width: 1080,
              height: 1920,
              resolution: '1080 Ã— 1920',
              quality_label: 'Cover Thumbnail',
            },
          ]
        : [],
      m3u8_url: primaryStream,
      fast_download_url: downloadProxy,
      size: sizeLabel,
      duration,
      shareId: videoId,
      serverTime: new Date().toISOString(),
      source: 'tiktok_tikwm_engine',
      platform: 'tiktok',
      media_type: 'video',
      is_vertical: true,
      aspect_ratio: '9:16',
      formats,
      video_formats: formats.filter((f) => !f.is_audio_only),
      audio_formats: audioFormats,
      is_mock: false,
    };
  } catch (err: any) {
    console.warn('[TikTokDirectExtractor] Upstream query error:', err?.message);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
    return;
  }

  // Edge Caching: 1 hour edge cache, 10 minutes stale-while-revalidate
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
  res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');

  const { url, id } = req.query || {};
  const rawTarget = (url || id || '') as string;
  const queryTarget = extractUrlFromText(rawTarget);

  if (!queryTarget) {
    res.status(400).json({
      success: false,
      error: 'Missing URL or Share ID parameter. Usage: /api/resolve?url=https://terabox.com/s/1xxxx',
    });
    return;
  }

  const cacheKey = queryTarget.trim().toLowerCase();
  const cached = MEDIA_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.status(200).json(cached.data);
    return;
  }

  // 1. Remote Microservice: Check Render/Railway Python service if configured in production
  const remoteExtracted = await runRemoteResolver(queryTarget);
  if (remoteExtracted && remoteExtracted.success) {
    cacheSet(cacheKey, remoteExtracted);
    res.status(200).json(remoteExtracted);
    return;
  }
  if (remoteExtracted && !remoteExtracted.success) {
    res.status(200).json(remoteExtracted);
    return;
  }

  // 2. Local Fallback: Run local high-performance Python extractor (.venv yt-dlp + TeraBox gateway)
  const localExtracted = await runLocalExtractor(queryTarget);
  if (localExtracted && localExtracted.success) {
    cacheSet(cacheKey, localExtracted);
    res.status(200).json(localExtracted);
    return;
  }

  const shareId = extractShareId(queryTarget) || queryTarget;
  const igShortcode = extractInstagramShortcode(queryTarget);

  // If Instagram link and local extraction didn't succeed, attempt direct embed extractor
  if (igShortcode) {
    const igExtracted = await extractInstagramEmbed(igShortcode);
    if (igExtracted && igExtracted.m3u8_url) {
      const resolved: ResolveResponse = {
        success: true,
        title: igExtracted.title || `Instagram Reel [${igShortcode}]`,
        thumbnail: igExtracted.thumbnail || '',
        m3u8_url: igExtracted.m3u8_url,
        fast_download_url: igExtracted.fast_download_url,
        size: igExtracted.size || 'HD Quality',
        duration: igExtracted.duration || 30,
        shareId: igShortcode,
        serverTime: new Date().toISOString(),
        source: 'instagram_embed_engine',
        is_mock: false,
      };

      cacheSet(cacheKey, resolved);
      res.status(200).json(resolved);
      return;
    }
  }

  // If TikTok link, attempt direct TikTok extractor
  if (cacheKey.includes('tiktok.com')) {
    const ttExtracted = await extractTikTokDirect(queryTarget);
    if (ttExtracted && ttExtracted.success) {
      cacheSet(cacheKey, ttExtracted);
      res.status(200).json(ttExtracted);
      return;
    }
  }

  // If local extractor provided a specific clean error, return that
  if (localExtracted && !localExtracted.success) {
    res.status(200).json(localExtracted);
    return;
  }

  // Upstream third-party API integration / Local microservice hook
  const upstreamUrl = process.env.TERABOX_API_URL || process.env.EXTRACTOR_API_URL;
  const upstreamKey = process.env.TERABOX_API_KEY || process.env.EXTRACTOR_API_KEY;

  if (upstreamUrl) {
    try {
      // Canonicalize obscure/shortlink mirrors (terasharefile.com etc.) onto the
      // canonical TeraBox domain before delegating â€” third-party parsers fail on
      // unknown hostnames. Rebuild the shorturl with its leading "1".
      const canonicalTarget = /^(https?:\/\/)?([\w-]+\.)*(terabox|1024tera|nephobox|terasharefile|teraboxlink|1024terabox|freeterabox|mirrobox|terashare)/i.test(queryTarget)
        ? `https://www.terabox.app/s/1${shareId}`
        : queryTarget;
      const parsedBase = upstreamUrl.trim().replace(/\/$/, '');
      let targetEndpoint = parsedBase;
      if (!parsedBase.includes('/resolve') && !parsedBase.includes('/api/')) {
        targetEndpoint = `${parsedBase}/api/resolve`;
      }
      targetEndpoint = `${targetEndpoint}${targetEndpoint.includes('?') ? '&' : '?'}url=${encodeURIComponent(canonicalTarget)}&id=${encodeURIComponent(shareId)}`;

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (upstreamKey) {
        headers['x-rapidapi-key'] = upstreamKey;
        try {
          headers['x-rapidapi-host'] = new URL(upstreamUrl).hostname;
        } catch {}
      }

      const response = await fetch(targetEndpoint, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(12000),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        let directMedia = data.stream_url || data.dlink || data.fast_download_url || data.download_url || data.m3u8_url;
        let title = data.title || data.file_name || data.server_filename;
        let thumb = data.thumbnail || data.thumb;
        let size = data.size || data.file_size;

        if (Array.isArray(data.list) && data.list[0]) {
          const item = data.list[0];
          directMedia = directMedia || item.dlink;
          title = title || item.server_filename;
          size = size || (item.size ? `${(item.size / (1024 * 1024)).toFixed(1)} MB` : undefined);
          if (item.thumbs) {
            thumb = thumb || item.thumbs.url3 || item.thumbs.url2 || item.thumbs.url1;
          }
        }

        if (directMedia) {
          const cleanTitle = (title || `TeraBox_${shareId.substring(0, 8)}`).replace(/[^a-zA-Z0-9_-]/g, '_');
          const proxiedStream = `/api/stream-download?url=${encodeURIComponent(directMedia)}&filename=${encodeURIComponent(cleanTitle)}&source=terabox`;

          const resolved: ResolveResponse = {
            success: true,
            title: title || `TeraBox Stream [${shareId.substring(0, 8)}]`,
            thumbnail: thumb || '',
            m3u8_url: proxiedStream,
            fast_download_url: proxiedStream,
            size: size || 'HD Direct Stream',
            duration: data.duration || 0,
            shareId,
            serverTime: new Date().toISOString(),
            source: 'terabox_microservice',
            platform: 'terabox',
            formats: [
              {
                format_id: 'terabox_hd',
                quality: 'Original Quality (MP4)',
                ext: 'mp4',
                filesize: size || 'Direct Stream',
                url: proxiedStream,
                download_url: proxiedStream,
                has_audio: true,
                has_video: true,
                is_progressive: true,
              },
            ],
            is_mock: false,
          };

          cacheSet(cacheKey, resolved);
          res.status(200).json(resolved);
          return;
        }
      }
    } catch (err: any) {
      console.warn('[TeraBoxMicroservice] Fetch notice:', err?.message);
    }
  }

  // High-fidelity fallback mock response for local testing and zero-config launch
  let title = `TeraBox Fast Stream - File [${shareId.substring(0, 8)}]`;
  let thumbnail = 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1200&q=80';
  let source = 'terabox_edge_cdn';
  let detectedPlatform:
    | 'terabox'
    | 'youtube'
    | 'direct'
    | 'instagram'
    | 'facebook'
    | 'whatsapp'
    | 'tiktok'
    | 'bilibili'
    | 'dailymotion'
    | 'snapchat'
    | 'linkedin'
    | 'twitter'
    | 'vimeo'
    | 'universal' = 'terabox';
  let detectedYtId: string | undefined = undefined;
  let detectedTranscript: TranscriptData | null = null;

  const lower = queryTarget.toLowerCase();
  const ytMatch = queryTarget.match(/(?:youtu\.be\/|(?:youtube\.com|youtube-nocookie\.com)\/(?:embed\/|v\/|watch\?(?:.*&)?v=|shorts\/|live\/))([\w-]{11})/i);
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || ytMatch) {
    detectedYtId = ytMatch ? ytMatch[1] : undefined;
    detectedPlatform = 'youtube';
    title = detectedYtId ? `YouTube Video [${detectedYtId}]` : 'YouTube Media Stream';
    thumbnail = detectedYtId ? `https://img.youtube.com/vi/${detectedYtId}/maxresdefault.jpg` : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1200&q=80';
    source = 'youtube_fast_cdn';
    // A transcript is only attached when a real extractor produced one. The old
    // code answered with lyrics for one hardcoded video id, which the client
    // rendered as that video's subtitle track.
    detectedTranscript = null;
  } else if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    detectedPlatform = 'instagram';
    title = `Instagram Reel - ${igShortcode || 'Video'} [Ultra HD]`;
    thumbnail = 'https://images.unsplash.com/photo-1611262588024-d12430b98920?auto=format&fit=crop&w=1200&q=80';
    source = 'instagram_fast_cdn';
  } else if (lower.includes('tiktok.com')) {
    detectedPlatform = 'tiktok';
    title = 'TikTok Trending Video [HD]';
    thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1200&q=80';
    source = 'tiktok_fast_cdn';
  } else if (lower.includes('bilibili.com') || lower.includes('b23.tv')) {
    detectedPlatform = 'bilibili';
    title = 'Bilibili Animation & Video Stream [1080p]';
    thumbnail = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80';
    source = 'bilibili_fast_cdn';
  } else if (lower.includes('dailymotion.com') || lower.includes('dai.ly')) {
    detectedPlatform = 'dailymotion';
    title = 'Dailymotion HD Video Stream';
    thumbnail = 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1200&q=80';
    source = 'dailymotion_fast_cdn';
  } else if (lower.includes('snapchat.com')) {
    detectedPlatform = 'snapchat';
    title = 'Snapchat Spotlight Video';
    thumbnail = 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=1200&q=80';
    source = 'snapchat_fast_cdn';
  } else if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com')) {
    detectedPlatform = 'facebook';
    title = 'Facebook Watch Video [High Definition]';
    thumbnail = 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?auto=format&fit=crop&w=1200&q=80';
    source = 'facebook_fast_cdn';
  } else if (lower.includes('vimeo.com')) {
    detectedPlatform = 'vimeo';
    title = 'Vimeo Showcase Video Stream [HD]';
    thumbnail = 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1200&q=80';
    source = 'vimeo_fast_cdn';
  } else if (lower.includes('linkedin.com')) {
    detectedPlatform = 'linkedin';
    title = 'LinkedIn Professional Video Stream';
    thumbnail = 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?auto=format&fit=crop&w=1200&q=80';
    source = 'linkedin_fast_cdn';
  } else if (lower.includes('twitter.com') || lower.includes('x.com')) {
    detectedPlatform = 'twitter';
    title = 'X (Twitter) Video Clip [HD]';
    thumbnail = 'https://images.unsplash.com/photo-1611605698335-8b1569810432?auto=format&fit=crop&w=1200&q=80';
    source = 'twitter_fast_cdn';
  } else if (lower.includes('whatsapp.com') || lower.includes('wa.me')) {
    detectedPlatform = 'whatsapp';
    title = 'WhatsApp Shared Video Stream';
    thumbnail = 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?auto=format&fit=crop&w=1200&q=80';
    source = 'whatsapp_direct_cdn';
  } else if (/\.(mp4|m3u8|webm)(\?.*)?$/i.test(queryTarget)) {
    detectedPlatform = 'direct';
    title = 'Direct CDN Media Stream';
  } else {
    detectedPlatform = 'universal';
    title = 'Universal Media Stream';
  }

  // No extractor produced a playable stream for this link. Return an honest
  // failure. The old fallback answered with sample-video formats and a canned
  // transcript and the client presented both as the real media.
  res.status(404).json({
    success: false,
    error:
      'No downloadable stream was found for this link. The host may require a signed-in session, or the share link may have expired.',
    platform: detectedPlatform,
    is_mock: false,
  });
  return;
}
