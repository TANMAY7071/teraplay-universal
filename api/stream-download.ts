import type { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

let cachedSystemFfmpeg: string | null | undefined = undefined;

function getFfmpegPath(): string | null {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const venvBase = path.resolve(process.cwd(), '.venv');
  const candidates = [
    path.join(venvBase, 'Lib', 'site-packages', 'imageio_ffmpeg', 'binaries'),
    path.join(venvBase, 'lib', 'site-packages', 'imageio_ffmpeg', 'binaries'),
  ];
  const libDir = path.join(venvBase, 'lib');
  if (fs.existsSync(libDir)) {
    try {
      const subdirs = fs.readdirSync(libDir);
      for (const d of subdirs) {
        candidates.push(path.join(libDir, d, 'site-packages', 'imageio_ffmpeg', 'binaries'));
      }
    } catch {}
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const files = fs.readdirSync(c);
        const bin = files.find((f) => f.startsWith('ffmpeg') && !f.endsWith('.py'));
        if (bin) return path.join(c, bin);
      } catch {}
    }
  }

  if (cachedSystemFfmpeg !== undefined) {
    return cachedSystemFfmpeg;
  }

  try {
    const { execSync } = require('child_process');
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
    const found = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' }).trim().split(/\r?\n/)[0];
    if (found && fs.existsSync(found)) {
      cachedSystemFfmpeg = found;
      return found;
    }
    cachedSystemFfmpeg = 'ffmpeg';
    return 'ffmpeg';
  } catch {
    cachedSystemFfmpeg = null;
    return null;
  }
}

async function streamDirectFallback(
  targetUrl: string,
  req: any,
  res: any,
  downloadName: string,
  finalExt: string,
  isImageTarget: boolean,
  source?: string
) {
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
      if (!res.headersSent) {
        res.writeHead(302, { Location: targetUrl });
        res.end();
      }
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
      // @ts-ignore
      const nodeStream = Readable.fromWeb(upstreamResponse.body);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('[StreamDownload] Fallback proxy error:', err?.message);
    try {
      if (!res.headersSent) {
        res.writeHead(302, { Location: targetUrl });
        res.end();
      }
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to stream video download' });
      }
    }
  }
}

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ success: false, error: 'Method not allowed. Use GET or HEAD.' });
    return;
  }

  const { url, audio_url, audioUrl, filename, source, ext } = req.query || {};
  const targetUrl = (url as string || '').trim();
  const targetAudioUrl = ((audio_url || audioUrl) as string || '').trim();

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

  // 1. MUXING PIPELINE: If audio_url is specified, stitch video + audio tracks together
  if (targetAudioUrl && targetAudioUrl.startsWith('http') && !isImageTarget) {
    if (req.method === 'HEAD') {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.end();
      return;
    }

    // Path A: Remote Resolver (Render / Railway / external container)
    const remoteEndpoint = process.env.PYTHON_RESOLVER_URL || process.env.RESOLVER_SERVICE_URL;
    if (remoteEndpoint) {
      try {
        const base = remoteEndpoint.replace(/\/$/, '');
        const remoteStreamUrl = `${base}/stream-download?url=${encodeURIComponent(targetUrl)}&audio_url=${encodeURIComponent(targetAudioUrl)}&filename=${encodeURIComponent(cleanFilename)}&ext=${encodeURIComponent(finalExt)}`;
        const remoteRes = await fetch(remoteStreamUrl, {
          signal: AbortSignal.timeout(12000),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          },
        });
        if (remoteRes.ok && remoteRes.body) {
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          // @ts-ignore
          const nodeStream = Readable.fromWeb(remoteRes.body);
          nodeStream.pipe(res);
          return;
        }
      } catch (remoteErr: any) {
        console.warn('[StreamDownload] Remote mux worker notice:', remoteErr?.message);
      }
    }

    // Path B: Local FFmpeg (imageio-ffmpeg in .venv or system ffmpeg)
    const ffmpegBin = getFfmpegPath();
    if (ffmpegBin) {
      let started = false;
      try {
        const userAgent =
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
        const ffmpegArgs = [
          '-hide_banner',
          '-loglevel', 'error',
          '-user_agent', userAgent,
          '-i', targetUrl,
          '-user_agent', userAgent,
          '-i', targetAudioUrl,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
          '-f', 'mp4',
          'pipe:1',
        ];

        // Stdio: drain stdin and stderr to prevent child_process pipe buffer deadlock
        const proc = spawn(ffmpegBin, ffmpegArgs, {
          stdio: ['ignore', 'pipe', 'ignore'],
        });

        proc.stdout.once('data', (firstChunk) => {
          started = true;
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.write(firstChunk);
          proc.stdout.pipe(res);
        });

        proc.on('error', (err) => {
          console.error('[StreamDownload] FFmpeg spawn notice:', err.message);
          if (!started && !res.headersSent) {
            streamDirectFallback(targetUrl, req, res, downloadName, finalExt, isImageTarget, source as string);
          }
        });

        proc.on('close', (code) => {
          if (!started && !res.headersSent) {
            console.warn('[StreamDownload] FFmpeg exited without data, code:', code);
            streamDirectFallback(targetUrl, req, res, downloadName, finalExt, isImageTarget, source as string);
          }
        });

        req.on('close', () => {
          if (proc.exitCode === null) {
            try {
              proc.kill('SIGTERM');
            } catch {}
          }
        });
        return;
      } catch (localErr: any) {
        console.warn('[StreamDownload] Local FFmpeg execution notice:', localErr?.message);
        if (!started && !res.headersSent) {
          await streamDirectFallback(targetUrl, req, res, downloadName, finalExt, isImageTarget, source as string);
          return;
        }
      }
    }

    // Path C: Neither remote worker nor local FFmpeg available: graceful fallback to direct stream
    await streamDirectFallback(targetUrl, req, res, downloadName, finalExt, isImageTarget, source as string);
    return;
  }

  // 2. SINGLE STREAM PIPELINE: Direct video/audio/image proxy stream
  await streamDirectFallback(targetUrl, req, res, downloadName, finalExt, isImageTarget, source as string);
}

