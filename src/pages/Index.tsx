import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Play,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Sparkles,
  Clipboard,
  Film,
  RefreshCw,
  Clock,
  Lock,
  Globe,
  Share2,
  FileText,
  Image as ImageIcon,
  Subtitles,
  Search,
  ExternalLink,
  Code,
  SlidersHorizontal,
  Info,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Music,
  Video,
  Volume2,
  VolumeX,
  RotateCcw,
  MonitorPlay,
  Captions,
  Images,
  PlayCircle,
  ArrowDownToLine,
  Coffee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CustomVideoPlayer } from '@/components/video/CustomVideoPlayer';
import { normalizeMediaUrl, extractYouTubeVideoId, isTeraBoxUrl } from '@/lib/urlNormalizer';
import { getSeoConfigForPath } from '@/data/seoRoutes';
import { canonicalUrl, HERO_HEADLINE_LINE_1, HERO_HEADLINE_LINE_2, HERO_SUBHEADLINE } from '@/config/site';
import { useAuth } from '@/contexts/AuthContext';
import AdBannerSlot from '@/components/ads/AdBannerSlot';
import { ThemeChanger } from '@/components/ThemeChanger';
import { IconFolder, PLATFORM_ICONS } from '@/components/ui/icon-folder';
import './VideoPlayer21st.css';

import {
  type TranscriptItem,
  type TranscriptData,
  FALLBACK_DEMO_TRANSCRIPT,
  formatTime,
  formatSrtTimestamp,
  generateSrtContent,
  generateTxtContent,
} from '@/lib/transcription';

export type { TranscriptItem, TranscriptData };

export interface MediaFormatOption {
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
}

export interface ThumbnailItem {
  url: string;
  width?: number;
  height?: number;
  resolution?: string;
  quality_label?: string;
}

export interface ResolvedMedia {
  title: string;
  thumbnail: string;
  thumbnails?: ThumbnailItem[];
  m3u8_url: string;
  embed_url?: string;
  fast_download_url: string;
  size: string;
  duration?: number;
  shareId: string;
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
  formats?: MediaFormatOption[];
  video_formats?: MediaFormatOption[];
  audio_formats?: MediaFormatOption[];
  media_type?: 'video' | 'carousel' | 'image';
  is_vertical?: boolean;
  aspect_ratio?: string;
  is_mock?: boolean;
}

const GUEST_MAX_PLAYS = 5;

function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// RESOLUTION & ASPECT RATIO HELPERS
// ==========================================
function getStandardResTier(height?: number, fallbackLabel?: string): string {
  if (!height || height <= 0) return fallbackLabel || 'MP4 Video';
  if (height >= 2000) return '4K Ultra HD';
  if (height >= 1300) return '1440p 2K QHD';
  if (height >= 950) return '1080p Full HD';
  if (height >= 650) return '720p HD';
  if (height >= 430) return '480p SD';
  if (height >= 300) return '360p Standard';
  if (height >= 200) return '240p';
  if (height >= 120) return '144p';
  return `${height}p`;
}

function getShortResTag(height?: number): string {
  if (!height || height <= 0) return 'MP4';
  if (height >= 2000) return '4K';
  if (height >= 1300) return '1440p 2K';
  if (height >= 950) return '1080p';
  if (height >= 650) return '720p';
  if (height >= 430) return '480p';
  if (height >= 300) return '360p';
  return `${height}p`;
}

function isCinemaWidescreen(height?: number): boolean {
  if (!height) return false;
  return [1350, 1012, 800, 676, 536, 450, 338].includes(height) || (height > 0 && ![2160, 1440, 1080, 720, 480, 360, 240, 144].includes(height));
}

function getFormatDisplayTier(fmt: MediaFormatOption): string {
  if (fmt.is_audio_only) return fmt.quality || 'Audio MP3';
  const qLower = (fmt.quality || '').toLowerCase();
  const isWm = fmt.format_id === 'watermark' || qLower.includes('with watermark');
  const isNoWm = fmt.format_id?.includes('no_watermark') || qLower.includes('no watermark');
  const baseRes = getStandardResTier(fmt.height, fmt.quality);
  if (isWm) return `${baseRes} (With Watermark)`;
  if (isNoWm) return `${baseRes} (No Watermark)`;
  return baseRes;
}

function getFormatDisplayDescription(fmt: MediaFormatOption): string {
  if (fmt.is_audio_only) {
    return fmt.format_id.startsWith('mp3') ? 'LAME High-Fi MP3 Track' : 'Original Master AAC Track';
  }
  const qLower = (fmt.quality || '').toLowerCase();
  if (fmt.format_id === 'watermark' || qLower.includes('with watermark')) {
    return 'Official video with TikTok watermark and creator stamp';
  }
  if (fmt.format_id?.includes('no_watermark') || qLower.includes('no watermark')) {
    return 'Clean video export, direct single file MP4 without watermark';
  }
  if (isCinemaWidescreen(fmt.height)) {
    return `Cinema Ultrawide (${fmt.height}p), Direct Stream`;
  }
  if (fmt.has_audio) {
    return fmt.can_mux || fmt.audio_url
      ? `${getShortResTag(fmt.height)} MP4 with combined audio`
      : 'Single file direct MP4 video';
  }
  return 'High-res video stream (no audio track attached by host)';
}



// ==========================================
// FAQ ACCORDION SUBCOMPONENT (ISOLATED STATE)
// ==========================================
interface FaqItemData {
  question: string;
  answer: string;
}

