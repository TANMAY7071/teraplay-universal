/**
 * Client-Side Media Remuxer & Downloader (Cobalt-Matched v2.1)
 * Offloads 100% of video/audio multiplexing to the user's browser WebAssembly.
 *
 * Features:
 * 1. Adaptive 1080p/4K/8K Video + Audio Remuxing (-c copy in ~2s)
 * 2. Dumb Byte-Tunnel fallback when CDN blocks browser CORS / IP-locks stream
 * 3. Embedded Album Art & Cover Artwork for MP3 / Audio
 * 4. Subtitle (.vtt / .srt) Packaging into MP4 Containers
 * 5. Rich ID3 Metadata Tags (Artist, Track Title, Album)
 */

export interface RemuxOptions {
  videoUrl?: string;
  audioUrl?: string;
  subtitleUrl?: string;
  thumbnailUrl?: string;
  filename: string;
  ext?: string;
  title?: string;
  artist?: string;
  album?: string;
  onProgress?: (percent: number, statusText: string) => void;
}

const RENDER_TUNNEL_BASE = 'https://linkcastle.onrender.com/stream-download';

let ffmpegInstance: any = null;

async function loadFFmpegCore(): Promise<any> {
  if (ffmpegInstance) return ffmpegInstance;

  const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  return new Promise((resolve, reject) => {
    const initFFmpeg = async () => {
      try {
        const { FFmpeg } = (window as any).FFmpegWASM || {};
        if (!FFmpeg) {
          throw new Error('FFmpeg failed to initialize from window object');
        }
        ffmpegInstance = new FFmpeg();
        await ffmpegInstance.load({
          coreURL: `${CORE_BASE}/ffmpeg-core.js`,
          wasmURL: `${CORE_BASE}/ffmpeg-core.wasm`,
        });
        resolve(ffmpegInstance);
      } catch (err) {
        reject(err);
      }
    };

    if ((window as any).FFmpegWASM) {
      initFFmpeg();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js';
    script.async = true;
    script.onload = () => {
      initFFmpeg();
    };
    script.onerror = () => reject(new Error('Failed to load WebAssembly FFmpeg library'));
    document.head.appendChild(script);
  });
}

/**
 * Fetch raw media bytes directly from CDN, or via Render byte-tunnel if CORS/IP-locked.
 */
async function fetchMediaBytes(url: string): Promise<ArrayBuffer> {
  try {
    const directRes = await fetch(url);
    if (directRes.ok) {
      return await directRes.arrayBuffer();
    }
  } catch {
    // CORS or IP-lock on googlevideo.com; fall through to dumb byte-tunnel
  }
  const tunnelRes = await fetch(`${RENDER_TUNNEL_BASE}?url=${encodeURIComponent(url)}`);
  if (!tunnelRes.ok) {
    throw new Error(`Tunnel fetch failed with HTTP ${tunnelRes.status}`);
  }
  return await tunnelRes.arrayBuffer();
}

/**
 * Downloads media on user device with WASM remuxing, subtitles & cover art.
 */
export async function downloadMediaClientSide({
  videoUrl,
  audioUrl,
  subtitleUrl,
  thumbnailUrl,
  filename,
  ext = 'mp4',
  title = '',
  artist = '',
  album = '',
  onProgress
}: RemuxOptions): Promise<void> {
  const cleanName = filename.replace(/[^a-zA-Z0-9_.\- ]/g, '').trim() || 'video';
  const finalFilename = cleanName.toLowerCase().endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;

  const triggerTunnelFallback = () => {
    const fallbackUrl = `${RENDER_TUNNEL_BASE}?url=${encodeURIComponent(videoUrl || audioUrl || '')}${
      audioUrl && videoUrl ? `&audio_url=${encodeURIComponent(audioUrl)}` : ''
    }&filename=${encodeURIComponent(cleanName)}&ext=${ext}`;
    const a = document.createElement('a');
    a.href = fallbackUrl;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isHls = (u?: string) => Boolean(
    u && (u.includes('.m3u8') || u.includes('/manifest/hls/') || u.includes('manifest.googlevideo.com'))
  );

  // HLS (.m3u8 or manifest) cannot be written as raw video.mp4 into WASM
  if (isHls(videoUrl) || isHls(audioUrl)) {
    onProgress?.(50, 'Converting stream to MP4 via server engine...');
    triggerTunnelFallback();
    return;
  }

  // 1. Direct Progressive download if no remuxing needed AND safe CDN (not google/hls/ip-locked)
  const isCdnRestricted = (u?: string) => Boolean(
    u && (u.includes('googlevideo.com') || u.includes('youtube.com'))
  );

  if (videoUrl && !audioUrl && !subtitleUrl && !isCdnRestricted(videoUrl)) {
    onProgress?.(100, 'Starting direct CDN download...');
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = finalFilename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 2. Client-Side WASM Remux
  try {
    onProgress?.(10, 'Initializing WebAssembly engine...');
    const ffmpeg = await loadFFmpegCore();

    onProgress?.(25, 'Downloading streams directly to browser memory...');

    const fetchTasks: Promise<ArrayBuffer>[] = [];
    let videoIndex = -1;
    let audioIndex = -1;
    let subIndex = -1;
    let thumbIndex = -1;

    if (videoUrl) {
      videoIndex = fetchTasks.length;
      fetchTasks.push(fetchMediaBytes(videoUrl));
    }
    if (audioUrl) {
      audioIndex = fetchTasks.length;
      fetchTasks.push(fetchMediaBytes(audioUrl));
    }
    if (subtitleUrl) {
      subIndex = fetchTasks.length;
      fetchTasks.push(fetchMediaBytes(subtitleUrl));
    }
    if (thumbnailUrl && ext === 'mp3') {
      thumbIndex = fetchTasks.length;
      fetchTasks.push(fetch(thumbnailUrl).then((r) => {
        if (!r.ok) throw new Error('Thumbnail fetch failed');
        return r.arrayBuffer();
      }));
    }

    const buffers = await Promise.all(fetchTasks);

    onProgress?.(65, 'Writing virtual assets into browser sandbox...');
    const args: string[] = [];

    if (videoIndex >= 0) {
      await ffmpeg.writeFile('input_v.mp4', new Uint8Array(buffers[videoIndex]));
      args.push('-i', 'input_v.mp4');
    }
    if (audioIndex >= 0) {
      await ffmpeg.writeFile('input_a.mp4', new Uint8Array(buffers[audioIndex]));
      args.push('-i', 'input_a.mp4');
    }
    if (subIndex >= 0) {
      await ffmpeg.writeFile('input_s.vtt', new Uint8Array(buffers[subIndex]));
      args.push('-i', 'input_s.vtt');
    }
    if (thumbIndex >= 0) {
      await ffmpeg.writeFile('cover.jpg', new Uint8Array(buffers[thumbIndex]));
      args.push('-i', 'cover.jpg');
    }

    onProgress?.(80, 'Remuxing tracks & metadata (0% server load)...');

    // Case A: Audio Only with Cover Art and ID3 Tags
    if (!videoUrl && audioUrl) {
      if (thumbIndex >= 0) {
        args.push(
          '-map', '0:a:0',
          '-map', '1:v:0',
          '-c:a', ext === 'mp3' ? 'libmp3lame' : 'copy',
          '-c:v', 'copy',
          '-id3v2_version', '3',
          '-metadata:s:v', 'title="Album cover"',
          '-metadata:s:v', 'comment="Cover (front)"'
        );
      } else {
        args.push('-vn', '-c:a', ext === 'mp3' ? 'libmp3lame' : 'copy');
      }
    }
    // Case B: Video + Audio (+ optional Subtitles)
    else if (videoUrl && audioUrl) {
      args.push('-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac');
      if (subIndex >= 0) {
        args.push('-c:s', 'mov_text');
      }
      args.push('-shortest');
    }

    // Add ID3 / MP4 Metadata tags
    if (title) args.push('-metadata', `title=${title}`);
    if (artist) args.push('-metadata', `artist=${artist}`);
    if (album) args.push('-metadata', `album=${album}`);

    const outputName = `output.${ext}`;
    args.push(outputName);

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    const mime = ext === 'mp3' ? 'audio/mpeg' : (ext === 'm4a' ? 'audio/mp4' : 'video/mp4');
    const blob = new Blob([data], { type: mime });
    const downloadUrl = URL.createObjectURL(blob);

    onProgress?.(100, 'Saving file to Downloads folder...');
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);

  } catch (err) {
    console.warn('[WasmRemux] Client remuxing fell back to stream proxy:', err);
    onProgress?.(50, 'Routing through fallback stream proxy...');
    triggerTunnelFallback();
  }
}
