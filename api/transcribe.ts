import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { mapGroqResponseToTranscript, FALLBACK_DEMO_TRANSCRIPT, type TranscriptData } from '../src/lib/transcription.ts';
import { assertPublicHttpUrl } from './_guard.ts';

/** Largest media file the endpoint will pull into memory. */
const MAX_MEDIA_BYTES = 24 * 1024 * 1024;
/** Largest request body the endpoint will accept. */
const MAX_REQUEST_BYTES = 24 * 1024 * 1024;

/**
 * Read a response body while enforcing a byte budget. Returns null when the
 * body is larger than the budget.
 */
async function readCapped(response: Response, maxBytes: number): Promise<Buffer | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

/** Decode a base64 audio payload, refusing anything over the budget. */
function decodeAudioPayload(base64: string): Buffer | null {
  const clean = base64.replace(/^data:[^;]+;base64,/, '');
  // base64 expands to 3 bytes per 4 characters.
  if (clean.length > Math.ceil((MAX_REQUEST_BYTES * 4) / 3)) return null;
  return Buffer.from(clean, 'base64');
}

function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = clean.match(regExp);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  return null;
}

function extractInstagramShortcode(input: string): string | null {
  const match = input.match(/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(reels?|p|tv|stories)\/([A-Za-z0-9_-]+)/i);
  return match ? match[2] : null;
}

async function extractInstagramEmbedDirectUrl(shortcode: string): Promise<string | null> {
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const html = await response.text();
      const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/) || html.match(/video_url\s*:\s*'([^']+)'/);
      if (videoMatch && videoMatch[1]) {
        return videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
      }
      const videoTagMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i);
      if (videoTagMatch && videoTagMatch[1]) {
        return videoTagMatch[1].replace(/&amp;/g, '&');
      }
    }
  } catch (err: any) {
    console.warn('[InstagramEmbedTranscribe] Upstream query error:', err?.message);
  }
  return null;
}

function unwrapStreamUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('/api/stream-download?') || trimmed.includes('/api/stream-download/')) {
    try {
      const dummy = new URL(trimmed, 'http://localhost');
      const inner = dummy.searchParams.get('url');
      if (inner) return decodeURIComponent(inner).trim();
    } catch {}
  }
  return trimmed;
}

function runLocalTranscriptExtractor(targetUrl: string): Promise<any | null> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const venvPython = isWin
      ? path.resolve(process.cwd(), '.venv', 'Scripts', 'python.exe')
      : path.resolve(process.cwd(), '.venv', 'bin', 'python');
    const fallbackPython = isWin ? 'python' : 'python3';
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'extractor.py');
    const pythonBin = fs.existsSync(venvPython) ? venvPython : fallbackPython;

    execFile(pythonBin, [scriptPath, '--transcript', targetUrl], { timeout: 15000 }, (error, stdout) => {
      if (error || !stdout) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch {
        resolve(null);
      }
    });
  });
}

function runLocalMediaInfoExtractor(targetUrl: string): Promise<any | null> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const venvPython = isWin
      ? path.resolve(process.cwd(), '.venv', 'Scripts', 'python.exe')
      : path.resolve(process.cwd(), '.venv', 'bin', 'python');
    const fallbackPython = isWin ? 'python' : 'python3';
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'extractor.py');
    const pythonBin = fs.existsSync(venvPython) ? venvPython : fallbackPython;

    execFile(pythonBin, [scriptPath, targetUrl], { timeout: 18000 }, (error, stdout) => {
      if (error || !stdout) {
        resolve(null);
        return;
      }
      try {
        const raw = stdout.trim();
        const firstBrace = raw.indexOf('{');
        const lastBrace = raw.lastIndexOf('}');
        const jsonStr = firstBrace !== -1 && lastBrace !== -1 ? raw.slice(firstBrace, lastBrace + 1) : raw;
        const parsed = JSON.parse(jsonStr);
        resolve(parsed);
      } catch {
        resolve(null);
      }
    });
  });
}