const FaqAccordionSection = React.memo(({ faqs }: { faqs: FaqItemData[] }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="tp-faq-sec">
      <h2 className="tp-sec-title">Frequently Asked Questions</h2>
      <p className="tp-sec-intro">Everything you need to know about multi-platform playback, downloads, YouTube transcripts, and TeraBox streaming.</p>

      <div className="tp-faq-list">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="tp-faq-item" data-open={isOpen ? 'true' : 'false'}>
              <button
                type="button"
                className="tp-faq-btn"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
              >
                <span>{faq.question}</span>
                <span className="tp-faq-icon" aria-hidden="true" />
              </button>

              <div className="tp-faq-ans">
                <div className="tp-faq-inner">
                  <p>{faq.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

export type PlatformChip =
  | 'YouTube'
  | 'TeraBox'
  | 'Direct'
  | 'Facebook'
  | 'Instagram'
  | 'TikTok'
  | 'Bilibili'
  | 'Dailymotion'
  | 'Snapchat'
  | 'LinkedIn'
  | 'Twitch'
  | 'Vimeo'
  | 'Universal';

// ==========================================
// MAIN UNIVERSAL DOCK COMPONENT
// ==========================================
export default function Index() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signInWithGoogle, signOut } = useAuth();
  const seo = useMemo(() => getSeoConfigForPath(location.pathname), [location.pathname]);
  // Canonical comes from the route path, never from window.location.href, so a
  // campaign URL and the clean URL are one page.
  const canonicalPath = useMemo(() => canonicalUrl(location.pathname), [location.pathname]);

  const [inputUrl, setInputUrl] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedVideo, setResolvedVideo] = useState<ResolvedMedia | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [guestPlays, setGuestPlays] = useState<number>(0);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [activeChip, setActiveChip] = useState<PlatformChip>('YouTube');
  const [resolveError, setResolveError] = useState<{ title: string; message: string; platform?: string } | null>(null);

  // Studio Mode Tabs: 'downloads' | 'transcript' | 'thumbnails' | 'player'
  const [youtubeTab, setYoutubeTab] = useState<'downloads' | 'transcript' | 'thumbnails' | 'player'>('downloads');
  const [downloadFormatTab, setDownloadFormatTab] = useState<'video' | 'audio'>('video');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isQuickDropdownOpen, setIsQuickDropdownOpen] = useState(false);
  const quickDropdownRef = useRef<HTMLDivElement>(null);
  const [isAudioDropdownOpen, setIsAudioDropdownOpen] = useState(false);
  const audioDropdownRef = useRef<HTMLDivElement>(null);
  const [isCoverDropdownOpen, setIsCoverDropdownOpen] = useState(false);
  const [selectedCoverTag, setSelectedCoverTag] = useState<string>('1080p');
  const [thumbnailSubTab, setThumbnailSubTab] = useState<'cover' | 'scenes'>('cover');
  const coverDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (quickDropdownRef.current && !quickDropdownRef.current.contains(e.target as Node)) {
        setIsQuickDropdownOpen(false);
      }
      if (audioDropdownRef.current && !audioDropdownRef.current.contains(e.target as Node)) {
        setIsAudioDropdownOpen(false);
      }
      if (coverDropdownRef.current && !coverDropdownRef.current.contains(e.target as Node)) {
        setIsCoverDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeNotice, setTranscribeNotice] = useState<{ message: string; code?: string } | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('teraplay-theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('teraplay-theme', next);
        const root = document.documentElement;
        root.classList.toggle('dark', next === 'dark');
        root.classList.toggle('light', next === 'light');
        const meta = document.getElementById('meta-theme-color');
        if (meta) {
          meta.setAttribute('content', next === 'light' ? '#1253a8' : '#060b18');
        }
      }
      return next;
    });
  }, []);

  // Sync guest plays from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('teraplay_guest_plays');
      if (stored) {
        setGuestPlays(parseInt(stored, 10) || 0);
      }
    } catch (e) {
      void e;
    }
  }, []);

  // Auto-detect link platform when typing or pasting
  useEffect(() => {
    const raw = inputUrl.trim();
    if (!raw) return;

    const ytId = extractYouTubeVideoId(raw);
    if (ytId || raw.toLowerCase().includes('youtube.com') || raw.toLowerCase().includes('youtu.be')) {
      setActiveChip('YouTube');
      return;
    }

    if (isTeraBoxUrl(raw)) {
      setActiveChip('TeraBox');
      return;
    }

    const lower = raw.toLowerCase();
    if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
      setActiveChip('Instagram');
      return;
    }

    if (lower.includes('tiktok.com')) {
      setActiveChip('TikTok');
      return;
    }

    if (lower.includes('bilibili.com') || lower.includes('b23.tv')) {
      setActiveChip('Bilibili');
      return;
    }

    if (lower.includes('dailymotion.com') || lower.includes('dai.ly')) {
      setActiveChip('Dailymotion');
      return;
    }

    if (lower.includes('snapchat.com')) {
      setActiveChip('Snapchat');
      return;
    }

    if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com')) {
      setActiveChip('Facebook');
      return;
    }

    if (lower.includes('linkedin.com')) {
      setActiveChip('LinkedIn');
      return;
    }

    if (lower.includes('twitch.tv')) {
      setActiveChip('Twitch');
      return;
    }

    if (lower.includes('vimeo.com')) {
      setActiveChip('Vimeo');
      return;
    }

    if (/\.(mp4|m3u8|webm)(\?.*)?$/i.test(raw)) {
      setActiveChip('Direct');
      return;
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      setActiveChip('Universal');
    }
  }, [inputUrl]);

  const handlePlatformSelect = useCallback((chip: PlatformChip) => {
    setActiveChip(chip);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    urlInputRef.current?.focus();
  }, []);

  // Handle incoming ?platform= query parameter and SEO route pathnames
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const platformParam = params.get('platform');
    if (platformParam) {
      const pLower = platformParam.toLowerCase();
      const validChips: PlatformChip[] = [
        'YouTube', 'TeraBox', 'Direct', 'Facebook', 'Instagram',
        'TikTok', 'Bilibili', 'Dailymotion', 'Snapchat', 'LinkedIn',
        'Twitch', 'Vimeo', 'Universal'
      ];
      const match = validChips.find((c) => c.toLowerCase() === pLower);
      if (match) {
        setActiveChip(match);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      urlInputRef.current?.focus();
      return;
    }

    const path = location.pathname.toLowerCase();
    if (path.includes('terabox') || path.includes('nephobox')) {
      setActiveChip('TeraBox');
    } else if (path.includes('youtube')) {
      setActiveChip('YouTube');
      if (path.includes('transcript')) {
        setYoutubeTab('transcript');
      } else if (path.includes('thumbnail')) {
        setYoutubeTab('thumbnails');
      }
    }
  }, [location.search, location.pathname]);

  const incrementGuestPlays = useCallback(() => {
    if (user) return;
    const next = guestPlays + 1;
    setGuestPlays(next);
    try {
      localStorage.setItem('teraplay_guest_plays', next.toString());
    } catch (e) {
      void e;
    }
  }, [guestPlays, user]);

  const handlePasteClipboard = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
        toast.success('Link pasted from clipboard');
      } else {
        toast.error('Clipboard is empty');
      }
    } catch {
      toast.error('Clipboard access denied. Please paste manually.');
    }
  };

  const handleSignIn = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    signInWithGoogle();
  }, [signInWithGoogle]);

  const handleSignOut = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    signOut();
  }, [signOut]);

  // Every resolve bumps this id. A response that lands after a newer request
  // was sent gets discarded, so a slow first request cannot overwrite the
  // media the user asked for second.
  const resolveRequestIdRef = useRef(0);

  const handleResolveAndPlay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const requestId = ++resolveRequestIdRef.current;
    const raw = inputUrl.trim();
    if (!raw) {
      toast.error('Please enter or paste a valid video link or YouTube ID');
      return;
    }

    const normalized = normalizeMediaUrl(raw);
    if (!normalized.isValid) {
      toast.error(normalized.error || 'Invalid link format');
      return;
    }

    setIsLoading(true);
    setResolveError(null);
    setTranscribeNotice(null);
    setIsTranscribing(false);

    const isYt = normalized.platform === 'youtube' || !!extractYouTubeVideoId(raw);
    const ytId = extractYouTubeVideoId(raw) || undefined;

    // Fast-path progressive activation for YouTube links
    if (isYt && ytId) {
      const initialYtMedia: ResolvedMedia = {
        title: `YouTube Video [${ytId}]`,
        thumbnail: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
        m3u8_url: `https://www.youtube.com/watch?v=${ytId}`,
        fast_download_url: `https://www.youtube.com/watch?v=${ytId}`,
        size: '',
        shareId: ytId,
        platform: 'youtube',
        youtube_id: ytId,
        transcript: null,
        formats: [],
        is_mock: false,
      };

      setResolvedVideo(initialYtMedia);
      setThumbnailSubTab('cover');
      incrementGuestPlays();
      toast.success('YouTube Studio loaded! Extracting media assets...');

      setTimeout(() => {
        const el = document.getElementById('player-viewport');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      // Asynchronously fetch video title from public YouTube oEmbed API
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((oembed) => {
          if (oembed?.title) {
            setResolvedVideo((prev) => (prev && prev.youtube_id === ytId ? { ...prev, title: oembed.title } : prev));
          }
        })
        .catch(() => {});

      // Asynchronously fetch transcripts and stream details in parallel
      (async () => {
        try {
          const transPromise = fetch(`/api/transcript?id=${encodeURIComponent(ytId)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);

          const resolvePromise = fetch(`/api/resolve?url=${encodeURIComponent(normalized.normalizedUrl)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);

          const [transData, resolveData] = await Promise.all([transPromise, resolvePromise]);

          if (resolveData && !resolveData.success) {
            toast.error(resolveData.error || 'This video is unavailable or restricted on YouTube.');
          }

          const foundTranscript =
            transData?.success && transData.transcript?.items?.length
              ? transData.transcript
              : resolveData?.success && resolveData.transcript?.items?.length
              ? resolveData.transcript
              : null;

          const foundTitle = resolveData?.title || transData?.title;
          const foundM3u8 = resolveData?.m3u8_url || resolveData?.fast_download_url;

          setResolvedVideo((prev) => {
            if (!prev || prev.youtube_id !== ytId) return prev;
            return {
              ...prev,
              title: foundTitle && foundTitle !== 'YouTube Video Stream' ? foundTitle : prev.title,
              transcript: foundTranscript,
              m3u8_url: foundM3u8 || prev.m3u8_url,
              fast_download_url: foundM3u8 || prev.fast_download_url,
              size: resolveData?.success ? (resolveData.size || '') : '',
              formats: resolveData?.success && Array.isArray(resolveData.formats) ? resolveData.formats : [],
              video_formats: resolveData?.success && Array.isArray(resolveData.video_formats) ? resolveData.video_formats : [],
              audio_formats: resolveData?.success && Array.isArray(resolveData.audio_formats) ? resolveData.audio_formats : [],
              thumbnails: resolveData?.success && Array.isArray(resolveData.thumbnails) ? resolveData.thumbnails : prev.thumbnails,
            };
          });

          if (foundTranscript) {
            toast.success(`Transcript loaded: ${foundTranscript.items.length} cues ready!`);
          }
        } catch {
          // Backend network notice: client keeps active studio viewer
        } finally {
          if (resolveRequestIdRef.current === requestId) {
            setIsLoading(false);
          }
        }
      })();
      return;
    }

    // Default flow for TeraBox, direct MP4, Facebook, Instagram
    setResolvedVideo(null);
    try {
      const res = await fetch(`/api/resolve?url=${encodeURIComponent(normalized.normalizedUrl)}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (resolveRequestIdRef.current !== requestId) return;
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract video stream from this link');
      }
      // A fabricated response is never played back as the requested media.
      if (data.is_mock) {
        throw new Error('Extraction failed for this link. No media was found.');
      }

      const isImg = data.media_type === 'carousel' || data.media_type === 'image' || data.formats?.some((f: MediaFormatOption) => f.ext === 'jpg');
      setResolvedVideo({
        title: data.title || 'Shared Video File',
        thumbnail: data.thumbnail || '',
        thumbnails: data.thumbnails || [],
        m3u8_url: data.m3u8_url || data.fast_download_url || '',
        fast_download_url: data.fast_download_url || data.m3u8_url,
        embed_url: data.embed_url || (data.m3u8_url?.includes('embed') && normalized.platform === 'terabox' ? data.m3u8_url : undefined),
        size: data.size || 'HD Quality',
        duration: data.duration,
        shareId: data.shareId || normalized.shareId || 'stream',
        platform: data.platform || (normalized.platform as ResolvedMedia['platform']),
        youtube_id: data.youtube_id,
        transcript: data.transcript || null,
        formats: data.formats || [],
        video_formats: data.video_formats || [],
        audio_formats: data.audio_formats || [],
        media_type: data.media_type || (isImg ? 'carousel' : 'video'),
        is_vertical: data.is_vertical,
        aspect_ratio: data.aspect_ratio,
        is_mock: data.is_mock,
      });

      setActiveSlideIndex(0);
      setThumbnailSubTab('cover');
      incrementGuestPlays();
      if (data.is_mock) {
        toast.warning('Extraction failed. Playing the demo sample stream, not your link.');
      } else {
        toast.success(isImg ? 'Instagram Media loaded! All slides ready.' : 'Stream loaded! Playing video...');
      }

      setTimeout(() => {
        const el = document.getElementById('player-viewport');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Could not resolve link. Please try again.';
      setResolveError({
        title: normalized.platform === 'instagram' ? 'Instagram Content Protected' : 'Media Unavailable',
        message: errMsg,
        platform: normalized.platform,
      });
      toast.error(errMsg);
      setTimeout(() => {
        const el = document.getElementById('error-viewport');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      if (resolveRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const handleCopyDirectLink = async () => {
    if (!resolvedVideo) return;
    const stream = resolvedVideo.m3u8_url || resolvedVideo.fast_download_url;
    try {
      await navigator.clipboard.writeText(stream);
      setCopiedLink(true);
      toast.success('Stream link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // ==========================================
  // UNIVERSAL DOCK ACTIONS (FORMATS, TRANSCRIPTS & THUMBNAILS)
  // ==========================================
  const videoFormats = useMemo(() => {
    const list = resolvedVideo?.video_formats?.length
      ? resolvedVideo.video_formats
      : resolvedVideo?.formats?.filter((f) => !f.is_audio_only) || [];
    if (list.length === 0 && !resolvedVideo?.youtube_id && (resolvedVideo?.m3u8_url || resolvedVideo?.fast_download_url)) {
      return [
        {
          format_id: 'direct_stream',
          quality: 'Direct Stream MP4',
          height: 720,
          ext: 'mp4',
          filesize: resolvedVideo.size || 'HD Quality',
          url: resolvedVideo.fast_download_url || resolvedVideo.m3u8_url,
          download_url: resolvedVideo.fast_download_url || resolvedVideo.m3u8_url,
          has_audio: true,
          has_video: true,
          is_audio_only: false,
          is_progressive: true,
        },
      ];
    }
    return [...list].sort((a, b) => (b.height || 0) - (a.height || 0));
  }, [resolvedVideo]);

  // Renditions the player can switch between during playback.
  //
  // Filter out watermark tracks when clean streams exist, and deduplicate
  // identical resolutions so the quality menu only offers unique tiers.
  const playerQualities = useMemo(() => {
    const muxed = (resolvedVideo?.video_formats || []).filter((f) => f.has_audio);
    const progressive = (resolvedVideo?.formats || []).filter(
      (f) => f.is_progressive && f.has_audio && f.has_video
    );
    const list = muxed.length ? muxed : progressive;
    const cleanList = list.some((f) => f.format_id !== 'watermark')
      ? list.filter((f) => f.format_id !== 'watermark')
      : list;

    const seenHeights = new Set<number>();
    const unique: Array<{ label: string; url: string; height: number }> = [];

    const sorted = [...cleanList]
      .filter((f) => (f.height || 0) > 0 && !!f.download_url)
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    for (const f of sorted) {
      const h = f.height as number;
      if (!seenHeights.has(h)) {
        seenHeights.add(h);
        unique.push({
          label: `${h}p`,
          url: f.download_url as string,
          height: h,
        });
      }
    }
    return unique;
  }, [resolvedVideo]);

  // Genuine alternate sources for the player: every rendition the server
  // returned except the one already playing. The old list repeated the primary
  // URL, so a failover set the same source and the player never recovered.
  const playerFallbackUrls = useMemo(() => {
    const primary = resolvedVideo?.m3u8_url || '';
    const candidates = [
      ...(resolvedVideo?.video_formats || []).map((f) => f.download_url),
      ...(resolvedVideo?.formats || []).map((f) => f.download_url),
      resolvedVideo?.fast_download_url,
    ].filter((u): u is string => !!u && u !== primary);
    return Array.from(new Set(candidates));
  }, [resolvedVideo]);

  const audioFormats = useMemo(() => {
    const list = resolvedVideo?.audio_formats?.length
      ? resolvedVideo.audio_formats
      : resolvedVideo?.formats?.filter((f) => f.is_audio_only) || [];
    return list;
  }, [resolvedVideo]);

  // Max video resolution available overall (e.g. 4K, 2K, 1080p)
  const maxVideo = useMemo(() => videoFormats[0] || null, [videoFormats]);

  // Pick progressive format with both audio and video for 1-click single-file download
  const bestVideo = useMemo(() => {
    const progressiveWithAudio = videoFormats.filter((f) => f.has_audio && f.has_video);
    if (progressiveWithAudio.length > 0) {
      return progressiveWithAudio[0];
    }
    return videoFormats[0] || null;
  }, [videoFormats]);

  const bestAudio = useMemo(
    () => audioFormats.find((f) => f.format_id === 'mp3_320') || audioFormats[0] || null,
    [audioFormats]
  );

  const getFormatDownloadHref = useCallback(
    (fmt: MediaFormatOption | null | undefined) => {
      if (!resolvedVideo || !fmt) return '#';
      const safeTitle = (resolvedVideo.title || 'media').replace(/[^a-zA-Z0-9_-]/g, '_');
      const resLabel = fmt.height ? `${fmt.height}p` : fmt.is_audio_only ? 'audio' : 'video';
      const ytId = resolvedVideo.youtube_id || extractYouTubeVideoId(inputUrl);
      const cleanFilename = ytId ? `${safeTitle}_${ytId}_${resLabel}` : `${safeTitle}_${resLabel}`;

      if (fmt.download_url && fmt.download_url.startsWith('/api/stream-download')) {
        return fmt.download_url;
      }

      if (fmt.is_audio_only) {
        return `/api/stream-download?url=${encodeURIComponent(fmt.url)}&filename=${encodeURIComponent(cleanFilename)}&ext=mp3`;
      }

      const audioUrl = fmt.audio_url || bestAudio?.url;
      if (audioUrl && audioUrl !== fmt.url && !fmt.has_audio) {
        return `/api/stream-download?url=${encodeURIComponent(fmt.url)}&audio_url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(cleanFilename)}&ext=mp4`;
      }

      return `/api/stream-download?url=${encodeURIComponent(fmt.url)}&filename=${encodeURIComponent(cleanFilename)}&ext=mp4`;
    },
    [resolvedVideo, bestAudio, inputUrl]
  );

  const getFormatDownloadFilename = useCallback(
    (fmt: MediaFormatOption | null | undefined) => {
      if (!resolvedVideo || !fmt) return 'media.mp4';
      const safeTitle = (resolvedVideo.title || 'media').replace(/[^a-zA-Z0-9_-]/g, '_');
      const resLabel = fmt.height ? `${fmt.height}p` : fmt.is_audio_only ? 'audio' : 'video';
      const ext = fmt.is_audio_only ? 'mp3' : 'mp4';
      const ytId = resolvedVideo.youtube_id || extractYouTubeVideoId(inputUrl);
      return ytId ? `${safeTitle}_${ytId}_${resLabel}.${ext}` : `${safeTitle}_${resLabel}.${ext}`;
    },
    [resolvedVideo, inputUrl]
  );

  const handleDownloadMp4 = () => {
    if (!resolvedVideo) return;
    const target = bestVideo || videoFormats[0];
    const proxyTarget = getFormatDownloadHref(target);
    const fileName = getFormatDownloadFilename(target);

    const link = document.createElement('a');
    link.href = proxyTarget;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Starting high-speed MP4 download...');
  };


  const activeFormats = useMemo(
    () => (downloadFormatTab === 'video' ? videoFormats : audioFormats),
    [downloadFormatTab, videoFormats, audioFormats]
  );

  const isImageMedia = useMemo(() => {
    if (!resolvedVideo) return false;
    return (
      resolvedVideo.media_type === 'carousel' ||
      resolvedVideo.media_type === 'image' ||
      resolvedVideo.formats?.some((f) => f.ext === 'jpg' || f.ext === 'jpeg' || f.ext === 'png') ||
      Boolean(resolvedVideo.m3u8_url && /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(resolvedVideo.m3u8_url))
    );
  }, [resolvedVideo]);

  const isVerticalMedia = useMemo(() => {
    if (!resolvedVideo) return false;
    if (resolvedVideo.is_vertical !== undefined) {
      return Boolean(resolvedVideo.is_vertical);
    }
    const firstThumb = resolvedVideo.thumbnails?.[0];
    if (firstThumb?.width && firstThumb?.height) {
      return firstThumb.height > firstThumb.width;
    }
    if (resolvedVideo.platform === 'instagram' && resolvedVideo.media_type === 'carousel') {
      return true;
    }
    return false;
  }, [resolvedVideo]);

  const isTrueCarousel = useMemo(() => {
    return Boolean(
      resolvedVideo &&
      resolvedVideo.media_type === 'carousel' &&
      resolvedVideo.thumbnails &&
      resolvedVideo.thumbnails.length > 1
    );
  }, [resolvedVideo]);

  const carouselSlides = useMemo(() => {
    if (!resolvedVideo) return [];
    if (isTrueCarousel && resolvedVideo.thumbnails && resolvedVideo.thumbnails.length > 0) {
      return resolvedVideo.thumbnails;
    }
    if (resolvedVideo.thumbnail) {
      return [{ url: resolvedVideo.thumbnail, quality_label: 'Original Media' }];
    }
    return [];
  }, [resolvedVideo, isTrueCarousel]);

  const coverTiers = useMemo(() => {
    if (!resolvedVideo) return [];

    if (resolvedVideo.youtube_id) {
      return [
        {
          label: '1080p Full HD (MaxRes)',
          sublabel: 'Full HD 1080p Lossless',
          res: '1920 × 1080',
          badge: 'Highest Quality',
          badgeColor: 'text-[#e4f222] bg-[#e4f222]/15 border-[#e4f222]/30',
          url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/maxresdefault.jpg`,
          tag: '1080p',
        },
        {
          label: '720p HD (High Definition)',
          sublabel: 'HD 720p Standard',
          res: '1280 × 720',
          badge: 'High Definition',
          badgeColor: 'text-sky-400 bg-sky-400/15 border-sky-400/30',
          url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/hqdefault.jpg`,
          tag: '720p',
        },
        {
          label: '480p SD (Standard Res)',
          sublabel: 'Standard 480p Web',
          res: '640 × 480',
          badge: 'Standard',
          badgeColor: 'text-amber-400 bg-amber-400/15 border-amber-400/30',
          url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/sddefault.jpg`,
          tag: '480p',
        },
        {
          label: '360p Medium (Preview)',
          sublabel: 'Compact 360p',
          res: '480 × 360',
          badge: 'Compact',
          badgeColor: 'text-slate-400 bg-slate-400/15 border-slate-400/30',
          url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/mqdefault.jpg`,
          tag: '360p',
        },
      ];
    }

    if (resolvedVideo.thumbnails && resolvedVideo.thumbnails.length > 0) {
      const cleanThumbs = resolvedVideo.thumbnails.filter((t) => {
        const u = (t.url || '').toLowerCase();
        if (u.includes('storyboard') || u.includes('/sb') || u.includes('sb0') || u.includes('sb1')) return false;
        if (t.width && t.width < 180) return false;
        return true;
      });

      const seen = new Set<string>();
      const deduped: ThumbnailItem[] = [];
      for (const t of cleanThumbs) {
        const key = `${t.width || 0}x${t.height || 0}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(t);
        }
      }

      deduped.sort((a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0)));

      if (deduped.length > 0) {
        return deduped.map((t, idx) => {
          const h = t.height || 0;
          const w = t.width || 0;
          const isHighest = idx === 0;
          const badge =
            (w >= 2000 || h >= 2000)
              ? '4K UHD'
              : (w >= 1920 || h >= 1080)
              ? 'Highest Quality'
              : (w >= 1280 || h >= 720)
              ? 'High Definition'
              : 'Standard';
          const badgeColor =
            badge === '4K UHD' || badge === 'Highest Quality'
              ? 'text-[#e4f222] bg-[#e4f222]/15 border-[#e4f222]/30'
              : badge === 'High Definition'
              ? 'text-sky-400 bg-sky-400/15 border-sky-400/30'
              : 'text-amber-400 bg-amber-400/15 border-amber-400/30';
          const tierTag = h ? `${h}p` : `tier_${idx + 1}`;
          const label = isHighest ? `${tierTag} Original Master` : `${tierTag} Quality`;
          const res = t.resolution || (w && h ? `${w} × ${h}` : 'HD Quality');

          return {
            label,
            sublabel: isHighest ? 'Original Lossless Cover' : `${tierTag} Resolution`,
            res,
            badge,
            badgeColor,
            url: t.url,
            tag: tierTag,
          };
        });
      }
    }

    if (resolvedVideo.thumbnail) {
      return [
        {
          label: 'Original Media Cover (HD)',
          sublabel: 'Lossless Master Cover',
          res: 'HD Standard',
          badge: 'HD Quality',
          badgeColor: 'text-[#e4f222] bg-[#e4f222]/15 border-[#e4f222]/30',
          url: resolvedVideo.thumbnail,
          tag: 'original',
        },
      ];
    }

    return [];
  }, [resolvedVideo]);

  const activeCoverTier = useMemo(() => {
    if (!coverTiers.length) return null;
    const found = coverTiers.find((t) => t.tag === selectedCoverTag);
    return found || coverTiers[0];
  }, [coverTiers, selectedCoverTag]);

  const thumbnailList = useMemo(() => {
    if (!resolvedVideo) return [];
    if (isTrueCarousel && resolvedVideo.thumbnails && resolvedVideo.thumbnails.length > 0) {
      return resolvedVideo.thumbnails.map((t, idx) => ({
        label: `Slide ${idx + 1} of ${resolvedVideo.thumbnails!.length}`,
        sublabel: t.quality_label || 'Original Lossless Quality',
        res: t.resolution || (t.width && t.height ? `${t.width} × ${t.height}` : '1080p HD'),
        badge: idx === 0 ? 'Cover Slide' : 'Slide',
        badgeColor: idx === 0 ? 'text-[#e4f222] bg-[#e4f222]/15 border-[#e4f222]/30' : 'text-sky-400 bg-sky-400/15 border-sky-400/30',
        url: t.url,
        tag: `slide_${idx + 1}`,
      }));
    }
    return coverTiers;
  }, [resolvedVideo, isTrueCarousel, coverTiers]);

  const timelineScenes = useMemo(() => {
    if (!resolvedVideo || isTrueCarousel || !resolvedVideo.thumbnails || resolvedVideo.thumbnails.length === 0) {
      return [];
    }

    const coverUrlSet = new Set(coverTiers.map((t) => t.url.toLowerCase()));
    if (resolvedVideo.thumbnail) {
      coverUrlSet.add(resolvedVideo.thumbnail.toLowerCase());
    }

    const isCoverUrl = (url: string) => {
      const lower = url.toLowerCase();
      if (coverUrlSet.has(lower)) return true;
      if (/(maxresdefault|hqdefault|sddefault|mqdefault|default|hq720)\.jpg/i.test(lower)) return true;
      return false;
    };

    const seen = new Set<string>();
    const scenes: Array<{
      label: string;
      sublabel: string;
      res: string;
      url: string;
      tag: string;
    }> = [];

    for (const t of resolvedVideo.thumbnails) {
      if (!t.url) continue;
      if (isCoverUrl(t.url)) continue;
      if (seen.has(t.url)) continue;
      seen.add(t.url);

      if (t.width && t.width < 120) continue;

      const idx = scenes.length + 1;
      const res = t.resolution || (t.width && t.height ? `${t.width} × ${t.height}` : 'Video Frame');
      scenes.push({
        label: `Scene Snapshot #${idx}`,
        sublabel: t.quality_label || `Timeline Scene ${idx}`,
        res,
        url: t.url,
        tag: `scene_${idx}`,
      });
    }

    return scenes;
  }, [resolvedVideo, isTrueCarousel, coverTiers]);

  const transcriptItems = useMemo(() => {
    if (!resolvedVideo?.transcript?.items) return [];
    if (!transcriptSearch.trim()) return resolvedVideo.transcript.items;
    const query = transcriptSearch.toLowerCase();
    return resolvedVideo.transcript.items.filter((item) =>
      item.text.toLowerCase().includes(query)
    );
  }, [resolvedVideo?.transcript?.items, transcriptSearch]);

  const handleCopyTranscript = async () => {
    const itemsToCopy = transcriptItems;
    if (!itemsToCopy.length) {
      toast.error('No transcript cues available to copy');
      return;
    }
    const txt = generateTxtContent(
      itemsToCopy,
      showTimestamps,
      resolvedVideo?.title || 'YouTube Video'
    );
    try {
      await navigator.clipboard.writeText(txt);
      setCopiedTranscript(true);
      const isFiltered = transcriptSearch.trim() && resolvedVideo?.transcript?.items && itemsToCopy.length < resolvedVideo.transcript.items.length;
      toast.success(isFiltered ? `Copied ${itemsToCopy.length} filtered cues to clipboard!` : 'Full transcript copied to clipboard!');
      setTimeout(() => setCopiedTranscript(false), 2500);
    } catch {
      toast.error('Failed to copy transcript');
    }
  };

  const handleDownloadTxt = () => {
    const itemsToExport = transcriptItems;
    if (!itemsToExport.length) {
      toast.error('No transcript available to download');
      return;
    }
    const txt = generateTxtContent(
      itemsToExport,
      showTimestamps,
      resolvedVideo?.title || 'YouTube Video'
    );
    const safeTitle = (resolvedVideo?.title || 'youtube_transcript').replace(/[^a-zA-Z0-9_-]/g, '_');
    triggerFileDownload(txt, `${safeTitle}_transcript.txt`, 'text/plain;charset=utf-8');
    toast.success('Downloaded transcript .TXT file!');
  };

  const handleDownloadSrt = () => {
    const itemsToExport = transcriptItems;
    if (!itemsToExport.length) {
      toast.error('No transcript available to download as SRT');
      return;
    }
    const srt = generateSrtContent(itemsToExport);
    const safeTitle = (resolvedVideo?.title || 'youtube_transcript').replace(/[^a-zA-Z0-9_-]/g, '_');
    triggerFileDownload(srt, `${safeTitle}_subtitles.srt`, 'text/plain;charset=utf-8');
    toast.success('Downloaded SubRip .SRT subtitle file!');
  };

  const handleGenerateAiTranscript = async (forceDemo = false) => {
    if (!resolvedVideo) return;
    setIsTranscribing(true);
    setTranscribeNotice(null);

    if (forceDemo) {
      setResolvedVideo((prev) =>
        prev
          ? {
              ...prev,
              transcript: {
                language: 'en',
                items: FALLBACK_DEMO_TRANSCRIPT,
                count: FALLBACK_DEMO_TRANSCRIPT.length,
              },
            }
          : prev
      );
      setIsTranscribing(false);
      toast.success('Loaded demo transcript cues!');
      return;
    }

    try {
      let directUrl =
        resolvedVideo.audio_formats?.[0]?.url ||
        resolvedVideo.fast_download_url ||
        resolvedVideo.video_formats?.[0]?.url ||
        resolvedVideo.formats?.[0]?.url ||
        resolvedVideo.m3u8_url;

      if (directUrl?.startsWith('/api/stream-download')) {
        try {
          const parsed = new URL(directUrl, window.location.origin);
          const raw = parsed.searchParams.get('url');
          if (raw) directUrl = raw;
        } catch {
          // Fallback to directUrl as provided
        }
      }

      const targetMediaUrl = directUrl || inputUrl.trim();

      const queryParams = new URLSearchParams();
      if (targetMediaUrl) queryParams.set('url', targetMediaUrl);
      if (inputUrl.trim() && inputUrl.trim() !== targetMediaUrl) queryParams.set('platformUrl', inputUrl.trim());
      if (resolvedVideo.platform) queryParams.set('platform', resolvedVideo.platform);
      if (resolvedVideo.youtube_id) {
        queryParams.set('id', resolvedVideo.youtube_id);
        if (!queryParams.has('platformUrl')) {
          queryParams.set('platformUrl', `https://www.youtube.com/watch?v=${resolvedVideo.youtube_id}`);
        }
      } else if (resolvedVideo.shareId) {
        queryParams.set('id', resolvedVideo.shareId);
      }

      const res = await fetch(`/api/transcribe?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success && data.transcript?.items?.length) {
        setResolvedVideo((prev) => (prev ? { ...prev, transcript: data.transcript } : prev));
        const cueCount = data.transcript.items.length;
        const srcLabel = data.source === 'native' ? 'Platform Subtitles' : 'Groq Whisper AI';
        toast.success(`Transcript ready: ${cueCount} cues loaded via ${srcLabel}!`);
      } else {
        const errMsg = data.error || 'No transcript could be generated for this media.';
        setTranscribeNotice({ message: errMsg, code: data.code });
        toast.error(errMsg);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Network connection failed while contacting transcription service.';
      setTranscribeNotice({ message: errMsg, code: 'NETWORK_ERROR' });
      toast.error(errMsg);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDownloadThumbnail = async (imgUrl: string, qualityLabel: string) => {
    const safeTitle = (resolvedVideo?.title || 'media_cover').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTitle}_${qualityLabel}.jpg`;

    // Direct proxy download for Instagram and external CDNs to avoid browser CORS blocks
    if (imgUrl.includes('fbcdn.net') || imgUrl.includes('cdninstagram.com') || imgUrl.includes('instagram.com')) {
      const proxyUrl = `/api/stream-download?url=${encodeURIComponent(imgUrl)}&filename=${encodeURIComponent(`${safeTitle}_${qualityLabel}`)}&ext=jpg&source=instagram`;
      const a = document.createElement('a');
      a.href = proxyUrl;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloading ${qualityLabel}...`);
      return;
    }

    try {
      let res = await fetch(imgUrl);
      // Auto fallback to HQ if MaxRes is a 404 (common on older video uploads)
      if (!res.ok && imgUrl.includes('maxresdefault.jpg') && resolvedVideo?.youtube_id) {
        const fallbackUrl = `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/hqdefault.jpg`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          res = fallbackRes;
          toast.info('1080p MaxRes not available for this upload; downloaded High Quality (720p) instead.');
        }
      }

      if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success(`Downloaded ${qualityLabel}!`);
    } catch {
      const proxyUrl = `/api/stream-download?url=${encodeURIComponent(imgUrl)}&filename=${encodeURIComponent(`${safeTitle}_${qualityLabel}`)}&ext=jpg`;
      const a = document.createElement('a');
      a.href = proxyUrl;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.info(`Downloading ${qualityLabel} via secure stream...`);
    }
  };

  const handleDownloadAllThumbnails = () => {
    if (!thumbnailList.length) return;
    toast.info(`Starting batch download of ${thumbnailList.length} items...`);
    thumbnailList.forEach((item, i) => {
      setTimeout(() => {
        handleDownloadThumbnail(item.url, item.tag);
      }, i * 350);
    });
  };

  const handleDownloadAllScenes = () => {
    if (!timelineScenes.length) return;
    toast.info(`Starting batch download of ${timelineScenes.length} timeline scenes...`);
    timelineScenes.forEach((item, i) => {
      setTimeout(() => {
        handleDownloadThumbnail(item.url, item.tag);
      }, i * 350);
    });
  };

  const handleCopyEmbed = async () => {
    if (!resolvedVideo?.youtube_id) return;
    const embedCode = `<iframe width="100%" height="480" src="https://www.youtube-nocookie.com/embed/${resolvedVideo.youtube_id}" title="${resolvedVideo.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      toast.success('HTML embed code copied!');
      setTimeout(() => setCopiedEmbed(false), 2500);
    } catch {
      toast.error('Failed to copy embed code');
    }
  };

  // Structured Schema for SEO
  const jsonLdWebApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'TeraPlay Universal Video & Creator Dock',
    url: canonicalPath,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: seo.metaDescription,
  };

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: seo.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  const isYouTubeMode = resolvedVideo?.platform === 'youtube' || !!resolvedVideo?.youtube_id;

  return (
    <div className="tp-root" data-theme={theme}>
      <Helmet>
        <title>{seo.metaTitle}</title>
        <meta name="description" content={seo.metaDescription} />
        <meta name="keywords" content={seo.keywords.join(', ')} />
        <link rel="canonical" href={canonicalPath} />
        <meta property="og:title" content={seo.metaTitle} />
        <meta property="og:description" content={seo.metaDescription} />
        <meta property="og:url" content={canonicalPath} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={seo.metaTitle} />
        <meta name="twitter:description" content={seo.metaDescription} />
        <script type="application/ld+json">{JSON.stringify(jsonLdWebApp)}</script>
        <script type="application/ld+json">{JSON.stringify(jsonLdFaq)}</script>
      </Helmet>

      {/* MINIMAL FLOATING NAVIGATION BAR */}
      <header className="tp-nav">
        <Link to="/" className="tp-brand" aria-label="TeraPlay home">
          <span className="tp-brand-word">TeraPlay</span>
          <svg className="tp-svg" width="17" height="14" viewBox="0 0 17 14" aria-hidden="true">
            <path
              d="M1 13.2c4.6-.4 8.4-2.6 11-6.4L15.6 1M9.6 1.4h6v6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <div className="tp-center-info" title="TeraPlay Network Status">
          <span>Edge CDN Online</span>
          <span className="tp-center-bar" aria-hidden="true" />
          <span>YouTube Studio & TeraBox</span>
        </div>

        <div className="tp-nav-actions">
          <ThemeChanger theme={theme} onToggle={toggleTheme} variant="icon" />

          <button
            type="button"
            onClick={() => setShowSupportModal(true)}
            className="tp-btn-nav-accent"
            title="Support TeraPlay"
            aria-label="Support TeraPlay"
          >
            <Coffee className="w-3.5 h-3.5 mr-1 text-black/80" aria-hidden="true" />
            <span>Support</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          HERO & UNIVERSAL RESOLVER DOCK
          ========================================================================= */}
      <section className="tp-hero">
        <div className="tp-hero-sky-container" aria-hidden="true">
          <img
            src="/assets/bg-day.png"
            alt=""
            fetchpriority="high"
            decoding="async"
            className="tp-hero-sky-img tp-hero-sky-day"
          />
          <img
            src="/assets/bg-night.png"
            alt=""
            fetchpriority="high"
            decoding="async"
            className="tp-hero-sky-img tp-hero-sky-night"
          />
          <div className="tp-hero-sky-overlay" />
        </div>

        <h1 className="tp-hero-headline" aria-label={`${HERO_HEADLINE_LINE_1} ${HERO_HEADLINE_LINE_2}`}>
          <span className="tp-headline-line tp-headline-white">{HERO_HEADLINE_LINE_1}</span>
          <span className="tp-headline-line tp-headline-accent">{HERO_HEADLINE_LINE_2}</span>
        </h1>

        <p className="tp-hero-subheadline">
          {HERO_SUBHEADLINE}
        </p>

        {/* INPUT DOCK */}
        <div id="resolver-dock" className="tp-resolver-dock">
          <form onSubmit={handleResolveAndPlay} className="tp-input-card">
            <div className="tp-input-row">
              {/* Row 1: 100% Full-Width URL Input Field */}
              <div className="tp-input-field-wrap">
                <Search className="w-4 h-4 text-white/70 shrink-0 ml-1.5" aria-hidden="true" />
                <input
                  ref={urlInputRef}
                  type="text"
                  className="tp-url-input"
                  placeholder={
                    activeChip === 'YouTube'
                      ? 'Paste YouTube video link, shorts, or video ID...'
                      : activeChip === 'TeraBox'
                      ? 'Paste TeraBox, 1024tera, or NephoBox share link...'
                      : activeChip === 'Direct'
                      ? 'Paste direct .mp4 or .m3u8 video URL...'
                      : activeChip === 'Instagram'
                      ? 'Paste Instagram Reel or video URL...'
                      : activeChip === 'Facebook'
                      ? 'Paste Facebook video or watch link...'
                      : activeChip === 'TikTok'
                      ? 'Paste TikTok video or creator link...'
                      : activeChip === 'Bilibili'
                      ? 'Paste Bilibili video (BV/av) link...'
                      : activeChip === 'Dailymotion'
                      ? 'Paste Dailymotion video link...'
                      : activeChip === 'Snapchat'
                      ? 'Paste Snapchat Spotlight video link...'
                      : activeChip === 'LinkedIn'
                      ? 'Paste LinkedIn video post link...'
                      : activeChip === 'Twitch'
                      ? 'Paste Twitch stream or clip link...'
                      : activeChip === 'Vimeo'
                      ? 'Paste Vimeo video link...'
                      : 'Paste any video link (YouTube, TeraBox, TikTok, Instagram, Bilibili...)'
                  }
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />

                {inputUrl && (
                  <button
                    type="button"
                    onClick={() => setInputUrl('')}
                    className="tp-clear-btn"
                    title="Clear input"
                  >
                    ✕
                  </button>
                )}

                {/* Unified inline Paste capsule pill (Apple iOS style) */}
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="tp-btn-paste-inline"
                  title="Paste link from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5 text-[#e4f222] shrink-0" />
                  <span>Paste</span>
                </button>
              </div>

              {/* Primary Action Button: Solo Launch & Analyze CTA on desktop and mobile */}
              <div className="tp-actions-row">
                <button type="submit" disabled={isLoading} className="tp-btn tp-btn-primary tp-btn-launch">
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current shrink-0" />
                      <span>Launch & Analyze</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Platform Selector Chips */}
          <div className="tp-format-chips" role="tablist" aria-label="Supported Platform Modes">
            {[
              {
                id: 'YouTube',
                label: 'YouTube Studio',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 256 180" fill="none" aria-hidden="true">
                    <path
                      fill="#FF0000"
                      d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134"
                    />
                    <path fill="#FFFFFF" d="m102.421 128.06l66.328-38.418l-66.328-38.418z" />
                  </svg>
                ),
              },
              {
                id: 'TeraBox',
                label: 'TeraBox / 1024tera',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect width="24" height="24" rx="5.5" fill="#0086FF" />
                    <path
                      d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
                      fill="#ffffff"
                      transform="matrix(0.58 0 0 0.58 5.04 5.04)"
                    />
                    <path d="M12 9.4l-2.4 2.4h1.5v3h1.8v-3h1.5L12 9.4z" fill="#0086FF" />
                  </svg>
                ),
              },
              {
                id: 'TikTok',
                label: 'TikTok',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect width="24" height="24" rx="5.5" fill="#010101" />
                    <g transform="matrix(0.06 0 0 0.06 4.3 3.3)">
                      <path
                        fill="#ff004f"
                        d="M189.72 104.421c18.678 13.345 41.56 21.197 66.273 21.197v-47.53a67 67 0 0 1-13.918-1.456v37.413c-24.711 0-47.59-7.851-66.272-21.195v96.996c0 48.523-39.356 87.855-87.9 87.855c-18.113 0-34.949-5.473-48.934-14.86c15.962 16.313 38.222 26.432 62.848 26.432c48.548 0 87.905-39.332 87.905-87.857v-96.995zm17.17-47.952c-9.546-10.423-15.814-23.893-17.17-38.785v-6.113h-13.189c3.32 18.927 14.644 35.097 30.358 44.898M69.673 225.607a40 40 0 0 1-8.203-24.33c0-22.192 18.001-40.186 40.21-40.186a40.3 40.3 0 0 1 12.197 1.883v-48.593c-4.61-.631-9.262-.9-13.912-.801v37.822a40.3 40.3 0 0 0-12.203-1.882c-22.208 0-40.208 17.992-40.208 40.187c0 15.694 8.997 29.281 22.119 35.9"
                      />
                      <path
                        fill="#ffffff"
                        d="M175.803 92.849c18.683 13.344 41.56 21.195 66.272 21.195V76.631c-13.794-2.937-26.005-10.141-35.186-20.162c-15.715-9.802-27.038-25.972-30.358-44.898h-34.643v189.843c-.079 22.132-18.049 40.052-40.21 40.052c-13.058 0-24.66-6.221-32.007-15.86c-13.12-6.618-22.118-20.206-22.118-35.898c0-22.193 18-40.187 40.208-40.187c4.255 0 8.356.662 12.203 1.882v-37.822c-47.692.985-86.047 39.933-86.047 87.834c0 23.912 9.551 45.589 25.053 61.428c13.985 9.385 30.82 14.86 48.934 14.86c48.545 0 87.9-39.335 87.9-87.857z"
                      />
                      <path
                        fill="#00f2ea"
                        d="M242.075 76.63V66.516a66.3 66.3 0 0 1-35.186-10.047a66.47 66.47 0 0 0 35.186 20.163M176.53 11.57a68 68 0 0 1-.728-5.457V0h-47.834v189.845c-.076 22.13-18.046 40.05-40.208 40.05a40.06 40.06 0 0 1-18.09-4.287c7.347 9.637 18.949 15.857 32.007 15.857c22.16 0 40.132-17.918 40.21-40.05V11.571zM99.966 113.58v-10.769a89 89 0 0 0-12.061-.818C39.355 101.993 0 141.327 0 189.845c0 30.419 15.467 57.227 38.971 72.996c-15.502-15.838-25.053-37.516-25.053-61.427c0-47.9 38.354-86.848 86.048-87.833"
                      />
                    </g>
                  </svg>
                ),
              },
              {
                id: 'Instagram',
                label: 'Instagram Reels',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <defs>
                      <radialGradient id="ig-chip-dock" cx="20%" cy="110%" r="130%">
                        <stop offset="0%" stopColor="#ffda77" />
                        <stop offset="25%" stopColor="#fca951" />
                        <stop offset="50%" stopColor="#ea3770" />
                        <stop offset="75%" stopColor="#b429b6" />
                        <stop offset="100%" stopColor="#4f5bd5" />
                      </radialGradient>
                    </defs>
                    <rect width="24" height="24" rx="6" fill="url(#ig-chip-dock)" />
                    <path
                      d="M7 6.5h10a2.5 2.5 0 0 1 2.5 2.5v1.5H4.5V9A2.5 2.5 0 0 1 7 6.5zm-2.5 5.5h15V15a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 15v-3zm6-4l1.2 2h1.8l-1.2-2h-1.8zm4 0l1.2 2h1.8l-1.2-2h-1.8zm-8 0l1.2 2H9.5l-1.2-2H6.5zm4 6l3.5 2.2l-3.5 2.2v-4.4z"
                      fill="#ffffff"
                    />
                  </svg>
                ),
              },
              {
                id: 'Facebook',
                label: 'Facebook Watch',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill="#1877F2" />
                    <path
                      d="M16.5 12.05h-2.6v9.45h-3.9v-9.45H8.2V8.75h1.8V6.63c0-2.48 1.48-3.85 3.74-3.85c1.08 0 2.22.19 2.22.19v2.44h-1.25c-1.23 0-1.61.76-1.61 1.54v1.8h2.75l-.44 3.3z"
                      fill="#ffffff"
                    />
                  </svg>
                ),
              },
              {
                id: 'Bilibili',
                label: 'Bilibili',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      fill="#23ADE5"
                      d="M17.813 4.653h.854q2.266.08 3.773 1.574Q23.946 7.72 24 9.987v7.36q-.054 2.266-1.56 3.773c-1.506 1.507-2.262 1.524-3.773 1.56H5.333q-2.266-.054-3.773-1.56C.053 19.614.036 18.858 0 17.347v-7.36q.054-2.267 1.56-3.76t3.773-1.574h.774l-1.174-1.12a1.23 1.23 0 0 1-.373-.906q0-.534.373-.907l.027-.027q.4-.373.92-.373t.92.373L9.653 4.44q.107.106.187.213h4.267a.8.8 0 0 1 .16-.213l2.853-2.747q.4-.373.92-.373c.347 0 .662.151.929.4s.391.551.391.907q0 .532-.373.906zM5.333 7.24q-1.12.027-1.88.773q-.76.748-.786 1.894v7.52q.026 1.146.786 1.893t1.88.773h13.334q1.12-.026 1.88-.773t.786-1.893v-7.52q-.026-1.147-.786-1.894t-1.88-.773zM8 11.107q.56 0 .933.373q.375.374.4.96v1.173q-.025.586-.4.96q-.373.375-.933.374c-.56-.001-.684-.125-.933-.374q-.375-.373-.4-.96V12.44q0-.56.386-.947q.387-.386.947-.386m8 0q.56 0 .933.373q.375.374.4.96v1.173q-.025.586-.4.96q-.373.375-.933.374c-.56-.001-.684-.125-.933-.374q-.375-.373-.4-.96V12.44q.025-.586.4-.96q.373-.373.933-.373"
                    />
                  </svg>
                ),
              },
              {
                id: 'Dailymotion',
                label: 'Dailymotion',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      fill="#0066DC"
                      d="M21.823 7.327a11.9 11.9 0 0 0-2.606-3.814a12.1 12.1 0 0 0-3.866-2.57A12.3 12.3 0 0 0 10.617 0H1.831a.6.6 0 0 0-.609.603v3.764c0 .162.064.312.179.426l4.164 4.123a.6.6 0 0 0 .439.177h4.56c.806 0 1.56.313 2.125.88c.557.559.856 1.296.843 2.075c-.029 1.571-1.343 2.849-2.931 2.849h-6.74a.6.6 0 0 0-.432.176a.62.62 0 0 0-.178.427v3.764c0 .162.063.312.178.427l4.139 4.099a.65.65 0 0 0 .476.21h2.572a12.3 12.3 0 0 0 4.733-.945a12.2 12.2 0 0 0 3.866-2.571a12 12 0 0 0 2.607-3.813c.633-1.479.956-3.051.956-4.67s-.321-3.19-.956-4.669zM2.441 4.118V1.982l2.945 2.755l.001 2.297zm4.975 17.813l-2.945-2.917v-2.137l2.945 2.755zm-2.004-5.832h5.19c2.248 0 4.107-1.807 4.147-4.03a4.03 4.03 0 0 0-1.192-2.937a4.2 4.2 0 0 0-2.996-1.239H6.606V5.216h3.996c1.831 0 3.553.706 4.849 1.986a6.724 6.724 0 0 1-.152 9.736a6.88 6.88 0 0 1-4.697 1.84H8.275L5.412 16.1zm15.289.1a10.8 10.8 0 0 1-2.345 3.431a10.9 10.9 0 0 1-3.48 2.314a11 11 0 0 1-4.26.847H8.633v-2.814h1.916c2.145 0 4.161-.802 5.675-2.254a7.88 7.88 0 0 0 2.451-5.728c0-2.177-.87-4.21-2.451-5.728c-1.514-1.454-3.528-2.254-5.675-2.254h-4.16L3.383 1.202h7.234c1.479 0 2.911.285 4.259.847a11 11 0 0 1 3.48 2.313a10.8 10.8 0 0 1 2.345 3.432c.571 1.33.86 2.743.86 4.202s-.289 2.873-.86 4.203"
                    />
                  </svg>
                ),
              },
              {
                id: 'Snapchat',
                label: 'Snapchat',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect width="24" height="24" rx="5.5" fill="#FFFC00" />
                    <path
                      fill="#ffffff"
                      stroke="#000000"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                      transform="matrix(0.74 0 0 0.74 3.1 2.6)"
                      d="M12.206.793c.99 0 4.347.276 5.93 3.821c.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51c.075.045.203.09.401.09c.3-.016.659-.12 1.033-.301a1 1 0 0 1 .464-.104c.182 0 .359.029.509.09c.45.149.734.479.734.838q.022.674-1.213 1.168c-.089.029-.209.075-.344.119c-.45.135-1.139.36-1.333.81c-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014c.255.044.435.27.42.509a.6.6 0 0 1-.045.225c-.24.569-1.273.988-3.146 1.271c-.059.091-.12.375-.164.57c-.029.179-.074.36-.134.553c-.076.271-.27.405-.555.405h-.03a3 3 0 0 1-.538-.074a6 6 0 0 0-1.273-.135c-.3 0-.599.015-.913.074c-.6.104-1.123.464-1.723.884c-.853.599-1.826 1.288-3.294 1.288c-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288c-.599-.42-1.107-.779-1.707-.884a7 7 0 0 0-.928-.074c-.54 0-.958.089-1.272.149a3 3 0 0 1-.54.074c-.374 0-.523-.224-.583-.42c-.061-.192-.09-.389-.135-.567c-.046-.181-.105-.494-.166-.57c-1.918-.222-2.95-.642-3.189-1.226a.6.6 0 0 1-.055-.225a.496.496 0 0 1 .42-.509c3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869c-.195-.434-.884-.658-1.332-.809a2 2 0 0 1-.346-.119c-1.107-.435-1.257-.93-1.197-1.273c.09-.479.674-.793 1.168-.793c.146 0 .27.029.383.074c.42.194.789.3 1.104.3c.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"
                    />
                  </svg>
                ),
              },
              {
                id: 'LinkedIn',
                label: 'LinkedIn',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect width="24" height="24" rx="5" fill="#0A66C2" />
                    <path
                      fill="#ffffff"
                      d="M19 19h-3.1v-4.9c0-1.2-.02-2.7-1.6-2.7c-1.6 0-1.9 1.3-1.9 2.6V19H9.3V8.8h3v1.4h.04c.4-.8 1.4-1.6 2.9-1.6c3.1 0 3.7 2.1 3.7 4.8V19zM5.8 7.4c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8s1.8.8 1.8 1.8s-.8 1.8-1.8 1.8zm1.5 11.6H4.3V8.8h3V19z"
                    />
                  </svg>
                ),
              },
              {
                id: 'Vimeo',
                label: 'Vimeo',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 256 223" fill="none" aria-hidden="true">
                    <path
                      fill="#1AB7EA"
                      d="M255.876 51.662c-1.139 24.968-18.545 59.157-52.209 102.55q-52.21 67.99-88.343 67.989c-14.918 0-27.551-13.799-37.863-41.406c-6.892-25.306-13.775-50.61-20.664-75.915c-7.663-27.592-15.878-41.406-24.661-41.406c-1.915 0-8.617 4.038-20.091 12.081L0 60.008a3257 3257 0 0 0 37.36-33.38C54.21 12.038 66.86 4.366 75.29 3.59q29.886-2.876 36.79 40.938c4.974 31.514 8.415 51.116 10.35 58.788c5.742 26.145 12.06 39.201 18.965 39.201c5.358 0 13.407-8.478 24.138-25.436c10.722-16.963 16.464-29.868 17.24-38.733c1.525-14.638-4.22-21.975-17.24-21.975c-6.128 0-12.447 1.413-18.946 4.206c12.58-41.29 36.618-61.343 72.1-60.199c26.304.773 38.705 17.867 37.19 51.282"
                    />
                  </svg>
                ),
              },
              {
                id: 'Twitch',
                label: 'Twitch',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect width="24" height="24" rx="5" fill="#9146FF" />
                    <path
                      fill="#ffffff"
                      d="M16.5 6.5h1.5v4.5h-1.5zM12.5 6.5H14v4.5h-1.5zM7.5 2.5L4 6v12h4v3.5l3.5-3.5H14L19.5 12V2.5zm10.5 9l-2.5 2.5h-2.5L13 16.5v-2.5H8V4h10z"
                    />
                  </svg>
                ),
              },
              {
                id: 'Direct',
                label: 'Direct MP4 / M3U8',
                icon: <Film className="w-4 h-4 text-emerald-400 shrink-0" />,
              },
              {
                id: 'Universal',
                label: 'Universal (1000+ Sites)',
                icon: <Globe className="w-4 h-4 text-cyan-400 shrink-0" />,
              },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={activeChip === chip.id}
                className="tp-chip"
                data-active={activeChip === chip.id ? 'true' : 'false'}
                onClick={() => {
                  setActiveChip(chip.id as PlatformChip);
                }}
              >
                {chip.icon}
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Desktop-only trust features line */}
          <div className="tp-trust-sub" aria-label="Core Capabilities">
            <span>Direct 4K & MP4 Downloads</span>
            <span className="tp-trust-dot" aria-hidden="true">•</span>
            <span>Lossless MP3 Audio</span>
            <span className="tp-trust-dot" aria-hidden="true">•</span>
            <span>Timestamped .SRT Subtitles</span>
            <span className="tp-trust-dot" aria-hidden="true">•</span>
            <span>1080p Cover Art</span>
            <span className="tp-trust-dot" aria-hidden="true">•</span>
            <a href="/document-downloader" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Document & Book Downloader
            </a>
          </div>
        </div>
      </section>

      {/* TOP AD BANNER SLOT (MONETAG / ADSTERRA LEADERBOARD READY) */}
      <div className="tp-wrap">
        <AdBannerSlot slotId="ad-banner-top" format="leaderboard" />
      </div>

      {/* =========================================================================
          RESULTS DOCK: YOUTUBE STUDIO / TERABOX PLAYER VIEWPORT
          ========================================================================= */}
      <div className="tp-wrap">
        {resolveError && !resolvedVideo && (
          <section id="error-viewport" className="w-full my-6 animate-in fade-in zoom-in-95 duration-200 ease-out">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 dark:border-white/[0.08] bg-white/[0.03] dark:bg-[#0c1222]/80 backdrop-blur-2xl p-5 sm:p-7 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
              <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 max-w-full">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-inner">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-semibold tracking-tight text-white dark:text-slate-100">
                      {resolveError.title}
                    </h3>
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Notice
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 dark:text-slate-400 leading-relaxed break-words [overflow-wrap:anywhere] break-all max-w-full select-text">
                    {resolveError.message}
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setResolveError(null);
                        setInputUrl('');
                        const el = document.getElementById('resolver-dock');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/15 backdrop-blur-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer w-fit"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Try Another Link</span>
                    </button>
                    <span className="text-[11px] text-slate-400/80 leading-normal">
                      Tip: Public Instagram Reels, YouTube videos, and TeraBox files can be streamed directly.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {resolvedVideo && (
          <section id="player-viewport" className="tp-player-card">
            {/* Header info */}
            <div className="tp-player-header">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04] dark:bg-[#0c1222] border border-[var(--tp-border-card)] shadow-inner shrink-0"
                >
                  {isYouTubeMode ? (
                    <svg className="w-5 h-3.5" viewBox="0 0 256 180" fill="none">
                      <path fill="#FF0000" d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134" />
                      <path fill="#FFFFFF" d="m102.421 128.06l66.328-38.418l-66.328-38.418z" />
                    </svg>
                  ) : resolvedVideo.platform === 'instagram' ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <defs>
                        <linearGradient id="ig-dock-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#fdf497" />
                          <stop offset="5%" stopColor="#fdf497" />
                          <stop offset="45%" stopColor="#fd5949" />
                          <stop offset="60%" stopColor="#d6249f" />
                          <stop offset="90%" stopColor="#285AEB" />
                        </linearGradient>
                      </defs>
                      <path fill="url(#ig-dock-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  ) : (resolvedVideo.platform === 'terabox' || isTeraBoxUrl(inputUrl)) ? (
                    <svg className="w-5 h-5 fill-cyan-400" viewBox="0 0 24 24">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                    </svg>
                  ) : (
                    <Film className="w-5 h-5 text-sky-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="tp-player-title">{resolvedVideo.title}</h2>
                  <div className="tp-player-meta-tags">
                    {isYouTubeMode ? (
                      <>
                        <span className="text-red-400 font-medium whitespace-nowrap">YouTube Studio</span>
                        <span className="text-[var(--tp-muted)]">•</span>
                        <span className="font-mono whitespace-nowrap">ID: {resolvedVideo.youtube_id}</span>
                        <span className="text-[var(--tp-muted)]">•</span>
                        <span className="text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                          <ShieldCheck className="w-3 h-3 shrink-0" /> Ready
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-cyan-400 font-medium capitalize whitespace-nowrap">{resolvedVideo.platform || 'Universal'} Stream</span>
                        <span className="text-[var(--tp-muted)]">•</span>
                        <span className="font-mono whitespace-nowrap">{resolvedVideo.size || 'HD Quality'}</span>
                        <span className="text-[var(--tp-muted)]">•</span>
                        {resolvedVideo.is_mock ? (
                          <span className="text-amber-400 flex items-center gap-1 whitespace-nowrap">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> Demo sample
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                            <ShieldCheck className="w-3 h-3 shrink-0" /> Active
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleCopyDirectLink}
                  className="tp-btn tp-btn-secondary"
                  style={{ height: '34px', fontSize: '12px' }}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* UNIVERSAL DOCK TAB NAVIGATION */}
            {/* UNIVERSAL DOCK TAB NAVIGATION */}
            <div id="studio-tabs-nav" className="flex items-center border-b border-[var(--tp-border-subtle)] px-2 sm:px-6 py-2 overflow-x-auto scrollbar-none flex-nowrap gap-1.5">
              {[
                { id: 'downloads', label: 'Downloads', icon: ArrowDownToLine, count: videoFormats.length + audioFormats.length > 0 ? (videoFormats.length + audioFormats.length) : null, countColor: 'text-emerald-700 dark:text-emerald-400' },
                { id: 'transcript', label: 'Transcripts', icon: Captions, badge: 'Upcoming', badgeColor: 'text-amber-500/90 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
                { id: 'thumbnails', label: 'Thumbnails', icon: Images, count: coverTiers.length > 0 ? (isTrueCarousel ? `${carouselSlides.length} Slides` : timelineScenes.length > 0 ? `${timelineScenes.length + 1} Visuals` : '1080p HD') : null, countColor: 'text-sky-700 dark:text-sky-400' },
                { id: 'player', label: 'Player', icon: PlayCircle },
              ].map((tab) => {
                const isActive = youtubeTab === tab.id;
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setYoutubeTab(tab.id as 'downloads' | 'transcript' | 'thumbnails' | 'player')}
                    className={`flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap ${
                      isActive
                        ? 'bg-[var(--tp-mid)]/15 border border-[var(--tp-mid)]/35 text-[var(--tp-mid)] shadow-sm dark:bg-gradient-to-b dark:from-[#2659d9] dark:to-[#123bb0] dark:border-transparent dark:text-white dark:shadow-[0_4px_14px_rgba(6,23,74,0.6),0_0_12px_rgba(38,89,217,0.35)]'
                        : 'border border-transparent text-[var(--tp-muted)] hover:text-[var(--tp-ink)] hover:bg-white/5'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>{tab.label}</span>
                    {tab.count !== null && tab.count !== undefined && (
                      <span className={`text-[10px] font-mono ${isActive ? 'text-white/90' : tab.countColor}`}>
                        {tab.count}
                      </span>
                    )}
                    {tab.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${tab.badgeColor}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB 0: VIDEO & AUDIO DOWNLOADS STUDIO */}
            {youtubeTab === 'downloads' && (
              <div className="p-4 sm:p-6 space-y-8">
                {/* TOP SECTION: SIDE-BY-SIDE VIDEO PLAYER & QUICK ACTIONS CARD (IMAGE 3) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT: EMBEDDED LIVE PLAYER */}
                  <div className={`${isVerticalMedia ? 'lg:col-span-6 xl:col-span-5 mx-auto w-full max-w-md lg:max-w-none' : 'lg:col-span-7'} space-y-2`}>
                    <div id="studio-player-frame" className={`relative ${isVerticalMedia ? 'aspect-[3/4] max-h-[640px] max-w-[480px] mx-auto' : 'aspect-video'} rounded-2xl overflow-hidden bg-black group`}>
                      {isYouTubeMode && resolvedVideo.youtube_id ? (
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube-nocookie.com/embed/${resolvedVideo.youtube_id}?autoplay=0&rel=0`}
                          title={resolvedVideo.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : (resolvedVideo.platform === 'terabox' || isTeraBoxUrl(inputUrl)) ? (
                        resolvedVideo.m3u8_url && resolvedVideo.m3u8_url.includes('/api/stream-download') ? (
                          <CustomVideoPlayer
                            videoUrl={resolvedVideo.m3u8_url}
                            poster={resolvedVideo.thumbnail}
                            fallbackUrls={playerFallbackUrls}
                            qualities={playerQualities}
                            animeTitle={resolvedVideo.title}
                            episodeNumber={1}
                          />
                        ) : (
                          <iframe
                            className="w-full h-full border-0"
                            src={resolvedVideo.embed_url || `https://www.1024tera.com/sharing/embed?surl=${(resolvedVideo.shareId || '').replace(/^1/, '')}`}
                            title={resolvedVideo.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        )
                      ) : resolvedVideo.platform === 'vimeo' && resolvedVideo.shareId ? (
                        <iframe
                          className="w-full h-full"
                          src={`https://player.vimeo.com/video/${resolvedVideo.shareId}?autoplay=0`}
                          title={resolvedVideo.title}
                          allow="accelerometer; autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        />
                      ) : isImageMedia ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-black/95 select-none overflow-hidden">
                          <img
                            src={carouselSlides[activeSlideIndex]?.url || resolvedVideo.thumbnail || resolvedVideo.m3u8_url}
                            alt={resolvedVideo.title}
                            className="w-full h-full object-contain transition-opacity duration-300"
                          />
                          {carouselSlides.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveSlideIndex((prev) => (prev > 0 ? prev - 1 : carouselSlides.length - 1))}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-colors active:opacity-85 shadow-xl backdrop-blur-md"
                                aria-label="Previous slide"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveSlideIndex((prev) => (prev < carouselSlides.length - 1 ? prev + 1 : 0))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-colors active:opacity-85 shadow-xl backdrop-blur-md"
                                aria-label="Next slide"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-xs font-mono font-bold text-white flex items-center gap-2 shadow-lg">
                                <span>Slide {activeSlideIndex + 1} of {carouselSlides.length}</span>
                                <span className="w-1 h-1 rounded-full bg-white/40" />
                                <span className="text-[#e4f222]">{resolvedVideo.thumbnails?.[activeSlideIndex]?.resolution || '1080p Original'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <CustomVideoPlayer
                          videoUrl={resolvedVideo.m3u8_url || resolvedVideo.fast_download_url}
                          poster={resolvedVideo.thumbnail}
                          fallbackUrls={playerFallbackUrls}
                          qualities={playerQualities}
                          animeTitle={resolvedVideo.title}
                          episodeNumber={1}
                        />
                      )}
                    </div>
                  </div>

                  {/* RIGHT: QUICK DOWNLOAD CARD & ACTIONS (IMAGE 3 REFERENCE) */}
                  <div className={`${isVerticalMedia ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-5'} border-t border-[var(--tp-border-card)] pt-5 space-y-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0 ${isQuickDropdownOpen ? 'relative z-30' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20">
                        <Zap className="w-3 h-3 fill-current" />
                        {isImageMedia ? `${carouselSlides.length} Slides` : getStandardResTier(maxVideo?.height || bestVideo?.height)}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--tp-muted)] capitalize">
                        Source: {isYouTubeMode ? 'YouTube' : (resolvedVideo.platform || 'Universal')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[var(--tp-ink)] leading-snug line-clamp-2">
                        {resolvedVideo.title}
                      </h3>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {isImageMedia && (
                        <a
                          href={carouselSlides[activeSlideIndex]?.url || resolvedVideo.m3u8_url}
                          download={`instagram_slide_${activeSlideIndex + 1}.jpg`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-bold text-xs sm:text-sm hover:bg-cyan-500/25 transition-colors"
                        >
                          <Download className="w-4 h-4 fill-current" />
                          <span>Download Slide {activeSlideIndex + 1} (1080p JPG)</span>
                        </a>
                      )}

                      {/* Action 2: Split Download Dropdown (Image 3) */}
                      <div className={`relative ${isQuickDropdownOpen ? 'z-40' : ''}`} ref={quickDropdownRef}>
                        <div className="flex items-stretch rounded-xl">
                          <a
                            href={isImageMedia ? (carouselSlides[activeSlideIndex]?.url || resolvedVideo.m3u8_url) : (bestVideo?.download_url || bestVideo?.url)}
                            download={isImageMedia ? `instagram_slide_${activeSlideIndex + 1}.jpg` : undefined}
                            target={isImageMedia ? "_blank" : undefined}
                            rel={isImageMedia ? "noreferrer" : undefined}
                            onClick={(e) => {
                              if (!isImageMedia && !bestVideo) {
                                e.preventDefault();
                                toast.info('Analyzing streams... Please wait a moment.');
                              }
                            }}
                            className={`tp-btn tp-btn-download flex-1 justify-center rounded-r-none border-r border-black/20 active:opacity-90 ${
                              !isImageMedia && !bestVideo ? 'opacity-60 cursor-not-allowed' : ''
                            }`}
                            style={{ height: '44px', fontSize: '13px' }}
                          >
                            <Download className="w-4 h-4" />
                            <span>
                              {isImageMedia
                                ? `Download Slide ${activeSlideIndex + 1} (1080p)`
                                : bestVideo
                                ? `Download Video (${getShortResTag(bestVideo.height)})`
                                : 'Analyzing Streams...'}
                            </span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setIsQuickDropdownOpen(!isQuickDropdownOpen)}
                            className="tp-btn tp-btn-download rounded-l-none px-3.5 active:opacity-90"
                            style={{ height: '44px' }}
                            title={isImageMedia ? "Select carousel slide" : "Select quick download quality"}
                            aria-expanded={isQuickDropdownOpen}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isQuickDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {/* Backdrop overlay: closes dropdown when clicking anywhere outside */}
                        {isQuickDropdownOpen && (
                          <div
                            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
                            onClick={() => setIsQuickDropdownOpen(false)}
                          />
                        )}

                        {/* Dropdown Menu Popover */}
                        {isQuickDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-full sm:w-[340px] max-h-[min(520px,75vh)] overflow-y-auto overscroll-contain bg-white dark:bg-[#090f22] border border-[var(--tp-border-card)] rounded-2xl p-2.5 shadow-2xl shadow-black/60 z-50 scrollbar-thin">
                            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--tp-muted)] px-3 py-1 flex items-center justify-between">
                              <span>{isImageMedia ? 'Carousel Slides (1080p JPG)' : 'Video Qualities (MP4)'}</span>
                              <span className="text-[9px] text-[#e4f222]">{isImageMedia ? `${carouselSlides.length} Slides` : 'Standard Res'}</span>
                            </div>
                            <div className="space-y-0.5">
                              {isImageMedia ? (
                                carouselSlides.map((slide, idx) => (
                                  <a
                                    key={idx}
                                    href={slide.url}
                                    download={`instagram_slide_${idx + 1}.jpg`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => {
                                      setActiveSlideIndex(idx);
                                      setIsQuickDropdownOpen(false);
                                    }}
                                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-[var(--tp-paper-input)] active:opacity-90 text-[var(--tp-ink)] font-medium transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <ImageIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                      <span className="font-semibold">Slide {idx + 1} of {carouselSlides.length}</span>
                                    </span>
                                    <span className="text-[10px] font-mono tabular-nums text-sky-300 dark:text-sky-300 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded shrink-0">
                                      1080p HD
                                    </span>
                                  </a>
                                ))
                              ) : (
                                videoFormats.map((vf) => {
                                const isCinema = isCinemaWidescreen(vf.height);
                                const tier = getFormatDisplayTier(vf);
                                return (
                                  <a
                                    key={vf.format_id}
                                    href={vf.download_url || vf.url}
                                    download
                                    onClick={() => setIsQuickDropdownOpen(false)}
                                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-[var(--tp-paper-input)] active:opacity-90 text-[var(--tp-ink)] font-medium transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Film className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                      <span className="font-semibold">
                                        {tier}
                                        {!vf.has_audio && (
                                          <span className="ml-1.5 text-[10px] text-amber-400/90 font-normal">
                                            (Video Only)
                                          </span>
                                        )}
                                        {isCinema && (
                                          <span className="ml-1.5 text-[10px] text-[var(--tp-muted)] font-mono font-normal">
                                            ({vf.height}p)
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                    <span className="text-[10px] font-mono tabular-nums text-sky-300 dark:text-sky-300 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded shrink-0">
                                      {vf.filesize}
                                    </span>
                                  </a>
                                );
                              })
                            )}
                            </div>

                          </div>
                        )}
                      </div>

                      {/* Action 3: Split MP3 Download Dropdown (audio twin of Action 2) */}
                      {bestAudio && (
                        <div className={'relative ' + (isAudioDropdownOpen ? 'z-40' : '')} ref={audioDropdownRef}>
                          <div className="flex items-stretch rounded-xl">
                            <a
                              href={getFormatDownloadHref(bestAudio)}
                              download={getFormatDownloadFilename(bestAudio)}
                              className="tp-btn tp-btn-download-audio flex-1 justify-center rounded-r-none border-r border-black/20 active:opacity-90"
                              style={{ height: '44px', fontSize: '13px' }}
                            >
                              <Download className="w-4 h-4" />
                              <span>Download Audio (MP3 320 kbps)</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => setIsAudioDropdownOpen(!isAudioDropdownOpen)}
                              className="tp-btn tp-btn-download-audio rounded-l-none px-3.5 active:opacity-90"
                              style={{ height: '44px' }}
                              title="Select audio bitrate"
                              aria-expanded={isAudioDropdownOpen}
                            >
                              <ChevronDown className={'w-4 h-4 transition-transform duration-200 ' + (isAudioDropdownOpen ? 'rotate-180' : '')} />
                            </button>
                          </div>

                          {isAudioDropdownOpen && (
                            <div
                              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
                              onClick={() => setIsAudioDropdownOpen(false)}
                            />
                          )}

                          {isAudioDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-full sm:w-[340px] max-h-[min(520px,75vh)] overflow-y-auto overscroll-contain bg-white dark:bg-[#090f22] border border-[var(--tp-border-card)] rounded-2xl p-2.5 shadow-2xl shadow-black/60 z-50 scrollbar-thin">
                              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--tp-muted)] px-3 py-1 flex items-center justify-between">
                                <span>Audio Tracks (MP3 / AAC)</span>
                                <span className="text-[9px] text-emerald-400">Audio Only</span>
                              </div>
                              {audioFormats.length > 0 ? (
                                <div className="space-y-0.5">
                                  {audioFormats.map((af) => (
                                    <a
                                      key={af.format_id}
                                      href={af.download_url || af.url}
                                      download
                                      onClick={() => setIsAudioDropdownOpen(false)}
                                      className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-[var(--tp-paper-input)] active:opacity-90 text-[var(--tp-ink)] font-medium transition-colors"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span className="truncate">{af.quality}</span>
                                      </span>
                                      <span className="text-[10px] font-mono tabular-nums text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded shrink-0">
                                        {af.filesize}
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-3 py-2 text-[11px] font-mono text-[var(--tp-muted)]">
                                  Analyzing audio tracks...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}


                    </div>
                  </div>
                </div>

                {/* BOTTOM SECTION: SEGMENTED SWITCHER & QUALITY TABLE (IMAGE 4 & 5) */}
                <div className="space-y-4 pt-4 border-t border-[var(--tp-border-subtle)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-[var(--tp-ink)]">Full Quality Downloads</h4>
                      <p className="text-xs text-[var(--tp-muted)]">Select MP4 video resolution or MP3 audio bitrate for 1-click download.</p>
                    </div>

                    {/* Format switcher: underline tabs, same grammar as the studio tab bar */}
                    <div className="flex items-center gap-1 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setDownloadFormatTab('video')}
                        className={`flex items-center gap-2 px-3 py-2 border-b-2 text-xs sm:text-sm font-semibold transition-colors ${
                          downloadFormatTab === 'video'
                            ? 'border-[var(--tp-mid)] text-[var(--tp-mid)] dark:border-[#e4f222] dark:text-[#e4f222]'
                            : 'border-transparent text-[var(--tp-muted)] hover:text-[var(--tp-ink)]'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        <span>MP4 (Video)</span>
                        {videoFormats.length > 0 && (
                          <span className="text-[10px] font-mono">{videoFormats.length}</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDownloadFormatTab('audio')}
                        className={`flex items-center gap-2 px-3 py-2 border-b-2 text-xs sm:text-sm font-semibold transition-colors ${
                          downloadFormatTab === 'audio'
                            ? 'border-[var(--tp-mid)] text-[var(--tp-mid)] dark:border-[#e4f222] dark:text-[#e4f222]'
                            : 'border-transparent text-[var(--tp-muted)] hover:text-[var(--tp-ink)]'
                        }`}
                      >
                        <Music className="w-4 h-4" />
                        <span>MP3 (Audio)</span>
                        {audioFormats.length > 0 && (
                          <span className="text-[10px] font-mono">{audioFormats.length}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {downloadFormatTab === 'video' && videoFormats.some((f) => !f.has_audio && !f.can_mux) && (
                    <div className="flex items-start gap-2.5 pl-3.5 border-l-2 border-amber-500/50 text-xs text-amber-700 dark:text-amber-300">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-amber-700 dark:text-amber-300">Audio Availability Notice:</span>
                        <p className="text-amber-600 dark:text-amber-200/80 leading-relaxed text-[11px]">
                          Some video streams do not have an audio track attached by the host platform. Formats without sound are tagged with the <strong>Video Only</strong> badge.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quality Table */}
                  {isLoading && activeFormats.length === 0 ? (
                    <div className="py-6 text-center space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-[var(--tp-accent)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-semibold text-[var(--tp-ink)]">
                          Analyzing {isYouTubeMode ? 'YouTube' : (resolvedVideo?.platform ? resolvedVideo.platform.toUpperCase() : 'Media')} Streams...
                        </span>
                      </div>
                      <p className="text-xs text-[var(--tp-muted)] max-w-md mx-auto font-mono">
                        Extracting real 1080p Full HD, 720p HD, and master MP3 tracks directly from edge CDN nodes.
                      </p>
                    </div>
                  ) : activeFormats.length > 0 ? (
                    <>
                      {/* MOBILE FORMAT CARDS (SM:HIDDEN) */}
                      <div className="block sm:hidden space-y-2.5">
                        {activeFormats.map((fmt, idx) => {
                          const tier = getFormatDisplayTier(fmt);
                          const desc = getFormatDisplayDescription(fmt);
                          return (
                            <div key={fmt.format_id || idx} className="tp-mobile-format-card">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="mt-0.5 shrink-0">
                                    {fmt.is_audio_only ? (
                                      <Music className="w-4 h-4 text-amber-500" />
                                    ) : (
                                      <Film className="w-4 h-4 text-sky-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-[var(--tp-ink)] text-xs flex items-center flex-wrap gap-1.5">
                                      <span>{tier}</span>
                                      <span className="text-[10px] uppercase font-mono font-bold text-[var(--tp-muted)]">
                                        {fmt.ext}
                                      </span>
                                      {!fmt.is_audio_only && !fmt.has_audio && (
                                         <span className="text-[10px] text-amber-500 dark:text-amber-400 font-mono font-medium inline-flex items-center gap-1">
                                           <VolumeX className="w-3 h-3" /> Video Only
                                         </span>
                                       )}
                                    </div>
                                    <div className="text-[10px] text-[var(--tp-muted)] font-mono mt-0.5">
                                      {desc}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono tabular-nums text-[var(--tp-ink)] shrink-0 self-start">
                                  {fmt.filesize || 'Direct Stream'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 pt-1.5 border-t border-[var(--tp-border-subtle)]">
                                <a
                                  href={getFormatDownloadHref(fmt)}
                                  download={getFormatDownloadFilename(fmt)}
                                  className="tp-btn tp-btn-download flex-1 justify-center active:opacity-90"
                                  style={{ height: '36px', fontSize: '12px' }}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download {fmt.is_audio_only ? 'Audio' : 'Video'}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    try {
                                      await navigator.clipboard.writeText(fmt.url);
                                      toast.success('Direct stream link copied!');
                                    } catch {
                                      toast.error('Could not copy link');
                                    }
                                  }}
                                  className="tp-btn tp-btn-ghost px-3 active:opacity-90 shrink-0"
                                  style={{ height: '36px', fontSize: '12px' }}
                                  title="Copy direct stream link"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* DESKTOP QUALITY TABLE (HIDDEN SM:BLOCK) */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--tp-border-card)] text-[11px] font-mono text-[var(--tp-muted)] uppercase tracking-wider">
                              <th className="py-3 px-4 sm:px-6">Quality / Bitrate</th>
                              <th className="py-3 px-4">Format</th>
                              <th className="py-3 px-4">File Size</th>
                              <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--tp-border-subtle)] text-xs">
                            {activeFormats.map((fmt, idx) => (
                              <tr key={fmt.format_id || idx} className="hover:bg-[var(--tp-paper-input)]/60 transition-colors group">
                                <td className="py-3.5 px-4 sm:px-6 font-semibold text-[var(--tp-ink)]">
                                  <div className="flex items-center gap-2.5">
                                    {fmt.is_audio_only ? (
                                      <Music className="w-4 h-4 text-amber-500 shrink-0" />
                                    ) : (
                                      <Film className="w-4 h-4 text-sky-400 shrink-0" />
                                    )}
                                    <div>
                                      <div className="font-bold text-[var(--tp-ink)] text-xs sm:text-sm flex items-center gap-1.5">
                                        <span>{getFormatDisplayTier(fmt)}</span>
                                        {!fmt.is_audio_only && !fmt.has_audio && (
                                           <span className="text-[10px] text-amber-500 dark:text-amber-400 font-mono font-medium inline-flex items-center gap-1">
                                             <VolumeX className="w-3 h-3" /> Video Only (Mute)
                                           </span>
                                         )}
                                      </div>
                                      <div className="text-[10px] text-[var(--tp-muted)] font-mono">
                                        {getFormatDisplayDescription(fmt)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-mono">
                                  <span className="text-[10px] uppercase font-bold text-[var(--tp-muted)]">
                                    {fmt.ext}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-mono tabular-nums">
                                  <span className="text-[11px] font-mono tabular-nums text-[var(--tp-ink)]">
                                    {fmt.filesize || 'Direct Stream'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 sm:px-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <a
                                      href={getFormatDownloadHref(fmt)}
                                      download={getFormatDownloadFilename(fmt)}
                                      className="tp-btn tp-btn-download active:opacity-90"
                                      style={{ height: '34px', fontSize: '11px', padding: '0 14px' }}
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        try {
                                          await navigator.clipboard.writeText(fmt.url);
                                          toast.success('Direct stream link copied!');
                                        } catch {
                                          toast.error('Could not copy link');
                                        }
                                      }}
                                      className="tp-btn tp-btn-ghost active:opacity-90"
                                      style={{ height: '34px', fontSize: '11px', padding: '0 10px' }}
                                      title="Copy direct stream link"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 space-y-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-rose-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-bold">No Downloadable Streams Available</span>
                      </div>
                      <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                        This video could not be resolved from {isYouTubeMode ? 'YouTube' : (resolvedVideo?.platform ? resolvedVideo.platform.toUpperCase() : 'the host platform')}. It may be restricted, private, region-blocked, or removed by the creator.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: TRANSCRIPT & SUBTITLES STUDIO */}
            {youtubeTab === 'transcript' && (
              <div className="p-4 sm:p-6 space-y-4">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--tp-paper-input)] p-3.5 rounded-2xl border border-[var(--tp-border-card)]">
                  {/* Search box */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-[var(--tp-muted)] absolute left-3 top-3" />
                    <input
                      type="text"
                      className="w-full bg-[var(--tp-paper-elevated)] border border-[var(--tp-border-card)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--tp-ink)] placeholder-[var(--tp-muted)] focus:outline-none focus:border-[var(--tp-mid)] dark:focus:border-[#e4f222]"
                      placeholder="Search within transcript..."
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                    />
                    {transcriptSearch && (
                      <button
                        type="button"
                        onClick={() => setTranscriptSearch('')}
                        className="absolute right-3 top-2.5 text-xs text-[var(--tp-muted)] hover:text-[var(--tp-ink)]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Timestamps toggle and export buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTimestamps(!showTimestamps)}
                      className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        showTimestamps
                          ? 'border-[var(--tp-accent)] bg-[var(--tp-accent)]/15 text-[var(--tp-accent-ink)] dark:text-[#e4f222]'
                          : 'border-[var(--tp-border-card)] bg-[var(--tp-paper-elevated)] text-[var(--tp-muted)] hover:text-[var(--tp-ink)] hover:bg-[var(--tp-paper-input)]'
                      }`}
                      title="Toggle timestamp markers"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{showTimestamps ? 'Timestamps ON' : 'Timestamps OFF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateAiTranscript(false)}
                      disabled={isTranscribing}
                      className="tp-btn tp-btn-secondary"
                      style={{ height: '36px', fontSize: '12px' }}
                      title="Transcribe or regenerate subtitles using Groq Whisper AI"
                    >
                      {isTranscribing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-[#e4f222]" />
                      )}
                      <span>{isTranscribing ? 'Transcribing...' : 'AI Transcribe'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyTranscript}
                      className="tp-btn tp-btn-secondary"
                      style={{ height: '36px', fontSize: '12px' }}
                    >
                      {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedTranscript ? 'Copied' : 'Copy Transcript'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="tp-btn tp-btn-secondary"
                      style={{ height: '36px', fontSize: '12px' }}
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
                      <span>Download .TXT</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadSrt}
                      className="tp-btn tp-btn-download"
                      style={{ height: '36px', fontSize: '12px' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .SRT</span>
                    </button>
                  </div>
                </div>

                {/* Subtitle list container */}
                <div className="border border-[var(--tp-border-card)] rounded-2xl bg-[var(--tp-paper-card)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--tp-paper-input)] border-b border-[var(--tp-border-subtle)] text-xs text-[var(--tp-muted)]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--tp-ink)]">Transcript Cues</span>
                      <span>•</span>
                      <span>Showing {transcriptItems.length} lines</span>
                      {resolvedVideo.transcript?.language && (
                        <span className="bg-[var(--tp-paper-elevated)] px-2 py-0.5 rounded text-[10px] text-[var(--tp-ink)] border border-[var(--tp-border-subtle)] uppercase font-mono">
                          {resolvedVideo.transcript.language}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--tp-muted)]">1-click subtitle export</span>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-2 divide-y divide-[var(--tp-border-subtle)]">
                    {transcriptItems.length > 0 ? (
                      transcriptItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="pt-2 first:pt-0 flex items-start gap-3 group hover:bg-[var(--tp-paper-input)]/50 p-2 rounded-xl transition-colors"
                        >
                          {showTimestamps && (
                            <span className="shrink-0 text-xs font-mono font-bold text-sky-300 dark:text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg">
                              {formatTime(item.start)}
                            </span>
                          )}
                          <p className="text-sm leading-relaxed text-[var(--tp-ink)] select-text flex-1">
                            {item.text}
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(item.text);
                              toast.success('Line copied');
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[var(--tp-muted)] hover:text-[var(--tp-ink)] transition-opacity"
                            title="Copy this line"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center space-y-4 max-w-md mx-auto">
                        {transcriptSearch ? (
                          <div className="space-y-3">
                            <Info className="w-8 h-8 text-[var(--tp-muted)] mx-auto" />
                            <p className="text-sm text-[var(--tp-muted)]">
                              No matching cues found for "{transcriptSearch}".
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTranscriptSearch('')}
                              className="border-[var(--tp-border-card)] text-xs text-[var(--tp-ink)] bg-[var(--tp-paper-input)]"
                            >
                              Clear Search
                            </Button>
                          </div>
                        ) : isTranscribing ? (
                          <div className="space-y-3 py-6">
                            <RefreshCw className="w-8 h-8 animate-spin text-[var(--tp-mid)] dark:text-[#e4f222] mx-auto" />
                            <p className="text-sm font-semibold text-[var(--tp-ink)]">
                              Transcribing audio with Groq Whisper AI...
                            </p>
                            <p className="text-xs text-[var(--tp-muted)]">
                              Extracting media stream & querying whisper-large-v3-turbo model
                            </p>
                          </div>
                        ) : transcribeNotice ? (
                          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-3">
                            <div className="flex items-start gap-2.5">
                              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                              <div className="space-y-1 flex-1">
                                <p className="text-xs font-bold text-amber-500 dark:text-amber-300">
                                  Transcription Notice ({transcribeNotice.code || 'NOTICE'})
                                </p>
                                <p className="text-xs text-[var(--tp-muted)] leading-relaxed">
                                  {transcribeNotice.message}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20">
                              <Button
                                size="sm"
                                onClick={() => handleGenerateAiTranscript(true)}
                                className="tp-btn tp-btn-primary text-xs"
                                style={{ height: '32px' }}
                              >
                                Load Demo Transcripts (1-Click)
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateAiTranscript(false)}
                                className="border-[var(--tp-border-card)] text-xs text-[var(--tp-ink)] bg-[var(--tp-paper-input)]"
                                style={{ height: '32px' }}
                              >
                                Retry
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-[#e4f222] flex items-center justify-center mx-auto">
                              <Sparkles className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-sm font-semibold text-[var(--tp-ink)]">
                                No closed captions found for this {resolvedVideo?.platform ? resolvedVideo.platform.toUpperCase() : 'media'}
                              </h3>
                              <p className="text-xs text-[var(--tp-muted)] leading-relaxed">
                                Generate instant, accurate timestamped subtitles using Groq Whisper (whisper-large-v3-turbo) or load demo cues.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                              <Button
                                type="button"
                                onClick={() => handleGenerateAiTranscript(false)}
                                disabled={isTranscribing}
                                className="tp-btn tp-btn-primary text-xs flex items-center gap-1.5"
                                style={{ height: '36px' }}
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>Generate AI Transcript (Groq Whisper)</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateAiTranscript(true)}
                                className="border-[var(--tp-border-card)] text-xs text-[var(--tp-ink)] bg-[var(--tp-paper-input)]"
                                style={{ height: '36px' }}
                              >
                                Load Demo Transcripts
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: THUMBNAIL STUDIO */}
            {youtubeTab === 'thumbnails' && (
              <div className="p-4 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--tp-ink)]">
                      {isTrueCarousel
                        ? 'Full-Resolution Carousel Slides & Artwork'
                        : thumbnailSubTab === 'scenes'
                        ? 'Extracted Video Timeline Scenes'
                        : 'Full-Resolution Video Cover & Poster'}
                    </h3>
                    <p className="text-xs text-[var(--tp-muted)] mt-0.5">
                      {isTrueCarousel
                        ? 'Download high-definition artwork and carousel slides in original lossless quality.'
                        : thumbnailSubTab === 'scenes'
                        ? `Extracted ${timelineScenes.length} visual scene snapshots captured throughout the video timeline.`
                        : 'Select your preferred cover quality and download in 1 click.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                    {isTrueCarousel && carouselSlides.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDownloadAllThumbnails}
                        className="tp-btn tp-btn-download flex items-center gap-1.5 shadow-md"
                        style={{ height: '34px', fontSize: '11px', padding: '0 12px' }}
                        title="Download all slides sequentially"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download All ({carouselSlides.length} Slides)</span>
                      </button>
                    )}
                    {!isTrueCarousel && thumbnailSubTab === 'scenes' && timelineScenes.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDownloadAllScenes}
                        className="tp-btn tp-btn-download flex items-center gap-1.5 shadow-md"
                        style={{ height: '34px', fontSize: '11px', padding: '0 12px' }}
                        title="Download all extracted timeline scenes sequentially"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download All Scenes ({timelineScenes.length})</span>
                      </button>
                    )}
                    <span className="text-xs font-mono font-semibold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                      {isTrueCarousel
                        ? `${carouselSlides.length} Slides Available`
                        : thumbnailSubTab === 'scenes'
                        ? `${timelineScenes.length} Scenes Available`
                        : `${coverTiers.length} Quality Tiers Available`}
                    </span>
                  </div>
                </div>

                {/* Sub-tab Pill Switcher between Official Cover vs Timeline Scenes */}
                {!isTrueCarousel && timelineScenes.length > 0 && (
                  <div className="flex items-center gap-1 p-1 bg-[var(--tp-paper-input)] border border-[var(--tp-border-subtle)] rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setThumbnailSubTab('cover')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                        thumbnailSubTab === 'cover'
                          ? 'bg-[var(--tp-paper-elevated)] text-[var(--tp-ink)] shadow-sm border border-[var(--tp-border-subtle)] font-bold'
                          : 'text-[var(--tp-muted)] hover:text-[var(--tp-ink)] border border-transparent'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#e4f222]" />
                      <span>Official Video Cover</span>
                      <span className="text-[10px] font-mono text-[#e4f222] bg-[#e4f222]/15 px-1.5 py-0.5 rounded-md">
                        {coverTiers.length} Qualities
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThumbnailSubTab('scenes')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                        thumbnailSubTab === 'scenes'
                          ? 'bg-[var(--tp-paper-elevated)] text-[var(--tp-ink)] shadow-sm border border-[var(--tp-border-subtle)] font-bold'
                          : 'text-[var(--tp-muted)] hover:text-[var(--tp-ink)] border border-transparent'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5 text-sky-400" />
                      <span>Video Timeline Scenes</span>
                      <span className="text-[10px] font-mono text-sky-400 bg-sky-400/15 px-1.5 py-0.5 rounded-md">
                        {timelineScenes.length} Scenes
                      </span>
                    </button>
                  </div>
                )}

                {!isTrueCarousel ? (
                  thumbnailSubTab === 'cover' ? (
                    activeCoverTier ? (
                    <div className="rounded-2xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-card)] backdrop-blur-xl p-4 sm:p-6 shadow-xl space-y-5">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Artwork Preview */}
                        <div className="lg:col-span-7">
                          <div className={`relative ${isVerticalMedia ? 'aspect-[3/4] max-h-[520px] max-w-[390px] mx-auto' : 'aspect-video'} rounded-2xl overflow-hidden bg-black/80 border border-[var(--tp-border-subtle)] shadow-2xl group`}>
                            <img
                              src={activeCoverTier.url}
                              alt={`${resolvedVideo.title} cover`}
                              className="w-full h-full object-cover transition-transform duration-300 ease-spring group-hover:scale-[1.03]"
                              loading="lazy"
                              onError={(e) => {
                                if (resolvedVideo.youtube_id && !activeCoverTier.url.includes('hqdefault.jpg')) {
                                  (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/hqdefault.jpg`;
                                }
                              }}
                            />
                            {/* Resolution badge in preview corner */}
                            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-[11px] font-mono text-white px-2.5 py-1 rounded-lg border border-white/15 shadow-lg flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>{activeCoverTier.res}</span>
                            </div>
                          </div>
                        </div>

                        {/* Details & Dropdown Action Card */}
                        <div className="lg:col-span-5 space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${activeCoverTier.badgeColor}`}>
                                {activeCoverTier.badge}
                              </span>
                              <span className="text-xs font-mono text-[var(--tp-muted)]">
                                {activeCoverTier.sublabel}
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-[var(--tp-ink)] leading-snug line-clamp-2">
                              {resolvedVideo.title}
                            </h4>
                            <p className="text-xs text-[var(--tp-muted)] font-mono">
                              Resolution: <span className="text-[var(--tp-ink)] font-bold">{activeCoverTier.res}</span> • Format: <span className="text-[var(--tp-ink)] font-bold">Lossless JPG</span>
                            </p>
                          </div>

                          {/* Split Download Dropdown (Matching Golden Reference Image 4) */}
                          <div className="relative pt-2" ref={coverDropdownRef}>
                            <div className="flex items-stretch rounded-xl shadow-md">
                              <button
                                type="button"
                                onClick={() => handleDownloadThumbnail(activeCoverTier.url, activeCoverTier.tag)}
                                className="tp-btn tp-btn-download flex-1 justify-center rounded-r-none border-r border-black/20 active:opacity-90"
                                style={{ height: '44px', fontSize: '13px' }}
                              >
                                <Download className="w-4 h-4" />
                                <span>Download Cover ({activeCoverTier.tag.toUpperCase()})</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setIsCoverDropdownOpen(!isCoverDropdownOpen)}
                                className="tp-btn tp-btn-download rounded-l-none px-3.5 active:opacity-90"
                                style={{ height: '44px' }}
                                title="Select thumbnail quality"
                                aria-expanded={isCoverDropdownOpen}
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCoverDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>
                            </div>

                            {/* Dropdown Menu Popover */}
                            {isCoverDropdownOpen && (
                              <div className="absolute left-0 right-0 top-full mt-2 w-full bg-white dark:bg-[#090f22] border border-[var(--tp-border-card)] rounded-2xl p-2.5 shadow-2xl shadow-black/60 z-50">
                                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--tp-muted)] px-3 py-1 flex items-center justify-between">
                                  <span>Select Quality</span>
                                  <span className="text-[9px] text-[#e4f222]">Lossless JPG</span>
                                </div>
                                <div className="space-y-1 mt-1">
                                  {coverTiers.map((tier) => (
                                    <button
                                      key={tier.tag}
                                      type="button"
                                      onClick={() => {
                                        setSelectedCoverTag(tier.tag);
                                        setIsCoverDropdownOpen(false);
                                        handleDownloadThumbnail(tier.url, tier.tag);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-colors ${
                                        activeCoverTier.tag === tier.tag
                                          ? 'bg-[var(--tp-mid)]/20 text-[#e4f222] font-bold border border-[#e4f222]/30'
                                          : 'hover:bg-[var(--tp-paper-input)] text-[var(--tp-ink)] font-medium border border-transparent'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <ImageIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                        <span>{tier.label}</span>
                                      </span>
                                      <span className="text-[10px] font-mono tabular-nums text-sky-300 dark:text-sky-300 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded shrink-0">
                                        {tier.res}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Secondary actions: Preview in new tab & Copy Link */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <a
                              href={activeCoverTier.url}
                              target="_blank"
                              rel="noreferrer"
                              className="tp-btn tp-btn-secondary flex items-center justify-center gap-1.5 w-full text-center"
                              style={{ height: '36px', fontSize: '12px' }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Preview Full Size</span>
                            </a>

                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(activeCoverTier.url);
                                  toast.success('Cover image URL copied!');
                                } catch {
                                  toast.error('Failed to copy URL');
                                }
                              }}
                              className="tp-btn tp-btn-secondary flex items-center justify-center gap-1.5 w-full text-center"
                              style={{ height: '36px', fontSize: '12px' }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Image Link</span>
                            </button>
                          </div>

                          <div className="pt-2 border-t border-[var(--tp-border-subtle)] text-[11px] text-[var(--tp-muted)] font-mono">
                            Studio direct extraction • No watermarks added
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-[var(--tp-border-card)] rounded-2xl bg-[var(--tp-paper-card)] p-6">
                      <p className="text-sm text-[var(--tp-muted)]">No cover thumbnails available for this video stream.</p>
                    </div>
                  )
                ) : (
                  /* VIEW: EXTRACTED TIMELINE SCENE SNAPSHOTS */
                  timelineScenes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {timelineScenes.map((scene, idx) => (
                        <div
                          key={scene.url + idx}
                          className="group flex flex-col justify-between rounded-2xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-card)] overflow-hidden p-3.5 space-y-3 transition-colors hover:border-[var(--tp-mid)]/40 hover:shadow-xl"
                        >
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-[var(--tp-border-subtle)] flex items-center justify-center">
                            <img
                              src={scene.url}
                              alt={scene.label}
                              className="w-full h-full object-cover transition-transform duration-300 ease-spring group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-md text-[10px] font-mono text-white/90 px-2 py-0.5 rounded-md border border-white/10 shadow-sm pointer-events-none">
                              {scene.res}
                            </div>
                          </div>

                          <div className="space-y-2.5 pt-0.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <h4 className="text-xs font-bold text-[var(--tp-ink)] truncate">
                                {scene.label}
                              </h4>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border text-sky-400 bg-sky-400/15 border-sky-400/30">
                                Timeline Still
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <a
                                href={scene.url}
                                target="_blank"
                                rel="noreferrer"
                                className="tp-btn tp-btn-secondary flex items-center justify-center gap-1.5 w-full text-center"
                                style={{ height: '34px', fontSize: '11px', padding: '0 6px' }}
                              >
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Preview</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleDownloadThumbnail(scene.url, scene.tag)}
                                className="tp-btn tp-btn-download flex items-center justify-center gap-1.5 w-full text-center font-medium"
                                style={{ height: '34px', fontSize: '11px', padding: '0 6px' }}
                              >
                                <Download className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Download JPG</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-[var(--tp-border-card)] rounded-2xl bg-[var(--tp-paper-card)] p-6">
                      <p className="text-sm text-[var(--tp-muted)]">No timeline scene snapshots available for this video stream.</p>
                    </div>
                  )
                )
              ) : (
                  /* VIEW 2: MULTI-SLIDE CAROUSEL (INSTAGRAM / TIKTOK PHOTO SETS ONLY) */
                  <div className={`grid ${isVerticalMedia ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                    {carouselSlides.map((slide, idx) => (
                      <div
                        key={slide.url + idx}
                        className="group flex flex-col justify-between rounded-2xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-card)] overflow-hidden p-3.5 space-y-3 transition-colors hover:border-[var(--tp-mid)]/40 hover:shadow-xl"
                      >
                        <div className={`relative ${isVerticalMedia ? 'aspect-[3/4]' : 'aspect-video'} rounded-xl overflow-hidden bg-black/60 border border-[var(--tp-border-subtle)] flex items-center justify-center`}>
                          <img
                            src={slide.url}
                            alt={`Slide ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 ease-spring group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-md text-[10px] font-mono text-white/90 px-2 py-0.5 rounded-md border border-white/10 shadow-sm pointer-events-none">
                            {slide.resolution || '1080p Original'}
                          </div>
                        </div>

                        <div className="space-y-2.5 pt-0.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <h4 className="text-xs font-bold text-[var(--tp-ink)] truncate">
                              Slide {idx + 1} of {carouselSlides.length}
                            </h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border text-sky-400 bg-sky-400/15 border-sky-400/30">
                              {idx === 0 ? 'Cover Slide' : 'Slide'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <a
                              href={slide.url}
                              target="_blank"
                              rel="noreferrer"
                              className="tp-btn tp-btn-secondary flex items-center justify-center gap-1.5 w-full text-center"
                              style={{ height: '34px', fontSize: '11px', padding: '0 6px' }}
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Preview</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDownloadThumbnail(slide.url, `slide_${idx + 1}`)}
                              className="tp-btn tp-btn-download flex items-center justify-center gap-1.5 w-full text-center font-medium"
                              style={{ height: '34px', fontSize: '11px', padding: '0 6px' }}
                            >
                              <Download className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Download JPG</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: VIDEO PLAYER (YOUTUBE EMBED OR CUSTOM VIDEO PLAYER OR IMAGE VIEWER) */}
            {youtubeTab === 'player' && (
              <div className={`w-full ${isVerticalMedia ? 'aspect-[3/4] max-h-[720px] max-w-[540px] mx-auto' : 'aspect-video'} bg-black relative flex items-center justify-center`}>
                {isYouTubeMode && resolvedVideo.youtube_id ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${resolvedVideo.youtube_id}?autoplay=1&rel=0`}
                    title={resolvedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (resolvedVideo.platform === 'terabox' || isTeraBoxUrl(inputUrl)) ? (
                  resolvedVideo.m3u8_url && resolvedVideo.m3u8_url.includes('/api/stream-download') ? (
                    <CustomVideoPlayer
                      videoUrl={resolvedVideo.m3u8_url}
                      poster={resolvedVideo.thumbnail}
                      fallbackUrls={playerFallbackUrls}
                      qualities={playerQualities}
                      animeTitle={resolvedVideo.title}
                      episodeNumber={1}
                    />
                  ) : (
                    <iframe
                      className="w-full h-full border-0"
                      src={resolvedVideo.embed_url || `https://www.1024tera.com/sharing/embed?surl=${(resolvedVideo.shareId || '').replace(/^1/, '')}`}
                      title={resolvedVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  )
                ) : resolvedVideo.platform === 'vimeo' && resolvedVideo.shareId ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://player.vimeo.com/video/${resolvedVideo.shareId}?autoplay=1`}
                    title={resolvedVideo.title}
                    allow="accelerometer; autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : isImageMedia ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black/95 select-none overflow-hidden">
                    <img
                      src={carouselSlides[activeSlideIndex]?.url || resolvedVideo.thumbnail || resolvedVideo.m3u8_url}
                      alt={resolvedVideo.title}
                      className="w-full h-full object-contain transition-opacity duration-300"
                    />
                    {carouselSlides.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveSlideIndex((prev) => (prev > 0 ? prev - 1 : carouselSlides.length - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-colors active:opacity-85 shadow-xl backdrop-blur-md"
                          aria-label="Previous slide"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSlideIndex((prev) => (prev < carouselSlides.length - 1 ? prev + 1 : 0))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-colors active:opacity-85 shadow-xl backdrop-blur-md"
                          aria-label="Next slide"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-xs font-mono font-bold text-white flex items-center gap-2 shadow-lg">
                          <span>Slide {activeSlideIndex + 1} of {carouselSlides.length}</span>
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                          <span className="text-[#e4f222]">{resolvedVideo.thumbnails?.[activeSlideIndex]?.resolution || '1080p Original'}</span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <CustomVideoPlayer
                    videoUrl={resolvedVideo.m3u8_url || resolvedVideo.fast_download_url}
                    poster={resolvedVideo.thumbnail}
                    fallbackUrls={playerFallbackUrls}
                    qualities={playerQualities}
                    animeTitle={resolvedVideo.title}
                    episodeNumber={1}
                  />
                )}
              </div>
            )}

            {/* Footer action bar */}
            <div className="tp-player-actions flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {resolvedVideo.youtube_id && (
                  <button
                    type="button"
                    onClick={handleCopyEmbed}
                    className="tp-btn tp-btn-secondary flex-1 sm:flex-none justify-center"
                    style={{ height: '36px', fontSize: '12px' }}
                  >
                    {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Code className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />}
                    <span>{copiedEmbed ? 'Embed Copied' : 'Embed Code'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyDirectLink}
                  className="tp-btn tp-btn-secondary flex-1 sm:flex-none justify-center"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <Share2 className="w-3.5 h-3.5 text-[var(--tp-mid)]" />
                  <span>Share Stream Link</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* MID-CONTENT AD BANNER SLOT (MONETAG / ADSTERRA READY) */}
        <AdBannerSlot slotId="ad-banner-mid" format="leaderboard" />

        {/* =========================================================================
            FEATURE TRIO — WHAT THE DOCK ACTUALLY DOES
            Icons are lucide glyphs whose shape matches the feature, unlike the
            old decorative arrow/ring/plus marks that carried no meaning.
            ========================================================================= */}
        <section className="tp-features-sec">
          <h2 className="tp-sec-title">Paste any link. Stream, extract, or save instantly.</h2>
          <p className="tp-sec-intro">
            From 4K video streams to timestamped transcripts and audio MP3s, all in one place.
          </p>

          {/* Interactive Platform Folders Showcase */}
          <div className="tp-platform-folders-wrap mt-8 sm:mt-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
              <IconFolder
                theme={theme}
                title="Video Hub"
                tags={["YouTube", "Vimeo", "Bilibili", "Dailymotion"]}
                icons={[
                  PLATFORM_ICONS.youtube,
                  PLATFORM_ICONS.vimeo,
                  PLATFORM_ICONS.bilibili,
                  PLATFORM_ICONS.dailymotion,
                ]}
              />
              <IconFolder
                theme={theme}
                title="Social & Stories"
                tags={["TikTok", "Instagram", "Snapchat", "Facebook"]}
                icons={[
                  PLATFORM_ICONS.tiktok,
                  PLATFORM_ICONS.instagram,
                  PLATFORM_ICONS.snapchat,
                  PLATFORM_ICONS.facebook,
                ]}
              />
              <IconFolder
                theme={theme}
                title="Cloud & Live Networks"
                tags={["TeraBox", "Twitch", "X (Twitter)", "LinkedIn"]}
                icons={[
                  PLATFORM_ICONS.terabox,
                  PLATFORM_ICONS.twitch,
                  PLATFORM_ICONS.twitter,
                  PLATFORM_ICONS.linkedin,
                ]}
              />
            </div>
          </div>

          <div className="tp-features-grid mt-16 sm:mt-20">
            {/* Feature 1: Direct in-browser streaming */}
            <article className="tp-feature-card">
              <div className="tp-feature-idx" aria-hidden="true">01</div>
              <div className="tp-feature-mark">
                <MonitorPlay className="tp-mark-lucide" width={54} height={54} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="tp-feature-title">Direct in-browser streaming</h3>
              <p className="tp-feature-text">
                Stream videos, cloud archives, and live feeds inside a distraction-free player. Complete with Picture-in-Picture, custom playback speeds, and zero banner overlays.
              </p>
            </article>

            {/* Feature 2: Source-quality 4K & studio audio */}
            <article className="tp-feature-card">
              <div className="tp-feature-idx" aria-hidden="true">02</div>
              <div className="tp-feature-mark">
                <Captions className="tp-mark-lucide" width={54} height={54} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="tp-feature-title">Source-quality 4K & studio audio</h3>
              <p className="tp-feature-text">
                Download raw video up to 4K Ultra HD at source bitrate. Extract crisp MP3 audio tracks and pull timestamped SubRip .SRT or clean .TXT subtitles with millisecond accuracy.
              </p>
            </article>

            {/* Feature 3: Zero friction & client privacy */}
            <article className="tp-feature-card">
              <div className="tp-feature-idx" aria-hidden="true">03</div>
              <div className="tp-feature-mark">
                <ShieldCheck className="tp-mark-lucide" width={54} height={54} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="tp-feature-title">Zero friction & client privacy</h3>
              <p className="tp-feature-text">
                No apps to download, no accounts to register, and no watermarks stamped onto your files. Media saves directly to your device preserving the author's original title.
              </p>
            </article>
          </div>
        </section>

        {/* STATS BAND */}
        <section className="tp-stats-band">
          <div className="tp-stats-grid">
            <div>
              <div className="tp-stat-val">12+</div>
              <div className="tp-stat-lbl">Platforms Supported</div>
            </div>
            <div>
              <div className="tp-stat-val">5</div>
              <div className="tp-stat-lbl">Media Formats: MP4 · MP3 · SRT · TXT · JPG</div>
            </div>
            <div>
              <div className="tp-stat-val">$0</div>
              <div className="tp-stat-lbl">100% Free, Zero Sign-Up</div>
            </div>
            <div>
              <div className="tp-stat-val">4K</div>
              <div className="tp-stat-lbl">Max Video Quality · 1080p Artwork</div>
            </div>
          </div>
        </section>

        {/* SEO DOMAIN STATUS GRID & EXPLANATION */}
        <section className="tp-seo-card">
          <div className="space-y-3">
            {/* The hero headline is the brand line on every route, so the route
                keyword lives here as the section heading instead. */}
            <h2>{seo.h1}</h2>
            <p>{seo.subheadline}</p>
            <p>
              Watching or saving a video usually means juggling one tool per site: a TikTok or Instagram saver that stamps
              watermarks, a transcript extractor buried in ads, a thumbnail grabber that returns compressed images, and a
              cloud-share player that demands its own app.
            </p>
            <p>
              <strong>TeraPlay</strong> handles all of those jobs from a single input field. Paste a
              link from YouTube, TikTok, Instagram, TeraBox, Twitch, Snapchat, LinkedIn, Facebook, Vimeo, Bilibili, Dailymotion, or X (Twitter), then
              stream it in the browser, download the original file in up to 4K, export timestamped SubRip .SRT or clean .TXT subtitles, pull studio MP3 audio, and
              grab uncompressed 1080p cover art. One universal tool for all of it, no app installs, no login walls.
            </p>
          </div>

          <div className="tp-seo-card-status">
            <h3>Supported Gateways & Platforms</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
              {[
                'youtube.com',
                'tiktok.com',
                'instagram.com',
                'terabox.com',
                'twitch.tv',
                'snapchat.com',
                'linkedin.com',
                'facebook.com',
                'vimeo.com',
                'bilibili.com',
                'dailymotion.com',
                'x.com (twitter)',
                '1024tera.com',
                'nephobox.com',
                'direct mp4 / m3u8',
                '1,000+ universal sites',
              ].map((domain) => (
                <div key={domain} className="tp-domain-pill">
                  <span className="capitalize">{domain}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM AD BANNER SLOT (MONETAG / ADSTERRA READY) */}
        <AdBannerSlot slotId="ad-banner-bottom" format="leaderboard" />

        {/* FAQ ACCORDION */}
        <FaqAccordionSection faqs={seo.faqs} />
      </div>

      {/* =========================================================================
          UNIFIED 4-COLUMN FOOTER
          ========================================================================= */}
      <footer className="tp-foot">
        <div className="tp-wrap tp-foot-grid">
          {/* Col 1: Brand & Status */}
          <div>
            <div className="tp-foot-brand">
              <span>TeraPlay</span>
              <svg width="17" height="14" viewBox="0 0 17 14" aria-hidden="true" className="text-[#e4f222]">
                <path
                  d="M1 13.2c4.6-.4 8.4-2.6 11-6.4L15.6 1M9.6 1.4h6v6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="tp-foot-desc">
              High-performance universal media player and downloader. Instant in-browser streaming, 4K video exports, studio MP3 audio, and SubRip .SRT captions.
            </p>
          </div>

          {/* Col 2: Supported Platforms */}
          <div>
            <h4 className="tp-foot-col-title">Supported Platforms</h4>
            <div className="tp-foot-col-links">
              <a
                href="/?platform=YouTube"
                onClick={(e) => {
                  e.preventDefault();
                  handlePlatformSelect('YouTube');
                }}
              >
                YouTube Studio & Shorts
              </a>
              <a
                href="/?platform=TeraBox"
                onClick={(e) => {
                  e.preventDefault();
                  handlePlatformSelect('TeraBox');
                }}
              >
                TeraBox In-Browser Stream
              </a>
              <a
                href="/?platform=TeraBox"
                onClick={(e) => {
                  e.preventDefault();
                  handlePlatformSelect('TeraBox');
                }}
              >
                1024TeraBox Mirrors
              </a>
              <a
                href="/?platform=TikTok"
                onClick={(e) => {
                  e.preventDefault();
                  handlePlatformSelect('TikTok');
                }}
              >
                TikTok No-Watermark
              </a>
              <a
                href="/?platform=Instagram"
                onClick={(e) => {
                  e.preventDefault();
                  handlePlatformSelect('Instagram');
                }}
              >
                Instagram Reels & Video
              </a>
              <a
                href="/?platform=Twitch"
                onClick={(e) => {
                  e.preventDefault();
                  handlePlatformSelect('Twitch');
                }}
              >
                Twitch Clips & VODs
              </a>
              <a
                href="/?platform=Vimeo"
                onClick={(e) => {
                  e.preventDefault();
                  handlePlatformSelect('Vimeo');
                }}
              >
                Vimeo & Bilibili Hub
              </a>
              <a href="/document-downloader">Document & Book Downloader</a>
            </div>
          </div>

          {/* Col 3: Media Utilities */}
          <div>
            <h4 className="tp-foot-col-title">Media Utilities</h4>
            <div className="tp-foot-col-links">
              <a
                href="/youtube-transcript-downloader"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveChip('YouTube');
                  setYoutubeTab('transcript');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  urlInputRef.current?.focus();
                }}
              >
                YouTube Transcript Downloader
              </a>
              <a
                href="/youtube-transcript-downloader"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveChip('YouTube');
                  setYoutubeTab('transcript');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  urlInputRef.current?.focus();
                }}
              >
                SubRip .SRT Generator
              </a>
              <a
                href="/youtube-thumbnail-downloader"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveChip('YouTube');
                  setYoutubeTab('thumbnails');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  urlInputRef.current?.focus();
                }}
              >
                1080p Thumbnail Grabber
              </a>
              <a
                href="/terabox-video-downloader"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveChip('TeraBox');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  urlInputRef.current?.focus();
                }}
              >
                4K & MP4 Video Downloader
              </a>
              <a
                href="/terabox-to-mp4"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveChip('TeraBox');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  urlInputRef.current?.focus();
                }}
              >
                Lossless MP3 Audio Extractor
              </a>
              <a
                href="/terabox-link-opener"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveChip('TeraBox');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  urlInputRef.current?.focus();
                }}
              >
                Direct Stream Opener (M3U8)
              </a>
            </div>
          </div>

          {/* Col 4: Trust & Legal */}
          <div>
            <h4 className="tp-foot-col-title">Legal & Trust</h4>
            <div className="tp-foot-col-links">
              <Link to="/dmca">DMCA Notice</Link>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/disclaimer">Disclaimer</Link>
              <Link to="/contact">Contact Support</Link>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="tp-foot-bottom-bar">
            <span>© {new Date().getFullYear()} TeraPlay Universal Media Hub.</span>
          </div>
        </div>

        <div className="tp-foot-watermark" aria-hidden="true">
          <span className="tp-foot-word">TeraPlay</span>
          <svg viewBox="0 0 17 14" className="tp-foot-word-arrow" aria-hidden="true">
            <path
              d="M1 13.2c4.6-.4 8.4-2.6 11-6.4L15.6 1M9.6 1.4h6v6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </footer>

      {/* =========================================================================
          SUPPORT / DONATE MODAL
          ========================================================================= */}
      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        <DialogContent
          className={`sm:max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border transition-all duration-200 ${
            theme === 'light'
              ? 'bg-white/98 text-slate-900 border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(12,16,28,0.2)] backdrop-blur-2xl'
              : 'bg-[#0c152e]/98 text-slate-100 border-[#2659d9]/35 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl'
          }`}
        >
          <DialogHeader className="text-center flex flex-col items-center gap-2">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${
                theme === 'light'
                  ? 'bg-[#e4f222]/25 border-[#b6c200]/40 text-[#4c5200]'
                  : 'bg-[#e4f222]/15 border-[#e4f222]/35 text-[#e4f222]'
              }`}
            >
              <Coffee className="w-7 h-7" />
            </div>
            <DialogTitle
              className={`text-xl font-bold tracking-tight mt-1 ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}
            >
              Support TeraPlay
            </DialogTitle>
            <DialogDescription
              className={`text-sm text-center max-w-sm leading-relaxed ${
                theme === 'light' ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              TeraPlay is 100% free with zero paywalls and no mandatory accounts. If you find this tool helpful, consider supporting server costs or sharing it with friends.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-3 mt-1">
            <a
              href="https://buymeacoffee.com"
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 rounded-xl bg-[#ffdd00] hover:bg-[#ebd000] text-black font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <Coffee className="w-4 h-4 text-black" />
              <span>Buy Me a Coffee</span>
              <ExternalLink className="w-3.5 h-3.5 text-black/70 ml-0.5" />
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.origin);
                  toast.success('Site link copied to clipboard! Thanks for sharing.');
                  setShowSupportModal(false);
                } catch {
                  toast.error('Could not copy link to clipboard');
                }
              }}
              className={`h-11 rounded-xl font-medium text-sm gap-2 border transition-colors ${
                theme === 'light'
                  ? 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800'
                  : 'border-white/12 bg-white/6 hover:bg-white/12 text-white'
              }`}
            >
              <Share2 className="w-4 h-4 text-[#2659d9] dark:text-[#a9c3f3]" />
              <span>Share with Friends</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
