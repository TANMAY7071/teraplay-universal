/**
 * TeraBox & Universal Link Normalizer
 * Detects 17+ TeraBox mirrors and extracts standard share IDs and direct URLs.
 */

export type SupportedPlatform = 'terabox' | 'youtube' | 'facebook' | 'whatsapp' | 'instagram' | 'direct' | 'unknown';

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
  const regex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv|stories)\/([A-Za-z0-9_-]+)/i;
  const match = url.trim().match(regex);
  if (!match) return null;
  return {
    type: match[1].toLowerCase() as 'reel' | 'p' | 'tv' | 'stories',
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
    return {
      isValid: true,
      platform: 'instagram',
      shareId: shortcode,
      normalizedUrl: shortcode ? `https://www.instagram.com/reel/${shortcode}/` : trimmed,
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

  // WhatsApp Link
  if (trimmed.includes('whatsapp.com') || trimmed.includes('wa.me')) {
    return {
      isValid: true,
      platform: 'whatsapp',
      normalizedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  // Assume universal web link
  return {
    isValid: true,
    platform: 'unknown',
    normalizedUrl: trimmed,
    originalUrl: trimmed,
  };
}
