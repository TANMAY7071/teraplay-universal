import type { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

let cachedSystemFfmpeg: string | null | undefined = undefined;

function safePipe(source: any, dest: any) {
  source.on('error', (err: any) => {
    console.warn('[StreamDownload] Stream source error handled:', err?.message || err);
    try {
      if (!dest.writableEnded) dest.end();
    } catch {}
  });
  dest.on('error', (err: any) => {
    console.warn('[StreamDownload] Stream dest error handled:', err?.message || err);
  });
  source.pipe(dest);
}

function getFfmpegPath(): string | null {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  if (cachedSystemFfmpeg !== undefined) {
    return cachedSystemFfmpeg;
  }

  // 1. Check Python's bundled imageio_ffmpeg
  try {
    const pyExe = execSync('python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"', {
      stdio: 'pipe',
      encoding: 'utf-8',
    })
      .trim()
      .split(/\r?\n/)[0];
    if (pyExe && fs.existsSync(pyExe)) {
      cachedSystemFfmpeg = pyExe;
      return pyExe;
    }
  } catch {}

  // 2. Check virtual environment binaries
  const venvBase = path.resolve(process.cwd(), '.venv');
  const candidates = [
    path.join(venvBase, 'Lib', 'site-packages', 'imageio_ffmpeg', 'binaries'),
    path.join(venvBase, 'lib', 'site-packages', 'imageio_ffmpeg', 'binaries'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const files = fs.readdirSync(c);
        const bin = files.find((f) => f.startsWith('ffmpeg') && !f.endsWith('.py'));
        if (bin) {
          cachedSystemFfmpeg = path.join(c, bin);
          return cachedSystemFfmpeg;
        }
      } catch {}
    }
  }

  // 3. Check system PATH
  try {
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
    const found = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' }).trim().split(/\r?\n/)[0];
    if (found && fs.existsSync(found)) {
      cachedSystemFfmpeg = found;
      return found;
    }
  } catch {}

  cachedSystemFfmpeg = null;
  return null;
}

/**
 * Temp directory for accelerated downloads
 */
const MEDIA_CACHE_DIR = path.resolve(process.cwd(), 'tmp_media');
try {
  if (!fs.existsSync(MEDIA_CACHE_DIR)) {
    fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
  }
} catch {}

// Periodic cleanup of cached media older than 30 minutes
setInterval(() => {
  try {
    if (!fs.existsSync(MEDIA_CACHE_DIR)) return;
    const now = Date.now();
    const files = fs.readdirSync(MEDIA_CACHE_DIR);
    for (const file of files) {
      const fullPath = path.join(MEDIA_CACHE_DIR, file);
      try {
        const stat = fs.statSync(fullPath);
        if (now - stat.mtimeMs > 30 * 60 * 1000) {
          fs.unlinkSync(fullPath);
        }
      } catch {}
    }
  } catch {}
}, 10 * 60 * 1000).unref();

// In-flight download deduplication
const IN_FLIGHT_DOWNLOADS = new Map<string, Promise<{ filePath: string; size: number } | null>>();

/**
 * Execute accelerated multi-fragment yt-dlp download worker
 */
async function runAcceleratedYtdl(
  videoUrl: string,
  fmtSpec: string,
  ext: string
): Promise<{ filePath: string; size: number } | null> {
  const cacheKey = `${videoUrl}::${fmtSpec}::${ext}`;
  if (IN_FLIGHT_DOWNLOADS.has(cacheKey)) {
    return IN_FLIGHT_DOWNLOADS.get(cacheKey)!;
  }

  const promise = (async () => {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'ytdl_worker.py');
    if (!fs.existsSync(scriptPath)) {
      return null;
    }

    return new Promise<{ filePath: string; size: number } | null>((resolve) => {
      const child = spawn('python', [scriptPath, videoUrl, fmtSpec, MEDIA_CACHE_DIR, ext], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        IN_FLIGHT_DOWNLOADS.delete(cacheKey);
        try {
          const markerMatch = stdout.match(/__TERA_DATA__([\s\S]*?)__TERA_DATA__/);
          if (markerMatch && markerMatch[1]) {
            const parsed = JSON.parse(markerMatch[1].trim());
            if (parsed.success && parsed.file_path && fs.existsSync(parsed.file_path)) {
              resolve({
                filePath: parsed.file_path,
                size: parsed.size_bytes || fs.statSync(parsed.file_path).size,
              });
              return;
            }
          }

          // Fallback regex search for JSON output with success: true
          const jsonMatch = stdout.match(/\{[^{}]*\"success\"\s*:\s*true[^{}]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.success && parsed.file_path && fs.existsSync(parsed.file_path)) {
              resolve({
                filePath: parsed.file_path,
                size: parsed.size_bytes || fs.statSync(parsed.file_path).size,
              });
              return;
            }
          }
        } catch (e: any) {
          console.warn('[StreamDownload] JSON parse notice:', e.message);
        }
        console.warn(`[StreamDownload] ytdl_worker notice (code ${code}):`, stderr.slice(-300));
        resolve(null);
      });
      child.on('error', (err) => {
        IN_FLIGHT_DOWNLOADS.delete(cacheKey);
        console.warn('[StreamDownload] ytdl_worker spawn notice:', err.message);
        resolve(null);
      });
    });
  })();

  IN_FLIGHT_DOWNLOADS.set(cacheKey, promise);
  return promise;
}

