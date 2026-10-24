/**
 * TeraBox & Universal Link Normalizer
 * Detects 17+ TeraBox mirrors and extracts standard share IDs and direct URLs.
 */

export type SupportedPlatform =
  | 'youtube'
  | 'terabox'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'bilibili'
  | 'dailymotion'
  | 'snapchat'
  | 'linkedin'
  | 'twitch'
  | 'twitter'
  | 'vimeo'
  | 'direct'
  | 'universal'
  | 'whatsapp'
  | 'unknown';

export interface NormalizedLinkResult {
  isValid: boolean;
  platform: SupportedPlatform;
  shareId?: string;
  normalizedUrl: string;
  originalUrl: string;
  error?: string;
}

const TERABOX_DOMAINS = [
  'terabox.com',
  'www.terabox.com',
  'terabox.app',
  '1024tera.com',
  '1024terabox.com',
  'nephobox.com',
  'freeterabox.com',
  'teraboxlink.com',
  'terasharelink.com',
  'mirrobox.com',
  'momerybox.com',
  'tibibox.com',
  '4funbox.com',
  'terabox.fun',
  'terafileshare.com',
  'teraboxclub.com',
  'boxterabox.com',
];

export function isTeraBoxUrl(url: string): boolean {
  if (!url) return false;
  try {
    const raw = url.trim();
    const parsed = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return TERABOX_DOMAINS.some((domain) => host === domain || host.endsWith('.' + domain));
  } catch {
    return false;
  }
}

export function extractTeraBoxShareId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  // Pattern 1: /s/1[a-zA-Z0-9_-]+
  const slashMatch = clean.match(/\/s\/(?:1)?([a-zA-Z0-9_-]+)/i);
  if (slashMatch && slashMatch[1]) {
    return slashMatch[1];
  }

  // Pattern 2: ?surl=[a-zA-Z0-9_-]+
  const surlMatch = clean.match(/[?&]surl=([a-zA-Z0-9_-]+)/i);
  if (surlMatch && surlMatch[1]) {
    return surlMatch[1];
  }

  // Pattern 3: direct share ID passed
  if (/^[a-zA-Z0-9_-]{10,40}$/.test(clean)) {
    return clean;
  }

  return null;
}

export interface InstagramMediaInfo {
  type: 'reel' | 'p' | 'tv' | 'stories';
  shortcode: string;
}

export function extractInstagramShortcode(url: string): InstagramMediaInfo | null {
  if (!url) return null;
  const regex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reels?|p|tv|stories)\/([A-Za-z0-9_-]+)/i;
  const match = url.trim().match(regex);
  if (!match) return null;
  const rawType = match[1].toLowerCase();
  return {
    type: (rawType.startsWith('reel') ? 'reel' : rawType) as 'reel' | 'p' | 'tv' | 'stories',
    shortcode: match[2],
  };
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  const match = clean.match(/(?:youtu\.be\/|(?:youtube\.com|youtube-nocookie\.com)\/(?:embed\/|v\/|watch\?(?:.*&)?v=|shorts\/|live\/))([\w-]{11})/i);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  return null;
}

