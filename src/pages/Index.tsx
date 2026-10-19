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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Music,
  Video,
  Volume2,
  RotateCcw
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
import { useAuth } from '@/contexts/AuthContext';
import AdBannerSlot from '@/components/ads/AdBannerSlot';
import { ThemeChanger } from '@/components/ThemeChanger';
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
  has_audio: boolean;
  has_video: boolean;
  is_audio_only?: boolean;
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
      <p className="tp-sec-intro">Everything you need to know about YouTube transcripts, high-res thumbnails, and TeraBox video streaming.</p>

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
  | 'Vimeo'
  | 'Universal'
  | 'WhatsApp';

// ==========================================
// MAIN UNIVERSAL DOCK COMPONENT
// ==========================================
export default function Index() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signInWithGoogle, signOut } = useAuth();
  const seo = useMemo(() => getSeoConfigForPath(location.pathname), [location.pathname]);

  const [inputUrl, setInputUrl] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedVideo, setResolvedVideo] = useState<ResolvedMedia | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [guestPlays, setGuestPlays] = useState<number>(0);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [activeChip, setActiveChip] = useState<PlatformChip>('YouTube');
  const [resolveError, setResolveError] = useState<{ title: string; message: string; platform?: string } | null>(null);

  // Studio Mode Tabs: 'downloads' | 'transcript' | 'thumbnails' | 'player'
  const [youtubeTab, setYoutubeTab] = useState<'downloads' | 'transcript' | 'thumbnails' | 'player'>('downloads');
  const [downloadFormatTab, setDownloadFormatTab] = useState<'video' | 'audio'>('video');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isQuickDropdownOpen, setIsQuickDropdownOpen] = useState(false);
  const quickDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (quickDropdownRef.current && !quickDropdownRef.current.contains(e.target as Node)) {
        setIsQuickDropdownOpen(false);
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

    if (lower.includes('vimeo.com')) {
      setActiveChip('Vimeo');
      return;
    }

    if (lower.includes('whatsapp.com') || lower.includes('wa.me') || lower.includes('wa.link')) {
      setActiveChip('WhatsApp');
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

  const handleOpenDock = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const el = document.getElementById('resolver-dock');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

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

  const handleResolveAndPlay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = inputUrl.trim();
    if (!raw) {
      toast.error('Please enter or paste a valid video link or YouTube ID');
      return;
    }

    if (!user && guestPlays >= GUEST_MAX_PLAYS) {
      setShowAuthGate(true);
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
              thumbnails: resolveData?.success && Array.isArray(resolveData.thumbnails) ? resolveData.thumbnails : prev.thumbnails,
            };
          });

          if (foundTranscript) {
            toast.success(`Transcript loaded: ${foundTranscript.items.length} cues ready!`);
          }
        } catch {
          // Backend network notice: client keeps active studio viewer
        } finally {
          setIsLoading(false);
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
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract video stream from this link');
      }

      const isImg = data.media_type === 'carousel' || data.media_type === 'image' || data.formats?.some((f: MediaFormatOption) => f.ext === 'jpg');
      setResolvedVideo({
        title: data.title || 'Shared Video File',
        thumbnail: data.thumbnail || '',
        thumbnails: data.thumbnails || [],
        m3u8_url: data.m3u8_url || data.fast_download_url || '',
        fast_download_url: data.fast_download_url || data.m3u8_url,
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
      incrementGuestPlays();
      toast.success(isImg ? 'Instagram Media loaded! All slides ready.' : 'Stream loaded! Playing video...');

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
      setIsLoading(false);
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
    if (list.length === 0 && (resolvedVideo?.m3u8_url || resolvedVideo?.fast_download_url)) {
      return [
        {
          format_id: 'direct_stream',
          quality: 'Direct Stream (Audio + Video)',
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

  const audioFormats = useMemo(
    () => (resolvedVideo?.audio_formats?.length
      ? resolvedVideo.audio_formats
      : resolvedVideo?.formats?.filter((f) => f.is_audio_only) || []),
    [resolvedVideo]
  );

  // Pick progressive format with both audio and video so quick download is never silent!
  const bestVideo = useMemo(() => {
    const progressiveWithAudio = videoFormats.filter((f) => f.has_audio && f.has_video);
    if (progressiveWithAudio.length > 0) {
      return progressiveWithAudio[0];
    }
    return videoFormats[0] || null;
  }, [videoFormats]);

  const handleDownloadMp4 = () => {
    if (!resolvedVideo) return;
    const rawTarget = bestVideo?.download_url || bestVideo?.url || resolvedVideo.fast_download_url || resolvedVideo.m3u8_url;
    const proxyTarget = rawTarget.startsWith('/api/stream-download')
      ? rawTarget
      : `/api/stream-download?url=${encodeURIComponent(rawTarget)}&filename=${encodeURIComponent(resolvedVideo.title.replace(/[^a-zA-Z0-9_-]/g, '_'))}`;

    const link = document.createElement('a');
    link.href = proxyTarget;
    link.setAttribute('download', `${resolvedVideo.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Starting MP4 download...');
  };

  const bestAudio = useMemo(
    () => audioFormats.find((f) => f.format_id === 'mp3_320') || audioFormats[0] || null,
    [audioFormats]
  );
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

  const carouselSlides = useMemo(() => {
    if (!resolvedVideo) return [];
    if (resolvedVideo.thumbnails && resolvedVideo.thumbnails.length > 0) {
      return resolvedVideo.thumbnails;
    }
    if (resolvedVideo.thumbnail) {
      return [{ url: resolvedVideo.thumbnail, quality_label: 'Original Media' }];
    }
    return [];
  }, [resolvedVideo]);

  const thumbnailList = useMemo(() => {
    if (!resolvedVideo) return [];
    if (resolvedVideo.thumbnails && resolvedVideo.thumbnails.length > 0) {
      return resolvedVideo.thumbnails.map((t, idx) => {
        const isCarousel = resolvedVideo.media_type === 'carousel' || resolvedVideo.thumbnails!.length > 4;
        const tag = isCarousel ? `slide_${idx + 1}` : (t.height ? `${t.height}p` : `thumb_${idx + 1}`);
        const label = isCarousel
          ? `Slide ${idx + 1} of ${resolvedVideo.thumbnails!.length}`
          : (t.quality_label || (t.height ? `${t.height}p Quality` : `Cover Image ${idx + 1}`));
        const sublabel = isCarousel
          ? (t.quality_label?.replace(/^Slide \d+ of \d+\s*\((.*?)\)$/, '$1') || 'Original Studio Quality')
          : (t.height ? `${t.height}p Resolution` : 'Original Quality');
        const res = t.resolution || (t.width && t.height ? `${t.width} × ${t.height}` : 'HD Quality');
        const badge =
          (t.width && t.width >= 2000) || (t.height && t.height >= 2000)
            ? '4K UHD'
            : (t.width && t.width >= 1920) || (t.height && t.height >= 1080)
            ? 'Highest Quality'
            : (t.width && t.width >= 1280) || (t.height && t.height >= 720)
            ? 'High Definition'
            : 'Standard';
        const badgeColor =
          badge === '4K UHD' || badge === 'Highest Quality'
            ? 'text-[#e4f222] bg-[#e4f222]/15 border-[#e4f222]/30'
            : badge === 'High Definition'
            ? 'text-sky-400 bg-sky-400/15 border-sky-400/30'
            : 'text-amber-400 bg-amber-400/15 border-amber-400/30';
        return {
          label,
          sublabel,
          res,
          badge,
          badgeColor,
          url: t.url,
          tag,
        };
      });
    }

    if (resolvedVideo.youtube_id) {
      return [
        {
          label: 'MaxRes Quality (1080p)',
          sublabel: 'Full HD 1080p',
          res: '1920 × 1080',
          badge: 'Highest Quality',
          badgeColor: 'text-[#e4f222] bg-[#e4f222]/15 border-[#e4f222]/30',
          url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/maxresdefault.jpg`,
          tag: '1080p',
        },
        {
          label: 'High Quality (HQ 720p)',
          sublabel: 'HD 720p',
          res: '1280 × 720 / 480 × 360',
          badge: 'High Definition',
          badgeColor: 'text-sky-400 bg-sky-400/15 border-sky-400/30',
          url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/hqdefault.jpg`,
          tag: '720p',
        },
        {
          label: 'Standard Quality (SD)',
          sublabel: 'Standard 480p',
          res: '640 × 480',
          badge: 'Standard Res',
          badgeColor: 'text-amber-400 bg-amber-400/15 border-amber-400/30',
          url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/sddefault.jpg`,
          tag: '480p',
        },
        {
          label: 'Medium Quality (MQ)',
          sublabel: 'Compact 180p',
          res: '320 × 180',
          badge: 'Compact Size',
          badgeColor: 'text-slate-400 bg-slate-400/15 border-slate-400/30',
          url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/mqdefault.jpg`,
          tag: '180p',
        },
      ];
    }

    if (resolvedVideo.thumbnail) {
      return [
        {
          label: 'Primary Cover Thumbnail',
          sublabel: 'Original Media Cover',
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
    url: typeof window !== 'undefined' ? window.location.href : 'https://teraplay.app',
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
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
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

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#e4f222]/15 border border-[#e4f222]/30 text-[#e4f222]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e4f222] animate-pulse" />
                VIP Unlimited
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="tp-btn-theme"
                title="Sign out of testing session"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="tp-btn-theme"
              title="Sign in (Mock Mode)"
            >
              Sign In
            </button>
          )}

          <a
            href="#resolver-dock"
            onClick={handleOpenDock}
            className="tp-btn-nav-accent"
            aria-label="Open Universal Media Dock"
          >
            <span>Open Dock</span>
            <span className="tp-btn-arrow" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
              </svg>
            </span>
          </a>
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
            fetchPriority="high"
            decoding="async"
            className="tp-hero-sky-img tp-hero-sky-day"
          />
          <img
            src="/assets/bg-night.png"
            alt=""
            fetchPriority="high"
            decoding="async"
            className="tp-hero-sky-img tp-hero-sky-night"
          />
          <div className="tp-hero-sky-overlay" />
        </div>

        <h1 className="tp-title" aria-label="TeraPlay">
          {'TeraPlay'.split('').map((char, index) => (
            <span key={index} className="tp-title-ch" aria-hidden="true" style={{ '--i': index } as React.CSSProperties}>
              {char}
            </span>
          ))}
        </h1>

        <p className="tp-tagline">
          {seo.subheadline ||
            'Universal Media & Creator Dock: Extract YouTube transcripts, download 1080p thumbnails, stream TeraBox links, and grab direct MP4 files — 100% free with zero app required.'}
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
                      : activeChip === 'Vimeo'
                      ? 'Paste Vimeo video link...'
                      : activeChip === 'WhatsApp'
                      ? 'Paste original video link (YouTube, TikTok, etc.) shared in WhatsApp...'
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
                id: 'WhatsApp',
                label: 'WhatsApp (E2EE)',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      fill="#25D366"
                      d="M12.05 2C6.53 2 2.05 6.48 2.05 12c0 1.95.56 3.77 1.53 5.32L2.3 22l4.83-1.27A9.9 9.9 0 0 0 12.05 22c5.52 0 10-4.48 10-10s-4.48-10-10-10z"
                    />
                    <path
                      fill="#ffffff"
                      d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97c-.27-.1-.47-.15-.67.15c-.2.3-.77.97-.94 1.16c-.17.2-.35.22-.64.08c-.3-.15-1.26-.46-2.39-1.48c-.88-.78-1.48-1.76-1.65-2.06c-.17-.3-.02-.46.13-.6c.13-.14.3-.35.45-.52c.15-.18.2-.3.3-.5c.1-.2.05-.37-.03-.52c-.07-.15-.67-1.61-.92-2.21c-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.79.37c-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48c.71.31 1.26.49 1.69.63c.71.23 1.36.2 1.87.12c.57-.08 1.76-.72 2.01-1.41c.25-.7.25-1.29.17-1.41c-.07-.13-.27-.2-.57-.35z"
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

          {activeChip === 'WhatsApp' && (
            <div className="mt-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-3 animate-in fade-in duration-150">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-white">How WhatsApp media downloads work:</span>
                <p className="text-slate-300 leading-relaxed">
                  WhatsApp chat messages and media files are end-to-end encrypted (E2EE) on your device. To download a video shared in WhatsApp, simply copy the original link (such as YouTube, Instagram Reel, TikTok, Facebook, or Twitter) directly from the WhatsApp chat message and paste it into the dock above!
                </p>
              </div>
            </div>
          )}

          {/* Trust badge line */}
          <div className="tp-trust-sub" aria-label="Service Features">
            <span>Transcripts & SRT Export</span>
            <span className="tp-trust-dot" aria-hidden="true">•</span>
            <span>1080p 4K Thumbnails</span>
            <span className="tp-trust-dot" aria-hidden="true">•</span>
            <span>TeraBox Fast Stream</span>
            <span className="tp-trust-dot" aria-hidden="true">•</span>
            <span>Direct MP4 Download</span>
          </div>

          {/* Guest play indicator */}
          {!user ? (
            <div
              className="tp-guest-meta cursor-pointer hover:border-white/20 hover:bg-white/5 transition-colors select-none"
              onClick={() => {
                try {
                  localStorage.removeItem('teraplay_guest_plays');
                  setGuestPlays(0);
                  toast.success('Guest session limit reset to 0/5!');
                } catch {
                  // Ignore localStorage error
                }
              }}
              title="Click to reset guest plays counter (Testing Mode)"
            >
              <Clock className="w-3.5 h-3.5 text-[#e4f222]" />
              <span>
                Free Guest Sessions Used: <strong className="text-white">{guestPlays}</strong> / {GUEST_MAX_PLAYS}
              </span>
              {guestPlays >= GUEST_MAX_PLAYS ? (
                <span className="text-amber-300 font-semibold">(Limit reached — click to reset or sign in free)</span>
              ) : (
                <span className="text-slate-400 text-[10px] hidden sm:inline">(Click to reset)</span>
              )}
            </div>
          ) : (
            <div className="tp-guest-meta border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-semibold">
                Unlimited Media Processing Active (Signed In)
              </span>
            </div>
          )}
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
          <section id="error-viewport" className="w-full my-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-2xl border border-amber-500/30 bg-[var(--tp-paper-elevated)] backdrop-blur-xl p-6 sm:p-8 space-y-4 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-[var(--tp-ink)]">
                      {resolveError.title}
                    </h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Notice
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--tp-text-dim)] leading-relaxed">
                    {resolveError.message}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setResolveError(null);
                        setInputUrl('');
                        const el = document.getElementById('resolver-dock');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="tp-btn tp-btn-primary active:opacity-90"
                      style={{ height: '36px', fontSize: '12px' }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Try Another Link</span>
                    </button>
                    <span className="text-xs text-[var(--tp-muted)] font-mono">
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
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isYouTubeMode
                      ? 'bg-red-500/15 border border-red-500/30 text-red-500'
                      : 'bg-[rgba(38,89,217,0.2)] border border-[rgba(169,195,243,0.3)] text-[#e4f222]'
                  }`}
                >
                  {isYouTubeMode ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                      <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#06080F" />
                    </svg>
                  ) : (
                    <Film className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="tp-player-title">{resolvedVideo.title}</h2>
                  <div className="tp-player-meta-tags">
                    {isYouTubeMode ? (
                      <>
                        <span className="text-red-400 font-medium">YouTube Creator Studio</span>
                        <span>•</span>
                        <span>ID: {resolvedVideo.youtube_id}</span>
                        <span>•</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Transcripts & Thumbnails Ready
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-cyan-400 font-medium capitalize">{resolvedVideo.platform || 'Universal'} Stream</span>
                        <span>•</span>
                        <span>Size: {resolvedVideo.size || 'HD Quality'}</span>
                        <span>•</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Universal Dock Active
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isYouTubeMode && resolvedVideo.youtube_id ? (
                  <a
                    href={`https://www.youtube.com/watch?v=${resolvedVideo.youtube_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tp-btn tp-btn-secondary"
                    style={{ height: '36px', fontSize: '12px' }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open on YouTube</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleCopyDirectLink}
                    className="tp-btn tp-btn-secondary"
                    style={{ height: '36px', fontSize: '12px' }}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Stream Link'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* UNIVERSAL DOCK TAB NAVIGATION */}
            <div id="studio-tabs-nav" className="flex items-center border-b border-[var(--tp-border-subtle)] px-4 sm:px-6 bg-[var(--tp-paper-input)]/60 backdrop-blur-md overflow-x-auto">
              <button
                type="button"
                onClick={() => setYoutubeTab('downloads')}
                className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  youtubeTab === 'downloads'
                    ? 'border-[var(--tp-mid)] text-[var(--tp-mid)] dark:border-[#e4f222] dark:text-[#e4f222]'
                    : 'border-transparent text-[var(--tp-muted)] hover:text-[var(--tp-ink)]'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Downloads (MP4 & Audio)</span>
                {videoFormats.length + audioFormats.length > 0 && (
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                    {videoFormats.length + audioFormats.length} formats
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setYoutubeTab('transcript')}
                className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  youtubeTab === 'transcript'
                    ? 'border-[var(--tp-mid)] text-[var(--tp-mid)] dark:border-[#e4f222] dark:text-[#e4f222]'
                    : 'border-transparent text-[var(--tp-muted)] hover:text-[var(--tp-ink)]'
                }`}
              >
                <Subtitles className="w-4 h-4" />
                <span>Transcript & Subtitles</span>
                {resolvedVideo.transcript?.items ? (
                  <span className="text-[10px] bg-amber-500/15 text-amber-500 dark:text-[#e4f222] px-2 py-0.5 rounded-full border border-amber-500/30 dark:border-[#e4f222]/30 font-mono">
                    {resolvedVideo.transcript.items.length} cues
                  </span>
                ) : (
                  <span className="text-[10px] bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 font-mono">
                    Groq AI
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setYoutubeTab('thumbnails')}
                className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  youtubeTab === 'thumbnails'
                    ? 'border-[var(--tp-mid)] text-[var(--tp-mid)] dark:border-[#e4f222] dark:text-[#e4f222]'
                    : 'border-transparent text-[var(--tp-muted)] hover:text-[var(--tp-ink)]'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Thumbnails & Covers</span>
                {thumbnailList.length > 0 && (
                  <span className="text-[10px] bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/30 font-mono">
                    {thumbnailList.length} {thumbnailList.length === 1 ? 'Size' : 'Sizes'}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setYoutubeTab('player')}
                className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  youtubeTab === 'player'
                    ? 'border-[var(--tp-mid)] text-[var(--tp-mid)] dark:border-[#e4f222] dark:text-[#e4f222]'
                    : 'border-transparent text-[var(--tp-muted)] hover:text-[var(--tp-ink)]'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>Player</span>
              </button>
            </div>

            {/* TAB 0: VIDEO & AUDIO DOWNLOADS STUDIO */}
            {youtubeTab === 'downloads' && (
              <div className="p-4 sm:p-6 space-y-8">
                {/* TOP SECTION: SIDE-BY-SIDE VIDEO PLAYER & QUICK ACTIONS CARD (IMAGE 3) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT: EMBEDDED LIVE PLAYER */}
                  <div className={`${isVerticalMedia ? 'lg:col-span-6 xl:col-span-5 mx-auto w-full max-w-md lg:max-w-none' : 'lg:col-span-7'} space-y-2`}>
                    <div id="studio-player-frame" className={`relative ${isVerticalMedia ? 'aspect-[3/4] max-h-[640px] max-w-[480px] mx-auto' : 'aspect-video'} rounded-2xl overflow-hidden bg-black border border-[var(--tp-border-card)] shadow-2xl group`}>
                      {isYouTubeMode && resolvedVideo.youtube_id ? (
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube-nocookie.com/embed/${resolvedVideo.youtube_id}?autoplay=0&rel=0`}
                          title={resolvedVideo.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
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
                            className="w-full h-full object-contain transition-all duration-300"
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
                          fallbackUrls={[resolvedVideo.fast_download_url]}
                          animeTitle={resolvedVideo.title}
                          episodeNumber={1}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between px-1 text-[11px] text-[var(--tp-muted)] font-mono">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {isYouTubeMode
                          ? 'Live YouTube Player (Adaptive)'
                          : isImageMedia
                          ? `${(resolvedVideo.platform || 'Instagram').toUpperCase()} Carousel Viewer (1080p)`
                          : `${(resolvedVideo.platform || 'Universal').toUpperCase()} Video Player`}
                      </span>
                      <span>
                        {isImageMedia
                          ? `${carouselSlides.length} Slides Ready for Download`
                          : `Max ${getShortResTag(bestVideo?.height)} Ready for Download`}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT: QUICK DOWNLOAD CARD & ACTIONS (IMAGE 3 REFERENCE) */}
                  <div className={`${isVerticalMedia ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-5'} rounded-2xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-card)] backdrop-blur-xl p-5 space-y-4 shadow-xl`}>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/25 px-2.5 py-1 rounded-full">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        {isImageMedia ? `${carouselSlides.length} 1080p Slides Available` : `Max ${getShortResTag(bestVideo?.height)} Available`}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--tp-muted)]">
                        Source: {resolvedVideo.youtube_id ? `YouTube [${resolvedVideo.youtube_id}]` : (resolvedVideo.platform || 'Universal')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[var(--tp-ink)] leading-snug line-clamp-2">
                        {resolvedVideo.title}
                      </h3>
                      <p className="text-xs text-[var(--tp-muted)] mt-1 flex items-center gap-2">
                        <span className="capitalize">{resolvedVideo.platform || 'Universal'} Media Dock</span>
                        <span>•</span>
                        <span className="text-[#e4f222] font-mono">Fast CDN Downloads</span>
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {isImageMedia ? (
                        <a
                          href={carouselSlides[activeSlideIndex]?.url || resolvedVideo.m3u8_url}
                          download={`instagram_slide_${activeSlideIndex + 1}.jpg`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 dark:text-cyan-300 font-bold text-xs sm:text-sm hover:bg-cyan-500/25 transition-colors shadow-lg shadow-cyan-500/10"
                        >
                          <Download className="w-4 h-4 fill-current" />
                          <span>Download Slide {activeSlideIndex + 1} (1080p JPG)</span>
                        </a>
                      ) : (
                        /* Action 1: Watch Online */
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('studio-player-frame');
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 dark:text-cyan-300 font-bold text-xs sm:text-sm hover:bg-cyan-500/25 transition-colors shadow-lg shadow-cyan-500/10"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Watch Online in Player</span>
                        </button>
                      )}

                      {/* Action 2: Split Download Dropdown (Image 3) */}
                      <div className="relative" ref={quickDropdownRef}>
                        <div className="flex items-stretch rounded-xl shadow-lg shadow-[#e4f222]/15">
                          <a
                            href={isImageMedia ? (carouselSlides[activeSlideIndex]?.url || resolvedVideo.m3u8_url) : (bestVideo?.download_url || bestVideo?.url)}
                            download={isImageMedia ? `instagram_slide_${activeSlideIndex + 1}.jpg` : undefined}
                            target={isImageMedia ? "_blank" : undefined}
                            rel={isImageMedia ? "noreferrer" : undefined}
                            className="tp-btn tp-btn-download flex-1 justify-center rounded-r-none border-r border-black/20 active:opacity-90"
                            style={{ height: '44px', fontSize: '13px' }}
                          >
                            <Download className="w-4 h-4" />
                            <span>{isImageMedia ? `Download Slide ${activeSlideIndex + 1} (1080p)` : `Download Video (${getShortResTag(bestVideo?.height)})`}</span>
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
                            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
                            onClick={() => setIsQuickDropdownOpen(false)}
                          />
                        )}

                        {/* Dropdown Menu Popover */}
                        {isQuickDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-full sm:w-[320px] max-h-[360px] overflow-y-auto bg-[var(--tp-paper-elevated)] border border-[var(--tp-border-card)] backdrop-blur-2xl rounded-2xl p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
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
                                    <span className="text-[10px] font-mono tabular-nums text-[var(--tp-accent-ink)] bg-[var(--tp-accent)]/15 border border-[var(--tp-accent)]/30 px-1.5 py-0.5 rounded shrink-0">
                                      1080p HD
                                    </span>
                                  </a>
                                ))
                              ) : (
                                videoFormats.map((vf) => {
                                const isCinema = isCinemaWidescreen(vf.height);
                                const tier = getStandardResTier(vf.height, vf.quality);
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
                                        {vf.has_audio && (
                                          <span className="ml-1.5 text-[10px] text-emerald-400 font-normal">
                                            (Audio+Video)
                                          </span>
                                        )}
                                        {isCinema && (
                                          <span className="ml-1.5 text-[10px] text-[var(--tp-muted)] font-mono font-normal">
                                            ({vf.height}p)
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                    <span className="text-[10px] font-mono tabular-nums text-[var(--tp-accent-ink)] bg-[var(--tp-accent)]/15 border border-[var(--tp-accent)]/30 px-1.5 py-0.5 rounded shrink-0">
                                      {vf.filesize}
                                    </span>
                                  </a>
                                );
                              })
                            )}
                            </div>

                            {audioFormats.length > 0 && (
                              <>
                                <div className="border-t border-[var(--tp-border-subtle)] my-2" />
                                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--tp-muted)] px-3 py-1 flex items-center justify-between">
                                  <span>Audio Tracks (MP3 / AAC)</span>
                                  <span className="text-[9px] text-emerald-400">Audio Only</span>
                                </div>
                                <div className="space-y-0.5">
                                  {audioFormats.map((af) => (
                                    <a
                                      key={af.format_id}
                                      href={af.download_url || af.url}
                                      download
                                      onClick={() => setIsQuickDropdownOpen(false)}
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
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action 3: Quick 1-Click MP3 Download */}
                      {bestAudio && (
                        <a
                          href={bestAudio.download_url || bestAudio.url}
                          download
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 dark:text-amber-300 font-bold text-xs sm:text-sm hover:bg-amber-500/20 active:opacity-90 transition-colors shadow-md"
                        >
                          <Music className="w-4 h-4 fill-current/20" />
                          <span>Download Audio (MP3 320 kbps)</span>
                        </a>
                      )}

                      {/* Action 4: 1-Click AI Transcription Shortcut */}
                      {!isImageMedia && (
                        <button
                          type="button"
                          onClick={() => {
                            setYoutubeTab('transcript');
                            const el = document.getElementById('studio-tabs-nav');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs sm:text-sm active:opacity-90 transition-colors shadow-md ${
                            resolvedVideo.transcript?.items?.length
                              ? 'bg-amber-500/10 border-amber-500/25 text-amber-500 dark:text-amber-300 hover:bg-amber-500/20'
                              : 'bg-purple-500/10 border-purple-500/25 text-purple-400 dark:text-purple-300 hover:bg-purple-500/20'
                          }`}
                        >
                          {resolvedVideo.transcript?.items?.length ? (
                            <>
                              <Subtitles className="w-4 h-4 fill-current/20" />
                              <span>View Transcript & Subtitles ({resolvedVideo.transcript.items.length} cues)</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-purple-400" />
                              <span>Transcribe Audio with Groq Whisper AI</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[var(--tp-border-subtle)]">
                      <p className="text-[11px] text-[var(--tp-muted)] text-center font-mono">
                        No registration required • High speed streaming & downloads
                      </p>
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

                    {/* Segmented Control Pill Switcher */}
                    <div className="inline-flex p-1 bg-[var(--tp-paper-input)] border border-[var(--tp-border-card)] rounded-2xl self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setDownloadFormatTab('video')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                          downloadFormatTab === 'video'
                            ? 'bg-[var(--tp-accent)] text-[var(--tp-accent-ink)] shadow-md font-bold'
                            : 'text-[var(--tp-muted)] hover:text-[var(--tp-ink)]'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        <span>MP4 (Video)</span>
                        {videoFormats.length > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                            downloadFormatTab === 'video' ? 'bg-black/20 text-black font-bold' : 'bg-[var(--tp-paper-elevated)] text-[var(--tp-muted)] border border-[var(--tp-border-subtle)]'
                          }`}>
                            {videoFormats.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDownloadFormatTab('audio')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                          downloadFormatTab === 'audio'
                            ? 'bg-[var(--tp-accent)] text-[var(--tp-accent-ink)] shadow-md font-bold'
                            : 'text-[var(--tp-muted)] hover:text-[var(--tp-ink)]'
                        }`}
                      >
                        <Music className="w-4 h-4" />
                        <span>MP3 (Audio)</span>
                        {audioFormats.length > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                            downloadFormatTab === 'audio' ? 'bg-black/20 text-black font-bold' : 'bg-[var(--tp-paper-elevated)] text-[var(--tp-muted)] border border-[var(--tp-border-subtle)]'
                          }`}>
                            {audioFormats.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quality Table */}
                  {isLoading && activeFormats.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-card)] p-8 space-y-4 text-center">
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
                    <div className="overflow-x-auto rounded-2xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-card)] backdrop-blur-md">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--tp-border-subtle)] text-[11px] font-mono text-[var(--tp-muted)] uppercase tracking-wider bg-[var(--tp-paper-input)]/50">
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
                                      <span>
                                        {fmt.is_audio_only
                                          ? fmt.quality
                                          : getStandardResTier(fmt.height, fmt.quality)}
                                      </span>
                                      {!fmt.is_audio_only && fmt.has_audio && (
                                        <span className="text-[10px] text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-normal">
                                          Audio+Video
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-[var(--tp-muted)] font-mono">
                                      {fmt.is_audio_only
                                        ? (fmt.format_id.startsWith('mp3') ? 'LAME High-Fi MP3 Track' : 'Original Master AAC Track')
                                        : isCinemaWidescreen(fmt.height)
                                        ? `Cinema Ultrawide (${fmt.height}p) • Direct Stream`
                                        : fmt.has_audio
                                        ? 'Universal (Audio + Video Single File)'
                                        : 'Direct High Bitrate Stream'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--tp-paper-input)] text-[var(--tp-ink)] border border-[var(--tp-border-subtle)] uppercase font-bold">
                                  {fmt.ext}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono tabular-nums">
                                <span className="text-[11px] font-mono tabular-nums text-[var(--tp-accent-ink)] bg-[var(--tp-accent)]/15 border border-[var(--tp-accent)]/30 px-2 py-0.5 rounded-md">
                                  {fmt.filesize || 'Direct Stream'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 sm:px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <a
                                    href={fmt.download_url || fmt.url}
                                    download
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
                                    className="tp-btn tp-btn-secondary active:opacity-90"
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

                  <div className="max-h-[500px] overflow-y-auto p-3 sm:p-4 space-y-2 divide-y divide-[var(--tp-border-subtle)]">
                    {transcriptItems.length > 0 ? (
                      transcriptItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="pt-2 first:pt-0 flex items-start gap-3 group hover:bg-[var(--tp-paper-input)]/50 p-2 rounded-xl transition-colors"
                        >
                          {showTimestamps && (
                            <span className="shrink-0 text-xs font-mono font-bold text-[var(--tp-accent-ink)] bg-[var(--tp-accent)]/15 border border-[var(--tp-accent)]/30 px-2 py-0.5 rounded-lg">
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
                      {isImageMedia ? 'Full-Resolution Carousel Slides & Artwork' : 'Full-Resolution Video Thumbnails & Covers'}
                    </h3>
                    <p className="text-xs text-[var(--tp-muted)] mt-0.5">
                      {isImageMedia
                        ? 'Download high-definition artwork and carousel slides in original lossless quality.'
                        : 'Download high-definition video cover images and posters in original quality.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    {thumbnailList.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDownloadAllThumbnails}
                        className="tp-btn tp-btn-download flex items-center gap-1.5 shadow-md"
                        style={{ height: '34px', fontSize: '11px', padding: '0 12px' }}
                        title="Download all slides sequentially"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download All ({thumbnailList.length})</span>
                      </button>
                    )}
                    <span className="text-xs font-mono font-semibold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                      {thumbnailList.length} {thumbnailList.length === 1 ? 'Item' : isImageMedia ? 'Slides' : 'Sizes'} Available
                    </span>
                  </div>
                </div>

                {thumbnailList.length > 0 ? (
                  <div className={`grid ${isVerticalMedia ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                    {thumbnailList.map((thumb, idx) => (
                      <div
                        key={thumb.url + thumb.tag + idx}
                        className="group flex flex-col justify-between rounded-2xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-card)] overflow-hidden p-3.5 space-y-3 transition-colors hover:border-[var(--tp-mid)]/40 hover:shadow-xl"
                      >
                        {/* Image Preview Container (Pristine Artwork, No Intrusive Badges) */}
                        <div className={`relative ${isVerticalMedia ? 'aspect-[3/4]' : 'aspect-video'} rounded-xl overflow-hidden bg-black/60 border border-[var(--tp-border-subtle)] flex items-center justify-center`}>
                          <img
                            src={thumb.url}
                            alt={`${thumb.label} preview`}
                            className={`w-full h-full ${isVerticalMedia ? 'object-contain bg-black/40' : 'object-cover'} transition-transform duration-300 group-hover:scale-105`}
                            loading="lazy"
                            onError={(e) => {
                              if (resolvedVideo.youtube_id && !thumb.url.includes('hqdefault.jpg')) {
                                (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/hqdefault.jpg`;
                              }
                            }}
                          />
                          <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-md text-[10px] font-mono text-white/90 px-2 py-0.5 rounded-md border border-white/10 shadow-sm pointer-events-none">
                            {thumb.res}
                          </div>
                        </div>

                        {/* Card Info & Actions Stacked */}
                        <div className="space-y-2.5 pt-0.5">
                          {/* Row 1: Title & Quality Badge */}
                          <div className="flex items-center justify-between gap-1.5">
                            <h4 className="text-xs font-bold text-[var(--tp-ink)] truncate" title={thumb.label}>
                              {thumb.label}
                            </h4>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${thumb.badgeColor}`}>
                              {thumb.badge}
                            </span>
                          </div>

                          {/* Row 2: Subtitle Specs */}
                          <div className="flex items-center justify-between text-[11px] text-[var(--tp-muted)] font-mono">
                            <span className="truncate">{thumb.sublabel || thumb.res}</span>
                            <span className="uppercase text-[10px] opacity-75 shrink-0">{isImageMedia ? 'JPG' : 'Cover'}</span>
                          </div>

                          {/* Row 3: Action Buttons (Equal 50/50 Split Grid, Full Width, Zero Text Clipping) */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <a
                              href={thumb.url}
                              target="_blank"
                              rel="noreferrer"
                              className="tp-btn tp-btn-secondary flex items-center justify-center gap-1.5 w-full text-center"
                              style={{ height: '34px', fontSize: '11px', padding: '0 6px' }}
                              title="Open full resolution in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Preview</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDownloadThumbnail(thumb.url, thumb.tag)}
                              className="tp-btn tp-btn-download flex items-center justify-center gap-1.5 w-full text-center font-medium"
                              style={{ height: '34px', fontSize: '11px', padding: '0 6px' }}
                              title="Download high-resolution JPG"
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
                    <p className="text-sm text-[var(--tp-muted)]">No cover thumbnails available for this video stream.</p>
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
                      className="w-full h-full object-contain transition-all duration-300"
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
                    fallbackUrls={[resolvedVideo.fast_download_url]}
                    animeTitle={resolvedVideo.title}
                    episodeNumber={1}
                  />
                )}
              </div>
            )}

            {/* Footer action bar */}
            <div className="tp-player-actions">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setYoutubeTab('downloads')}
                  className={`tp-btn ${youtubeTab === 'downloads' ? 'tp-btn-primary' : 'tp-btn-secondary'}`}
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Downloads</span>
                </button>

                <button
                  type="button"
                  onClick={() => setYoutubeTab('transcript')}
                  className={`tp-btn ${youtubeTab === 'transcript' ? 'tp-btn-primary' : 'tp-btn-secondary'}`}
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <Subtitles className="w-3.5 h-3.5" />
                  <span>Transcripts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setYoutubeTab('thumbnails')}
                  className={`tp-btn ${youtubeTab === 'thumbnails' ? 'tp-btn-primary' : 'tp-btn-secondary'}`}
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Thumbnails</span>
                </button>

                <button
                  type="button"
                  onClick={() => setYoutubeTab('player')}
                  className={`tp-btn ${youtubeTab === 'player' ? 'tp-btn-primary' : 'tp-btn-secondary'}`}
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Player</span>
                </button>

                {resolvedVideo.youtube_id && (
                  <button
                    type="button"
                    onClick={handleCopyEmbed}
                    className="tp-btn tp-btn-secondary"
                    style={{ height: '36px', fontSize: '12px' }}
                  >
                    {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5 text-amber-300" />}
                    <span>{copiedEmbed ? 'Embed Copied' : 'Embed Code'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyDirectLink}
                  className="tp-btn tp-btn-secondary"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <Share2 className="w-3.5 h-3.5 text-[#e4f222]" />
                  <span>Share Stream Link</span>
                </button>
              </div>

              <div className="text-xs text-[rgba(169,195,243,0.7)] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  Universal Media Dock engine. Multi-tier video, audio MP3, subtitles & high-resolution cover extraction.
                </span>
              </div>
            </div>
          </section>
        )}

        {/* MID-CONTENT AD BANNER SLOT (MONETAG / ADSTERRA READY) */}
        <AdBannerSlot slotId="ad-banner-mid" format="leaderboard" />

        {/* =========================================================================
            3-STEP FEATURES GRID (21ST.DEV GEOMETRIC MARKS)
            ========================================================================= */}
        <section className="tp-features-sec">
          <h2 className="tp-sec-title">Engineered for creators & streamers</h2>
          <p className="tp-sec-intro">
            Fast transcripts, full-resolution YouTube thumbnails, and direct TeraBox video streaming. Zero bloated apps or intrusive ads.
          </p>

          <div className="tp-features-grid">
            {/* Feature 1: Subtitle & Transcript Studio */}
            <article className="tp-feature-card">
              <div className="tp-feature-mark">
                <svg className="tp-mark" data-kind="arrow" width="64" height="64" viewBox="0 0 76 76" aria-hidden="true">
                  <defs>
                    <linearGradient id="tp-grad-arrow" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0" stopColor="#a3c6ff" />
                      <stop offset="1" stopColor="#2a5de0" />
                    </linearGradient>
                  </defs>
                  <g className="tp-mark-g">
                    <path d="M22 6H70V54L57 41V27.5L17.2 67.3L8.7 58.8L48.5 19H35Z" fill="url(#tp-grad-arrow)" />
                  </g>
                </svg>
              </div>
              <h3 className="tp-feature-title">YouTube Transcript & SRT Studio</h3>
              <p className="tp-feature-text">
                Extract timestamped subtitles from any YouTube video in seconds. One-click copy and instant export to standard .SRT or clean .TXT.
              </p>
            </article>

            {/* Feature 2: 1080p Thumbnails */}
            <article className="tp-feature-card">
              <div className="tp-feature-mark">
                <svg className="tp-mark" data-kind="ring" width="64" height="64" viewBox="0 0 76 76" aria-hidden="true">
                  <defs>
                    <linearGradient id="tp-grad-ring" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0" stopColor="#a3c6ff" />
                      <stop offset="1" stopColor="#2a5de0" />
                    </linearGradient>
                  </defs>
                  <g className="tp-mark-g">
                    <circle cx="38" cy="38" r="25" fill="none" stroke="url(#tp-grad-ring)" strokeWidth="15" />
                  </g>
                </svg>
              </div>
              <h3 className="tp-feature-title">1080p 4K Thumbnail Grabber</h3>
              <p className="tp-feature-text">
                Download original uncompressed YouTube cover art in 1080p MaxRes, 720p HQ, and Standard resolutions directly without watermarks.
              </p>
            </article>

            {/* Feature 3: TeraBox Streaming */}
            <article className="tp-feature-card">
              <div className="tp-feature-mark">
                <svg className="tp-mark" data-kind="plus" width="64" height="64" viewBox="0 0 76 76" aria-hidden="true">
                  <defs>
                    <linearGradient id="tp-grad-plus" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0" stopColor="#a3c6ff" />
                      <stop offset="1" stopColor="#2a5de0" />
                    </linearGradient>
                  </defs>
                  <g className="tp-mark-g">
                    <path d="M31 4H45V31H72V45H45V72H31V45H4V31H31Z" fill="url(#tp-grad-plus)" />
                  </g>
                </svg>
              </div>
              <h3 className="tp-feature-title">TeraBox & NephoBox Bypass</h3>
              <p className="tp-feature-text">
                Stream videos directly from 1024tera, nephobox, and freeterabox in browser without installing the desktop or mobile client app.
              </p>
            </article>
          </div>
        </section>

        {/* STATS BAND */}
        <section className="tp-stats-band">
          <div className="tp-stats-grid">
            <div>
              <div className="tp-stat-val">1.8M+</div>
              <div className="tp-stat-lbl">Videos & Transcripts Processed</div>
            </div>
            <div>
              <div className="tp-stat-val">0.6s</div>
              <div className="tp-stat-lbl">Avg Resolution Speed</div>
            </div>
            <div>
              <div className="tp-stat-val">1080p</div>
              <div className="tp-stat-lbl">Max Thumbnail & Video Quality</div>
            </div>
            <div>
              <div className="tp-stat-val">100%</div>
              <div className="tp-stat-lbl">No App or Login Required</div>
            </div>
          </div>
        </section>

        {/* SEO DOMAIN STATUS GRID & EXPLANATION */}
        <section className="tp-seo-card">
          <div className="space-y-3">
            <h2>Why Use TeraPlay Universal Creator & Video Dock?</h2>
            <p>
              Video creators, researchers, and everyday viewers often struggle with fragmented tools: downloading YouTube transcripts requires one ad-heavy site, grabbing full-res 1080p thumbnails requires another, and playing TeraBox shared videos forces users into installing heavy third-party apps.
            </p>
            <p>
              <strong>TeraPlay Universal Dock</strong> merges all these essentials into one sleek, ultra-fast web application. Extract full timestamped transcripts with 1-click SRT/TXT exports, download crisp video thumbnails in multiple dimensions, and watch cloud-shared TeraBox files right in your browser with zero bloat.
            </p>
          </div>

          <div className="tp-seo-card-status">
            <h3>Supported Gateways & Mirror Domains</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                'youtube.com',
                'youtu.be',
                'terabox.com',
                '1024tera.com',
                'nephobox.com',
                'freeterabox.com',
                '1024terabox.com',
                'teraboxlink.com',
                'mirrobox.com',
                'momerybox.com',
                'tibibox.com',
                '4funbox.com',
              ].map((domain) => (
                <div key={domain} className="tp-domain-pill">
                  <span>{domain}</span>
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
              High-performance Universal Media & Creator Dock. Instant YouTube transcripts, 1080p thumbnails, and high-speed TeraBox browser streaming.
            </p>
            <div className="tp-foot-status-badge">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All 12 CDN Gateways Operational</span>
            </div>
          </div>

          {/* Col 2: YouTube Tools */}
          <div>
            <h4 className="tp-foot-col-title">YouTube Studio Tools</h4>
            <div className="tp-foot-col-links">
              <Link to="/youtube-transcript-downloader">YouTube Transcript Downloader</Link>
              <Link to="/youtube-transcript-downloader">YouTube to SRT Generator</Link>
              <Link to="/youtube-thumbnail-downloader">1080p Thumbnail Grabber</Link>
              <Link to="/youtube-video-player">Ad-Free YouTube Player</Link>
            </div>
          </div>

          {/* Col 3: TeraBox Tools */}
          <div>
            <h4 className="tp-foot-col-title">TeraBox Tools</h4>
            <div className="tp-foot-col-links">
              <Link to="/terabox-online-player">TeraBox Online Player</Link>
              <Link to="/1024terabox-player">1024TeraBox Player</Link>
              <Link to="/nephobox-player">NephoBox Player</Link>
              <Link to="/terabox-video-downloader">TeraBox Video Downloader</Link>
              <Link to="/terabox-to-mp4">TeraBox to MP4</Link>
              <Link to="/terabox-link-opener">TeraBox Link Opener</Link>
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
            <span>© {new Date().getFullYear()} TeraPlay Universal Media & Creator Dock.</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-400 font-mono">100% Free Toolset</span>
              <span>•</span>
              <span className="text-slate-400">Zero App Overhead</span>
            </div>
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
          AUTH GATE MODAL
          ========================================================================= */}
      <Dialog open={showAuthGate} onOpenChange={setShowAuthGate}>
        <DialogContent className="sm:max-w-md bg-[var(--tp-paper-elevated)] border border-[var(--tp-border-card)] text-[var(--tp-ink)] shadow-2xl">
          <DialogHeader className="text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(38,89,217,0.15)] border border-[rgba(169,195,243,0.3)] flex items-center justify-center text-[var(--tp-mid)] dark:text-[#e4f222]">
              <Lock className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-[var(--tp-ink)]">
              Unlock Unlimited Free Media Processing
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--tp-muted)]">
              You've enjoyed your {GUEST_MAX_PLAYS} free guest sessions! Sign in with Google to unlock unlimited daily video plays, full-res YouTube transcripts, and fast MP4 downloads.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={async () => {
                try {
                  await signInWithGoogle();
                  setShowAuthGate(false);
                  try {
                    localStorage.removeItem('teraplay_guest_plays');
                    setGuestPlays(0);
                  } catch {
                    // Ignore localStorage error
                  }
                  if (inputUrl.trim()) {
                    setTimeout(() => {
                      handleResolveAndPlay();
                    }, 250);
                  }
                } catch {
                  setShowAuthGate(false);
                }
              }}
              className="h-11 rounded-xl bg-white hover:bg-slate-200 text-slate-900 font-bold text-sm gap-2 shadow-lg"
            >
              <Globe className="w-4 h-4 text-[#2659d9]" />
              <span>Continue with Google</span>
            </Button>

            <button
              type="button"
              onClick={() => {
                setShowAuthGate(false);
                try {
                  localStorage.removeItem('teraplay_guest_plays');
                  setGuestPlays(0);
                } catch {
                  // Ignore localStorage error
                }
                toast.success('Guest plays reset! Processing media...');
                if (inputUrl.trim()) {
                  setTimeout(() => {
                    handleResolveAndPlay();
                  }, 250);
                }
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors py-1 text-center font-mono"
            >
              Skip / Continue as Guest (Testing Mode)
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-400">
            100% Free Forever. No real account or card required.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