/**
 * Parallel Range Chunk Streamer
 * Overcomes YouTube & CDN single-connection speed limits by fetching multiple 4MB chunks
 * in parallel and streaming them in strictly sequential order to the client.
 */
async function streamParallelChunks(
  targetUrl: string,
  totalLength: number,
  res: any,
  upstreamHeaders: Record<string, string>,
  concurrency = 5,
  chunkSize = 4 * 1024 * 1024
) {
  const totalChunks = Math.ceil(totalLength / chunkSize);
  let nextChunkToFetch = 0;
  let nextChunkToWrite = 0;
  const chunkBuffers = new Map<number, Buffer>();
  let isAborted = false;

  res.on('close', () => {
    isAborted = true;
  });

  async function fetchWorker() {
    while (!isAborted && nextChunkToFetch < totalChunks) {
      if (chunkBuffers.size >= concurrency * 2) {
        await new Promise((r) => setTimeout(r, 40));
        continue;
      }
      const chunkIdx = nextChunkToFetch++;
      const start = chunkIdx * chunkSize;
      const end = Math.min(start + chunkSize - 1, totalLength - 1);

      try {
        const resp = await fetch(targetUrl, {
          headers: {
            ...upstreamHeaders,
            Range: `bytes=${start}-${end}`,
          },
        });
        if (!resp.ok && resp.status !== 206) {
          throw new Error(`Chunk ${chunkIdx} failed with HTTP ${resp.status}`);
        }
        const ab = await resp.arrayBuffer();
        if (isAborted) return;
        chunkBuffers.set(chunkIdx, Buffer.from(ab));
        drainOrderedChunks();
      } catch {
        if (!isAborted) {
          nextChunkToFetch = Math.min(nextChunkToFetch, chunkIdx);
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }
  }

  function drainOrderedChunks() {
    while (chunkBuffers.has(nextChunkToWrite)) {
      if (isAborted) return;
      const buf = chunkBuffers.get(nextChunkToWrite)!;
      chunkBuffers.delete(nextChunkToWrite);
      res.write(buf);
      nextChunkToWrite++;
      if (nextChunkToWrite === totalChunks) {
        res.end();
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => fetchWorker());
  await Promise.all(workers);
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
    const isInstagram =
      targetUrl.includes('cdninstagram.com') || targetUrl.includes('fbcdn.net') || source === 'instagram';

    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: '*/*',
    };

    const isTeraBox =
      targetUrl.includes('terabox') ||
      targetUrl.includes('1024tera') ||
      targetUrl.includes('baidupcs') ||
      targetUrl.includes('nephobox') ||
      source === 'terabox';

    if (isInstagram) {
      upstreamHeaders['Referer'] = 'https://www.instagram.com/';
      upstreamHeaders['Origin'] = 'https://www.instagram.com';
      upstreamHeaders['Sec-Fetch-Dest'] = isImageTarget ? 'image' : 'video';
      upstreamHeaders['Sec-Fetch-Mode'] = 'cors';
      upstreamHeaders['Sec-Fetch-Site'] = 'cross-site';
    } else if (isTeraBox) {
      upstreamHeaders['Referer'] = 'https://www.terabox.app/';
      upstreamHeaders['Origin'] = 'https://www.terabox.app';
      if (process.env.TERABOX_COOKIE) {
        upstreamHeaders['Cookie'] = process.env.TERABOX_COOKIE.includes('ndus=')
          ? process.env.TERABOX_COOKIE
          : `ndus=${process.env.TERABOX_COOKIE}`;
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
    const contentType = mimeMap[finalExt] || 'video/mp4';

    // 1. If client asked for a specific Range (seeking/resumption)
    if (req.headers && req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
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
        if (contentRange) res.setHeader('Content-Range', contentRange);
      }

      const contentLength = upstreamResponse.headers.get('content-length');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      if (upstreamResponse.body) {
        // @ts-ignore
        const nodeStream = Readable.fromWeb(upstreamResponse.body);
        safePipe(nodeStream, res);
      } else {
        res.end();
      }
      return;
    }

    // 2. Probe for Range support & total Content-Length
    let totalLength = 0;
    let supportsRange = false;

    try {
      const probeRes = await fetch(targetUrl, {
        method: 'GET',
        headers: { ...upstreamHeaders, Range: 'bytes=0-0' },
      });
      if (probeRes.status === 206) {
        supportsRange = true;
        const cr = probeRes.headers.get('content-range');
        if (cr) {
          const parts = cr.split('/');
          if (parts[1]) totalLength = parseInt(parts[1], 10) || 0;
        }
      }
    } catch {}

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (req.method === 'HEAD') {
      if (totalLength > 0) res.setHeader('Content-Length', totalLength);
      res.end();
      return;
    }

    // 3. Multi-Chunk High-Speed Streaming for large files (> 4MB) with range support
    if (supportsRange && totalLength > 4 * 1024 * 1024 && !isImageTarget) {
      res.setHeader('Content-Length', totalLength);
      await streamParallelChunks(targetUrl, totalLength, res, upstreamHeaders, 5, 4 * 1024 * 1024);
      return;
    }

    // 4. Standard sequential streaming fallback
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

    const cl = upstreamResponse.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);

    if (upstreamResponse.body) {
      // @ts-ignore
      const nodeStream = Readable.fromWeb(upstreamResponse.body);
      safePipe(nodeStream, res);
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
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .trim() || 'media';

  const baseName = cleanFilename.replace(/\.(mp4|mp3|m4a|webm|mkv|jpg|jpeg|png|webp)$/i, '');
  const isImageTarget =
    targetUrl.includes('.jpg') ||
    targetUrl.includes('dst-jpg') ||
    targetUrl.includes('.png') ||
    requestedExt === 'jpg' ||
    requestedExt === 'jpeg' ||
    requestedExt === 'png';
  const finalExt =
    requestedExt ||
    (targetUrl.includes('mime=audio') || targetUrl.includes('audio') ? 'mp3' : isImageTarget ? 'jpg' : 'mp4');
  const downloadName = `${baseName}.${finalExt}`;

  // 1. FAST ACCELERATION FOR YOUTUBE (Bypasses single-thread CDN throttle using 16 concurrent fragments)
  const isYouTubeUrl = targetUrl.includes('googlevideo.com') || targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be');
  if (isYouTubeUrl && !isImageTarget) {
    try {
      const parsedUrl = new URL(targetUrl);
      const vItag = parsedUrl.searchParams.get('itag');
      let videoId = '';

      if (targetUrl.includes('v=')) {
        videoId = parsedUrl.searchParams.get('v') || '';
      } else if (targetUrl.includes('youtu.be/')) {
        const parts = parsedUrl.pathname.split('/');
        videoId = parts[parts.length - 1];
      }

      // If URL is a direct googlevideo playback URL, extract videoId from query, filename, or referer
      if (!videoId) {
        const directMatch = cleanFilename.match(/([a-zA-Z0-9_-]{11})_(?:\d+p|\d+|audio|video)/);
        if (directMatch) {
          videoId = directMatch[1];
        } else {
          // Check query parameters (v or video_id)
          videoId = (req.query?.v || req.query?.video_id || req.query?.yt_id || '') as string;
        }
      }

      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        let fmtSpec = 'best';
        let aItag = '';
        if (targetAudioUrl) {
          try {
            const parsedAudio = new URL(targetAudioUrl);
            aItag = parsedAudio.searchParams.get('itag') || '';
          } catch {}
        }

        if (finalExt === 'mp3' || requestedExt === 'mp3') {
          fmtSpec = aItag ? `${aItag}/140/bestaudio` : '140/bestaudio';
        } else if (vItag && aItag) {
          fmtSpec = `${vItag}+${aItag}/${vItag}+bestaudio/best`;
        } else if (vItag) {
          fmtSpec = `${vItag}+140/${vItag}+bestaudio/best`;
        } else {
          fmtSpec = 'bestvideo+bestaudio/best';
        }

        // Check if pre-cached file already exists in MEDIA_CACHE_DIR
        const candidateFiles = [
          path.join(MEDIA_CACHE_DIR, `${videoId}_${vItag}+${aItag}.${finalExt}`),
          path.join(MEDIA_CACHE_DIR, `${videoId}_${vItag}+140.${finalExt}`),
          path.join(MEDIA_CACHE_DIR, `${videoId}_${vItag}.${finalExt}`),
          path.join(MEDIA_CACHE_DIR, `${videoId}_${aItag || '140'}.${finalExt}`),
        ];

        let existingFile: string | null = null;
        for (const cf of candidateFiles) {
          if (fs.existsSync(cf)) {
            try {
              if (fs.statSync(cf).size > 1024 * 1024) {
                existingFile = cf;
                break;
              }
            } catch {}
          }
        }

        if (!existingFile) {
          // Check any file in MEDIA_CACHE_DIR matching videoId and finalExt with size > 1MB
          try {
            const files = fs.readdirSync(MEDIA_CACHE_DIR);
            for (const f of files) {
              if (f.startsWith(videoId) && f.endsWith(`.${finalExt}`)) {
                const fp = path.join(MEDIA_CACHE_DIR, f);
                if (fs.statSync(fp).size > 1024 * 1024) {
                  existingFile = fp;
                  break;
                }
              }
            }
          } catch {}
        }

        let readyFile = existingFile;
        let readySize = readyFile ? fs.statSync(readyFile).size : 0;

        if (!readyFile) {
          const dlResult = await runAcceleratedYtdl(
            `https://www.youtube.com/watch?v=${videoId}`,
            fmtSpec,
            finalExt
          );
          if (dlResult && dlResult.filePath && fs.existsSync(dlResult.filePath)) {
            readyFile = dlResult.filePath;
            readySize = dlResult.size;
          }
        }

        if (readyFile && fs.existsSync(readyFile)) {
          const contentType = finalExt === 'mp3' ? 'audio/mpeg' : 'video/mp4';
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', readySize);
          res.setHeader('Cache-Control', 'public, max-age=3600');

          if (req.method === 'HEAD') {
            res.end();
            return;
          }

          const fileStream = fs.createReadStream(readyFile);
          safePipe(fileStream, res);
          return;
        }

        // If accelerated download could not produce file, return explicit error instead of 403 redirect
        res.status(502).json({
          success: false,
          error: 'YouTube accelerated download worker failed to produce media stream. Please retry.',
        });
        return;
      }
    } catch (ytdlErr: any) {
      console.warn('[StreamDownload] Accelerated worker notice:', ytdlErr?.message);
    }
  }

  // 2. MUXING PIPELINE: If audio_url is specified, stitch video + audio tracks together with FFmpeg
  if (targetAudioUrl && targetAudioUrl.startsWith('http') && !isImageTarget) {
    if (req.method === 'HEAD') {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.end();
      return;
    }

    // Remote Resolver (Render / Railway) if configured
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
          safePipe(nodeStream, res);
          return;
        }
      } catch (remoteErr: any) {
        console.warn('[StreamDownload] Remote mux worker notice:', remoteErr?.message);
      }
    }

    // Local FFmpeg (imageio-ffmpeg / system ffmpeg)
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
          safePipe(proc.stdout, res);
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

    // Graceful fallback if neither local nor remote FFmpeg is ready
    await streamDirectFallback(targetUrl, req, res, downloadName, finalExt, isImageTarget, source as string);
    return;
  }

  // 3. SINGLE STREAM PIPELINE: Direct video/audio/image proxy stream with multi-chunk acceleration
  await streamDirectFallback(targetUrl, req, res, downloadName, finalExt, isImageTarget, source as string);
}