export function normalizeMediaUrl(inputUrl: string): NormalizedLinkResult {
  const trimmed = inputUrl ? inputUrl.trim() : '';
  if (!trimmed) {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: '',
      originalUrl: trimmed,
      error: 'Please enter a valid link.',
    };
  }

  // Check TeraBox
  if (isTeraBoxUrl(trimmed) || /^[a-zA-Z0-9_-]{15,40}$/.test(trimmed)) {
    const shareId = extractTeraBoxShareId(trimmed);
    if (!shareId) {
      return {
        isValid: false,
        platform: 'terabox',
        normalizedUrl: trimmed,
        originalUrl: trimmed,
        error: 'Invalid TeraBox share link or missing share ID.',
      };
    }

    // Standardize to clean canonical share URL
    const canonical = 'https://www.1024tera.com/sharing/link?surl=' + shareId;
    return {
      isValid: true,
      platform: 'terabox',
      shareId,
      normalizedUrl: canonical,
      originalUrl: trimmed,
    };
  }

  // Direct MP4 / M3U8 stream
  if (/\.(mp4|m3u8|webm|ogg)(\?.*)?$/i.test(trimmed)) {
    return {
      isValid: true,
      platform: 'direct',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  // YouTube Link
  const ytId = extractYouTubeVideoId(trimmed);
  const isYtDomain = /(?:youtube\.com|youtube-nocookie\.com|youtu\.be)/i.test(trimmed);
  if (ytId || isYtDomain) {
    if (!ytId) {
      return {
        isValid: false,
        platform: 'youtube',
        normalizedUrl: trimmed,
        originalUrl: trimmed,
        error: 'Please enter a valid YouTube video or Shorts link containing an 11-character video ID.',
      };
    }
    return {
      isValid: true,
      platform: 'youtube',
      shareId: ytId,
      normalizedUrl: `https://www.youtube.com/watch?v=${ytId}`,
      originalUrl: trimmed,
    };
  }

  // Instagram Link
  if (trimmed.includes('instagram.com') || trimmed.includes('instagr.am')) {
    const igInfo = extractInstagramShortcode(trimmed);
    const shortcode = igInfo ? igInfo.shortcode : undefined;
    const pathType = igInfo?.type === 'reel' ? 'reel' : 'p';
    return {
      isValid: true,
      platform: 'instagram',
      shareId: shortcode,
      normalizedUrl: shortcode ? `https://www.instagram.com/${pathType}/${shortcode}/` : trimmed,
      originalUrl: trimmed,
    };
  }

  // Facebook Link
  if (trimmed.includes('facebook.com') || trimmed.includes('fb.watch') || trimmed.includes('fb.com')) {
    return {
      isValid: true,
      platform: 'facebook',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  // WhatsApp Link (Chat media is E2EE and cannot be extracted from web)
  if (trimmed.includes('whatsapp.com') || trimmed.includes('wa.me') || trimmed.includes('wa.link')) {
    return {
      isValid: false,
      platform: 'whatsapp',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
      error: 'WhatsApp chat media is end-to-end encrypted. Copy and paste the original video link (YouTube, Instagram, TikTok) shared in your chat.',
    };
  }

  // TikTok Link
  if (trimmed.includes('tiktok.com')) {
    return {
      isValid: true,
      platform: 'tiktok',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  // Bilibili Link
  if (trimmed.includes('bilibili.com') || trimmed.includes('b23.tv')) {
    return {
      isValid: true,
      platform: 'bilibili',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  // Dailymotion Link
  if (trimmed.includes('dailymotion.com') || trimmed.includes('dai.ly')) {
    return {
      isValid: true,
      platform: 'dailymotion',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  // Snapchat Link
  if (trimmed.includes('snapchat.com')) {
    return {
      isValid: true,
      platform: 'snapchat',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  // LinkedIn Link
  if (trimmed.includes('linkedin.com')) {
    return {
      isValid: true,
      platform: 'linkedin',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  // Twitter / X Link
  if (trimmed.includes('twitter.com') || trimmed.includes('x.com')) {
    return {
      isValid: true,
      platform: 'twitter',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  // Vimeo Link
  if (trimmed.includes('vimeo.com')) {
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^/]*\/videos\/|album\/(?:\d+\/)?video\/|video\/|)(\d+)/i);
    const vimeoId = vimeoMatch ? vimeoMatch[1] : undefined;
    return {
      isValid: true,
      platform: 'vimeo',
      shareId: vimeoId,
      normalizedUrl: vimeoId ? `https://vimeo.com/${vimeoId}` : trimmed,
      originalUrl: trimmed,
    };
  }

  // Twitch Link (streams, clips, VODs)
  if (trimmed.includes('twitch.tv')) {
    return {
      isValid: true,
      platform: 'twitch',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  // Universal HTTP/HTTPS Link validation
  try {
    const rawUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(rawUrl);
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.')) {
      return {
        isValid: true,
        platform: 'universal',
        normalizedUrl: parsed.href,
        originalUrl: trimmed,
      };
    }
  } catch {
    // Fall-through if not a parsable web URL
  }

  return {
    isValid: false,
    platform: 'universal',
    normalizedUrl: trimmed,
    originalUrl: trimmed,
    error: 'Please enter a valid video link or streaming URL.',
  };
}
