export type VideoProvider = 'youtube' | 'dailymotion' | 'bilibili' | 'vimeo' | 'direct' | 'embed' | 'unknown';

export interface ParsedVideo {
  provider: VideoProvider;
  embedUrl: string;
  originalUrl: string;
  isEmbeddable: boolean;
}

/**
 * Universal video parser supporting:
 * - YouTube (watch, embed, shorts, youtu.be, raw 11-char ID)
 * - Dailymotion (dailymotion.com/video/ID, dai.ly/ID, embed links)
 * - Bilibili (BVxxx, avxxx)
 * - Vimeo (vimeo.com/ID)
 * - Direct Video Files (.mp4, .webm, .m3u8)
 * - Raw embed links
 */
export function parseVideoUrl(url?: string, options: { autoplay?: boolean; muted?: boolean } = {}): ParsedVideo {
  if (!url || typeof url !== 'string') {
    return { provider: 'unknown', embedUrl: '', originalUrl: '', isEmbeddable: false };
  }

  const cleanUrl = url.trim();
  const autoplayParam = options.autoplay !== false ? '1' : '0';
  const muteParam = options.muted ? '1' : '0';

  // 1. YouTube
  if (cleanUrl.length === 11 && !cleanUrl.includes('/') && !cleanUrl.includes('?')) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${cleanUrl}?autoplay=${autoplayParam}&rel=0&modestbranding=1`,
      originalUrl: cleanUrl,
      isEmbeddable: true,
    };
  }

  const ytMatch = cleanUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  if (ytMatch && ytMatch[2].length === 11) {
    const videoId = ytMatch[2];
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=${autoplayParam}&rel=0&modestbranding=1`,
      originalUrl: cleanUrl,
      isEmbeddable: true,
    };
  }

  // 2. Dailymotion
  const dmMatch = cleanUrl.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/);
  if (dmMatch && dmMatch[1]) {
    const videoId = dmMatch[1];
    return {
      provider: 'dailymotion',
      embedUrl: `https://www.dailymotion.com/embed/video/${videoId}?autoplay=${autoplayParam}&mute=${muteParam}`,
      originalUrl: cleanUrl,
      isEmbeddable: true,
    };
  }

  // 3. Bilibili
  const biliMatch = cleanUrl.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+|av\d+)/i);
  if (biliMatch && biliMatch[1]) {
    const biliId = biliMatch[1];
    const bvidParam = biliId.startsWith('BV') ? `bvid=${biliId}` : `aid=${biliId.replace('av', '')}`;
    return {
      provider: 'bilibili',
      embedUrl: `https://player.bilibili.com/player.html?${bvidParam}&page=1&high_quality=1&danmaku=0&autoplay=${autoplayParam}`,
      originalUrl: cleanUrl,
      isEmbeddable: true,
    };
  }

  // 4. Vimeo
  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=${autoplayParam}`,
      originalUrl: cleanUrl,
      isEmbeddable: true,
    };
  }

  // 5. Direct Video File (.mp4, .webm, .m3u8, etc.)
  if (/\.(mp4|webm|m3u8|ogg)(\?.*)?$/i.test(cleanUrl) || cleanUrl.includes('.mp4') || cleanUrl.includes('.webm')) {
    return {
      provider: 'direct',
      embedUrl: cleanUrl,
      originalUrl: cleanUrl,
      isEmbeddable: true,
    };
  }

  // 6. Generic Embed URL
  if (cleanUrl.includes('/embed/') || cleanUrl.includes('player.')) {
    return {
      provider: 'embed',
      embedUrl: cleanUrl,
      originalUrl: cleanUrl,
      isEmbeddable: true,
    };
  }

  // 7. Generic URL fallback
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return {
      provider: 'unknown',
      embedUrl: cleanUrl,
      originalUrl: cleanUrl,
      isEmbeddable: true,
    };
  }

  return {
    provider: 'unknown',
    embedUrl: '',
    originalUrl: cleanUrl,
    isEmbeddable: false,
  };
}