async function runRemoteTranscriptExtractor(targetUrl: string): Promise<any | null> {
  const remoteEndpoint = process.env.PYTHON_RESOLVER_URL || process.env.RESOLVER_SERVICE_URL;
  if (!remoteEndpoint) return null;

  try {
    const base = remoteEndpoint.replace(/\/$/, '');
    const res = await fetch(`${base}/transcript?url=${encodeURIComponent(targetUrl)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[RemoteTranscript] Fetch failed:', err);
  }
  return null;
}

function getFileNameForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('audio/mpeg') || m.includes('audio/mp3')) return 'audio.mp3';
  if (m.includes('audio/mp4') || m.includes('audio/m4a') || m.includes('audio/x-m4a') || m.includes('audio/aac')) return 'audio.m4a';
  if (m.includes('audio/wav') || m.includes('audio/x-wav')) return 'audio.wav';
  if (m.includes('audio/webm')) return 'audio.webm';
  if (m.includes('audio/ogg') || m.includes('audio/opus')) return 'audio.ogg';
  if (m.includes('audio/flac')) return 'audio.flac';
  if (m.includes('video/webm')) return 'media.webm';
  if (m.includes('video/x-msvideo')) return 'media.avi';
  return 'media.mp4';
}

function isGroqDirectAudio(mime: string): boolean {
  const m = mime.toLowerCase();
  return (
    m.includes('audio/mpeg') ||
    m.includes('audio/mp3') ||
    m.includes('audio/mp4') ||
    m.includes('audio/m4a') ||
    m.includes('audio/wav') ||
    m.includes('audio/webm') ||
    m.includes('audio/ogg') ||
    m.includes('audio/flac')
  );
}

function detectAudioMimeAndExt(url: string, contentType?: string | null, buffer?: Buffer): { mimeType: string; fileName: string } {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('audio/mpeg') || ct.includes('audio/mp3')) return { mimeType: 'audio/mpeg', fileName: 'audio.mp3' };
  if (ct.includes('audio/mp4') || ct.includes('audio/m4a') || ct.includes('audio/x-m4a') || ct.includes('audio/aac')) return { mimeType: 'audio/mp4', fileName: 'audio.m4a' };
  if (ct.includes('audio/wav') || ct.includes('audio/x-wav')) return { mimeType: 'audio/wav', fileName: 'audio.wav' };
  if (ct.includes('audio/webm')) return { mimeType: 'audio/webm', fileName: 'audio.webm' };
  if (ct.includes('audio/ogg') || ct.includes('audio/opus')) return { mimeType: 'audio/ogg', fileName: 'audio.ogg' };
  if (ct.includes('audio/flac')) return { mimeType: 'audio/flac', fileName: 'audio.flac' };
  if (ct.includes('video/mp4')) return { mimeType: 'video/mp4', fileName: 'media.mp4' };
  if (ct.includes('video/webm')) return { mimeType: 'video/webm', fileName: 'media.webm' };

  if (buffer && buffer.length >= 8) {
    if ((buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0)) {
      return { mimeType: 'audio/mpeg', fileName: 'audio.mp3' };
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      const riffType = buffer.subarray(8, 12).toString('ascii');
      if (riffType === 'WAVE') return { mimeType: 'audio/wav', fileName: 'audio.wav' };
      if (riffType === 'AVI ') return { mimeType: 'video/x-msvideo', fileName: 'media.avi' };
    }
    if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
      return { mimeType: 'audio/ogg', fileName: 'audio.ogg' };
    }
    if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
      return { mimeType: 'audio/webm', fileName: 'audio.webm' };
    }
    if (buffer[0] === 0x66 && buffer[1] === 0x4C && buffer[2] === 0x61 && buffer[3] === 0x43) {
      return { mimeType: 'audio/flac', fileName: 'audio.flac' };
    }
    if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
      const brand = buffer.subarray(8, 12).toString('ascii');
      if (brand === 'M4A ' || brand === 'M4B ' || brand === 'dash') {
        return { mimeType: 'audio/mp4', fileName: 'audio.m4a' };
      }
      return { mimeType: 'video/mp4', fileName: 'media.mp4' };
    }
  }

  const lowerTarget = url.toLowerCase();
  if (lowerTarget.includes('.mp3') || lowerTarget.includes('mime=audio%2fmpeg')) return { mimeType: 'audio/mpeg', fileName: 'audio.mp3' };
  if (lowerTarget.includes('.m4a') || lowerTarget.includes('mime=audio%2fmp4')) return { mimeType: 'audio/mp4', fileName: 'audio.m4a' };
  if (lowerTarget.includes('.wav')) return { mimeType: 'audio/wav', fileName: 'audio.wav' };
  if (lowerTarget.includes('.webm') || lowerTarget.includes('mime=audio%2fwebm')) return { mimeType: 'audio/webm', fileName: 'audio.webm' };
  if (lowerTarget.includes('.ogg')) return { mimeType: 'audio/ogg', fileName: 'audio.ogg' };
  if (lowerTarget.includes('.flac')) return { mimeType: 'audio/flac', fileName: 'audio.flac' };

  return { mimeType: 'video/mp4', fileName: 'media.mp4' };
}

function resampleAudioTo16kHz(
  inputBuffer: Buffer,
  inputMime: string
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  return new Promise((resolve) => {
    if (isGroqDirectAudio(inputMime) && inputBuffer.length <= 24 * 1024 * 1024) {
      return resolve({
        buffer: inputBuffer,
        mimeType: inputMime,
        fileName: getFileNameForMime(inputMime),
      });
    }

    execFile('ffmpeg', ['-version'], (testErr) => {
      if (testErr) {
        const MAX_BYTES = 24 * 1024 * 1024;
        const sliced = inputBuffer.length > MAX_BYTES ? inputBuffer.subarray(0, MAX_BYTES) : inputBuffer;
        return resolve({
          buffer: sliced,
          mimeType: inputMime,
          fileName: getFileNameForMime(inputMime),
        });
      }

      const child = execFile(
        'ffmpeg',
        ['-i', 'pipe:0', '-vn', '-ar', '16000', '-ac', '1', '-b:a', '48k', '-f', 'mp3', 'pipe:1'],
        { maxBuffer: 30 * 1024 * 1024, encoding: 'buffer' },
        (convErr, stdoutBuffer) => {
          if (convErr || !stdoutBuffer || stdoutBuffer.length === 0) {
            const MAX_BYTES = 24 * 1024 * 1024;
            const sliced = inputBuffer.length > MAX_BYTES ? inputBuffer.subarray(0, MAX_BYTES) : inputBuffer;
            return resolve({
              buffer: sliced,
              mimeType: inputMime,
              fileName: getFileNameForMime(inputMime),
            });
          }
          resolve({
            buffer: Buffer.isBuffer(stdoutBuffer) ? stdoutBuffer : Buffer.from(stdoutBuffer),
            mimeType: 'audio/mpeg',
            fileName: 'audio_16khz.mp3',
          });
        }
      );

      if (child.stdin) {
        child.stdin.on('error', () => {
          // Prevent unhandled EPIPE exception if ffmpeg exits early
        });
        child.stdin.end(inputBuffer);
      }
    });
  });
}

export default async function handler(req: any, res: any) {
  // 1. CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Parse query, body parameters, and direct stream buffers
  const query = req.query || {};
  let body: Record<string, any> = {};
  let directAudioBuffer: Buffer | null = null;

  if (Buffer.isBuffer(req.body)) {
    directAudioBuffer = req.body;
  } else if (typeof req.body === 'object' && req.body !== null) {
    body = req.body;
    if (typeof body.audio === 'string' && body.audio.trim()) {
      const decoded = decodeAudioPayload(body.audio);
      if (!decoded) {
        res.status(413).json({
          success: false,
          code: 'PAYLOAD_TOO_LARGE',
          error: 'The uploaded audio is larger than the limit.',
          can_fallback_demo: true,
        });
        return;
      }
      directAudioBuffer = decoded;
    }
  } else if (typeof req.body === 'string' && req.body.trim()) {
    try {
      body = JSON.parse(req.body);
      if (typeof body.audio === 'string' && body.audio.trim()) {
        const decoded = decodeAudioPayload(body.audio);
        if (!decoded) {
          res.status(413).json({
            success: false,
            code: 'PAYLOAD_TOO_LARGE',
            error: 'The uploaded audio is larger than the limit.',
            can_fallback_demo: true,
          });
          return;
        }
        directAudioBuffer = decoded;
      }
    } catch {}
  }

  // Handle incoming readable stream for direct POST payload
  if (!directAudioBuffer && !req.body && req.method === 'POST' && typeof req.on === 'function') {
    try {
      const chunks: Buffer[] = [];
      let received = 0;
      for await (const chunk of req) {
        const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        received += buf.length;
        if (received > MAX_REQUEST_BYTES) {
          res.status(413).json({
            success: false,
            code: 'PAYLOAD_TOO_LARGE',
            error: 'The uploaded audio is larger than the limit.',
            can_fallback_demo: true,
          });
          return;
        }
        chunks.push(buf);
      }
      if (chunks.length > 0) {
        const assembled = Buffer.concat(chunks);
        const ct = req.headers?.['content-type'] || '';
        if (ct.includes('application/json')) {
          try {
            body = JSON.parse(assembled.toString('utf8'));
            if (typeof body.audio === 'string' && body.audio.trim()) {
              const decoded = decodeAudioPayload(body.audio);
              if (!decoded) {
                res.status(413).json({
                  success: false,
                  code: 'PAYLOAD_TOO_LARGE',
                  error: 'The uploaded audio is larger than the limit.',
                  can_fallback_demo: true,
                });
                return;
              }
              directAudioBuffer = decoded;
            }
          } catch {}
        } else {
          directAudioBuffer = assembled;
        }
      }
    } catch {}
  }

  if (directAudioBuffer && directAudioBuffer.length === 0) {
    directAudioBuffer = null;
  }

  const rawUrlParam = (query.url || body.url || '') as string;
  const platformUrlParam = (query.platformUrl || body.platformUrl || '') as string;
  const rawMediaUrlParam = (query.mediaUrl || body.mediaUrl || '') as string;
  const rawAudioUrlParam = (query.audioUrl || body.audioUrl || '') as string;
  const idParam = (query.id || body.id || '') as string;
  const demoRequested = query.demo === 'true' || query.sample === '1' || body.demo === true || body.demo === 'true';
  const languageHint = (query.language || body.language || '') as string;

  const urlParam = unwrapStreamUrl(rawUrlParam);
  const mediaUrlParam = unwrapStreamUrl(rawMediaUrlParam);
  const audioUrlParam = unwrapStreamUrl(rawAudioUrlParam);
  const primaryTarget = (audioUrlParam || mediaUrlParam || urlParam || platformUrlParam || idParam || '').trim();

  // 3. Explicit Demo/Sample Fallback Request
  if (demoRequested) {
    const demoData: TranscriptData = {
      language: 'en',
      count: FALLBACK_DEMO_TRANSCRIPT.length,
      items: FALLBACK_DEMO_TRANSCRIPT,
    };
    res.status(200).json({
      success: true,
      is_demo: true,
      is_fallback: true,
      source: 'demo_fallback',
      transcript: demoData,
    });
    return;
  }

  if ((!directAudioBuffer || directAudioBuffer.length === 0) && !primaryTarget) {
    res.status(400).json({
      success: false,
      code: 'MISSING_PARAM',
      error: 'Missing url or mediaUrl parameter. Usage: /api/transcribe?url=<media_url>',
      can_fallback_demo: true,
    });
    return;
  }

  // 4. Platform Native Subtitle Detection (Zero AI Overhead)
  // Check if native subtitle tracks exist on YouTube or host platform first
  const ytTarget = platformUrlParam || primaryTarget;
  const ytId = extractYouTubeId(ytTarget);
  if (ytId) {
    const remoteSub = await runRemoteTranscriptExtractor(ytId);
    if (remoteSub?.success && remoteSub.transcript?.items?.length) {
      res.status(200).json({
        success: true,
        source: 'native',
        message: 'Native platform subtitles detected and served with zero AI overhead.',
        transcript: remoteSub.transcript,
      });
      return;
    }

    const localSub = await runLocalTranscriptExtractor(ytId);
    if (localSub?.success && localSub.transcript?.items?.length) {
      res.status(200).json({
        success: true,
        source: 'native',
        message: 'Native platform subtitles detected and served with zero AI overhead.',
        transcript: localSub.transcript,
      });
      return;
    }
  }

  // 5. Groq Whisper API Key Verification
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    res.status(500).json({
      success: false,
      code: 'MISSING_API_KEY',
      error: 'GROQ_API_KEY is not configured in environment. Configure GROQ_API_KEY to enable Groq Whisper AI transcription.',
      can_fallback_demo: true,
    });
    return;
  }

  // 6. Acquire Direct Audio / Media Buffer
  try {
    let mediaBuffer: Buffer;
    let initialMime = 'video/mp4';

    if (directAudioBuffer && directAudioBuffer.length > 0) {
      mediaBuffer = directAudioBuffer;
      const detected = detectAudioMimeAndExt('', req.headers?.['content-type'], mediaBuffer);
      initialMime = detected.mimeType;
    } else {
      let directMediaUrl = audioUrlParam || mediaUrlParam;

      // Check if URL is already a direct media file
      if (!directMediaUrl && urlParam) {
        if (!/^https?:\/\//i.test(urlParam) && !/^[a-zA-Z0-9_-]{11}$/.test(urlParam)) {
          res.status(422).json({
            success: false,
            code: 'STREAM_RESOLVE_FAILED',
            error: 'Could not resolve a direct media stream from this link. Please ensure video is public or provide a direct media link.',
            can_fallback_demo: true,
          });
          return;
        }

        const isDirectFile =
          /\.(mp4|m4a|mp3|webm|wav|ogg|aac)(\?.*)?$/i.test(urlParam) ||
          urlParam.includes('cdninstagram.com') ||
          urlParam.includes('fbcdn.net') ||
          urlParam.includes('googlevideo.com');

        if (isDirectFile) {
          directMediaUrl = urlParam;
        } else {
          // If Instagram post/reel, resolve direct video stream URL
          const igShortcode = extractInstagramShortcode(urlParam);
          if (igShortcode) {
            const igStream = await extractInstagramEmbedDirectUrl(igShortcode);
            if (igStream) directMediaUrl = igStream;
          }

          // If still no direct stream, run media extractor to resolve stream link
          if (!directMediaUrl) {
            const mediaInfo = await runLocalMediaInfoExtractor(urlParam);
            if (mediaInfo?.transcript?.items?.length) {
              res.status(200).json({
                success: true,
                source: 'native',
                transcript: mediaInfo.transcript,
              });
              return;
            }
            if (mediaInfo?.audio_formats?.[0]?.url) {
              directMediaUrl = unwrapStreamUrl(mediaInfo.audio_formats[0].url);
            } else if (mediaInfo?.fast_download_url) {
              directMediaUrl = unwrapStreamUrl(mediaInfo.fast_download_url);
            } else if (mediaInfo?.stream_url) {
              directMediaUrl = unwrapStreamUrl(mediaInfo.stream_url);
            } else if (mediaInfo?.video_formats?.[0]?.url) {
              directMediaUrl = unwrapStreamUrl(mediaInfo.video_formats[0].url);
            }
          }
        }
      }

      if (!directMediaUrl) {
        directMediaUrl = primaryTarget;
      }

      // Resolve a relative path against the configured public origin. The Host and
      // X-Forwarded-Proto headers are caller-controlled, so deriving the origin
      // from them turns this endpoint into an SSRF proxy.
      if (directMediaUrl.startsWith('/')) {
        const publicOrigin = (process.env.PUBLIC_ORIGIN || 'https://teraplay.app').replace(/\/$/, '');
        directMediaUrl = `${publicOrigin}${directMediaUrl}`;
      }

      // Check if target is a valid HTTP/HTTPS URL
      if (!/^https?:\/\//i.test(directMediaUrl)) {
        res.status(422).json({
          success: false,
          code: 'STREAM_RESOLVE_FAILED',
          error: 'Could not resolve a playable media stream from this link or identifier.',
          can_fallback_demo: true,
        });
        return;
      }

      // The media URL is caller-controlled and this handler fetches it. Vet it
      // before it reaches the network so the endpoint cannot reach loopback
      // services or the cloud metadata address.
      try {
        await assertPublicHttpUrl(directMediaUrl);
      } catch (err: any) {
        res.status(400).json({
          success: false,
          code: 'INVALID_MEDIA_URL',
          error: err?.message || 'The media URL is not allowed.',
          can_fallback_demo: true,
        });
        return;
      }

      // Check if target is still an unresolved webpage
      if (
        /^https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am|youtube\.com|youtu\.be|facebook\.com|fb\.watch|tiktok\.com|twitter\.com|x\.com|terabox\.com|1024tera\.com|freeterabox\.com|nephobox\.com|vimeo\.com|dailymotion\.com|reddit\.com)/i.test(directMediaUrl) &&
        !/\.(mp4|m4a|mp3|webm|wav|ogg|aac)(\?.*)?$/i.test(directMediaUrl) &&
        !directMediaUrl.includes('cdninstagram.com') &&
        !directMediaUrl.includes('fbcdn.net') &&
        !directMediaUrl.includes('googlevideo.com')
      ) {
        res.status(422).json({
          success: false,
          code: 'STREAM_RESOLVE_FAILED',
          error: 'Could not resolve a direct media stream from this link. Please ensure video is public or provide a direct media link.',
          can_fallback_demo: true,
        });
        return;
      }

      const isInstagram = directMediaUrl.includes('instagram.com') || directMediaUrl.includes('fbcdn.net') || directMediaUrl.includes('cdninstagram.com');
      const upstreamHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': '*/*',
      };

      if (isInstagram) {
        upstreamHeaders['Referer'] = 'https://www.instagram.com/';
        upstreamHeaders['Origin'] = 'https://www.instagram.com';
        upstreamHeaders['Sec-Fetch-Dest'] = 'video';
        upstreamHeaders['Sec-Fetch-Mode'] = 'cors';
        upstreamHeaders['Sec-Fetch-Site'] = 'cross-site';
      }

      const mediaRes = await fetch(directMediaUrl, {
        headers: upstreamHeaders,
        signal: AbortSignal.timeout(12000),
      });

      if (!mediaRes.ok && mediaRes.status !== 206) {
        res.status(502).json({
          success: false,
          code: 'MEDIA_FETCH_FAILED',
          error: `Could not fetch media stream (HTTP ${mediaRes.status}). Stream link may have expired or is protected.`,
          can_fallback_demo: true,
        });
        return;
      }

      const mediaContentType = (mediaRes.headers.get('content-type') || '').toLowerCase();
      const isHtmlResponse =
        mediaContentType.includes('text/html') ||
        mediaContentType.includes('text/plain') ||
        mediaContentType.includes('application/json');

      // Cap the download before it lands in the heap. The whole file was being
      // buffered, so one large media URL could exhaust the instance.
      const declaredLength = Number(mediaRes.headers.get('content-length') || 0);
      if (declaredLength > MAX_MEDIA_BYTES) {
        res.status(413).json({
          success: false,
          code: 'MEDIA_TOO_LARGE',
          error: 'The media file is larger than the transcription limit.',
          can_fallback_demo: true,
        });
        return;
      }

      const capped = await readCapped(mediaRes, MAX_MEDIA_BYTES);
      if (!capped) {
        res.status(413).json({
          success: false,
          code: 'MEDIA_TOO_LARGE',
          error: 'The media file is larger than the transcription limit.',
          can_fallback_demo: true,
        });
        return;
      }
      mediaBuffer = capped;

      if (mediaBuffer.length === 0) {
        res.status(422).json({
          success: false,
          code: 'EMPTY_MEDIA',
          error: 'Fetched media payload was empty.',
          can_fallback_demo: true,
        });
        return;
      }

      const isHtmlBody = /^\s*(?:<!doctype|<html|<head|<\?xml|<!--|\{)/i.test(mediaBuffer.subarray(0, 100).toString('utf8'));
      if (isHtmlResponse || isHtmlBody) {
        res.status(422).json({
          success: false,
          code: 'STREAM_RESOLVE_FAILED',
          error: 'Could not resolve a direct media stream from this link. Upstream server returned a webpage or error document instead of an audio/video stream.',
          can_fallback_demo: true,
        });
        return;
      }

      const detected = detectAudioMimeAndExt(directMediaUrl, mediaRes.headers.get('content-type'), mediaBuffer);
      initialMime = detected.mimeType;
    }

    // Resample audio to 16kHz mono or pass direct stream buffer
    const { buffer: payloadBuffer, mimeType, fileName } = await resampleAudioTo16kHz(mediaBuffer, initialMime);

    // 7. Query Groq Whisper API endpoint
    // Endpoint: https://api.groq.com/openai/v1/audio/transcriptions
    // Model: whisper-large-v3-turbo, response_format: verbose_json, timestamp_granularities: ["segment"]
    const formData = new FormData();
    const fileBlob = new Blob([payloadBuffer], { type: mimeType });
    formData.append('file', fileBlob, fileName);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');
    if (languageHint) {
      formData.append('language', languageHint);
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: AbortSignal.timeout(25000),
    });

    if (groqResponse.status === 401) {
      res.status(500).json({
        success: false,
        code: 'INVALID_API_KEY',
        error: 'GROQ_API_KEY is invalid or expired. Please check your credentials in the Groq console.',
        can_fallback_demo: true,
      });
      return;
    }

    if (groqResponse.status === 429) {
      res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        error: 'Groq Whisper rate limit exceeded. Free tier limit reached (14,400 audio seconds/day).',
        can_fallback_demo: true,
      });
      return;
    }

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      let msg = `Groq API returned HTTP ${groqResponse.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) msg = parsed.error.message;
      } catch {}
      res.status(502).json({
        success: false,
        code: 'GROQ_API_ERROR',
        error: msg,
        can_fallback_demo: true,
      });
      return;
    }

    const groqJson = await groqResponse.json();
    const transcript = mapGroqResponseToTranscript(groqJson);

    if (!transcript.items.length) {
      res.status(422).json({
        success: false,
        code: 'NO_SPEECH_DETECTED',
        error: 'No audible speech or transcript cues were detected in this media file.',
        can_fallback_demo: true,
      });
      return;
    }

    res.status(200).json({
      success: true,
      source: 'groq-whisper',
      model: 'whisper-large-v3-turbo',
      transcript,
    });
  } catch (err: any) {
    console.error('[TranscribeEndpoint] Error:', err);
    // The raw message can carry upstream hostnames, temp paths, or command
    // lines. Log the detail, return a generic one.
    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      error: 'Transcription failed. Please retry.',
      can_fallback_demo: true,
    });
  }
}
