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
// INTERACTIVE PARTICLES CANVAS (21ST.DEV STYLE)
// ==========================================
const HeroParticlesCanvas: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let isVisible = true;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 520);

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', onResize);

    const particleCount = Math.min(22, Math.floor(Math.min(width, 1400) / 55));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 1.5 + 0.8,
      alpha: Math.random() * 0.4 + 0.2,
    }));

    let mouseX = -1000;
    let mouseY = -1000;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const onMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    const parent = canvas.parentElement;
    parent?.addEventListener('mousemove', onMouseMove, { passive: true });
    parent?.addEventListener('mouseleave', onMouseLeave);

    const render = () => {
      if (!isVisible) {
        animationFrameId = 0;
        return;
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0) p1.x = width;
        if (p1.x > width) p1.x = 0;
        if (p1.y < 0) p1.y = height;
        if (p1.y > height) p1.y = 0;

        const dxMouse = p1.x - mouseX;
        const dyMouse = p1.y - mouseY;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 110) {
          const force = (110 - distMouse) / 110;
          p1.x += (dxMouse / distMouse) * force * 1.2;
          p1.y += (dyMouse / distMouse) * force * 1.2;
        }

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 85) {
            const alpha = (1 - dist / 85) * 0.2;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
            ctx.lineWidth = 0.65;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p1.alpha * 0.35})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // IntersectionObserver halts animation loop completely when user scrolls away
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? true;
        if (isVisible && !animationFrameId) {
          animationFrameId = requestAnimationFrame(render);
        }
      },
      { threshold: 0 }
    );
    observer.observe(canvas);

    animationFrameId = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      parent?.removeEventListener('mousemove', onMouseMove);
      parent?.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="tp-canvas pointer-events-none" />;
});

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

  const handlePasteClipboard = async () => {
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
                onClick={signOut}
                className="tp-btn-theme text-xs px-2.5 py-1 text-slate-300 hover:text-white"
                title="Sign out of testing session"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="tp-btn-theme text-xs px-2.5 py-1 text-slate-300 hover:text-white"
              title="Sign in (Mock Mode)"
            >
              Sign In
            </button>
          )}

          <a href="#resolver-dock" className="tp-btn-nav-accent">
            <span>Open Dock</span>
            <span className="tp-btn-arrow">
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
            src="/assets/bg-night.webp"
            alt=""
            fetchPriority="high"
            decoding="async"
            className="tp-hero-sky-img tp-hero-sky-night"
          />
          <div className="tp-hero-sky-overlay" />
        </div>
        <div className="tp-canvas-field" aria-hidden="true">
          <HeroParticlesCanvas />
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
              </div>

              {/* Row 2 on mobile / Right section on desktop: Side-by-Side Paste + Launch */}
              <div className="tp-actions-row">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="tp-btn tp-btn-paste"
                  title="Paste link from clipboard"
                >
                  <Clipboard className="w-4 h-4 text-[#e4f222]" />
                  <span>Paste</span>
                </button>

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
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#FF0000" />
                    <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#ffffff" />
                  </svg>
                ),
              },
              {
                id: 'TeraBox',
                label: 'TeraBox / 1024tera',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect width="24" height="24" rx="5" fill="#0EA5E9" />
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="#ffffff" transform="scale(0.68) translate(5.6, 5.6)" />
                  </svg>
                ),
              },
              {
                id: 'TikTok',
                label: 'TikTok',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.32a6.34 6.34 0 0 0-.85-.06A6.33 6.33 0 0 0 3.15 15.6a6.33 6.33 0 0 0 6.33 6.33c3.5 0 6.34-2.84 6.34-6.33V8.89a8.17 8.17 0 0 0 4.77 1.52V6.96c-.34-.04-.68-.13-1-.27z" />
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
                    <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" stroke="#ffffff" strokeWidth="1.8" fill="none" />
                    <circle cx="12" cy="12" r="3.2" stroke="#ffffff" strokeWidth="1.8" fill="none" />
                    <circle cx="15.8" cy="8.2" r="0.9" fill="#ffffff" />
                  </svg>
                ),
              },
              {
                id: 'Facebook',
                label: 'Facebook Watch',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill="#1877F2" />
                    <path d="M15.5 12h-2.5v7.5h-3V12h-1.5V9.5h1.5V7.8c0-1.8.8-3 3-3h2.5v2.5h-1.5c-.7 0-.8.3-.8.8v1.4h2.4l-.6 2.5z" fill="#ffffff" />
                  </svg>
                ),
              },
              {
                id: 'Bilibili',
                label: 'Bilibili',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#00A1D6" aria-hidden="true">
                    <path d="M17.813 4.653h.854c1.51 0 2.769 1.233 2.769 2.758v10.446c0 1.525-1.259 2.758-2.769 2.758H5.333C3.823 20.615 2.564 19.382 2.564 17.857V7.411c0-1.525 1.259-2.758 2.769-2.758h.854l-1.92-2.112a.8.8 0 0 1 .059-1.127.8.8 0 0 1 1.127.059l2.76 3.036h7.627l2.76-3.036a.8.8 0 0 1 1.127-.059.8.8 0 0 1 .059 1.127l-1.92 2.112zM7.2 10.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm9.6 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z" />
                  </svg>
                ),
              },
              {
                id: 'Dailymotion',
                label: 'Dailymotion',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                    <text x="8" y="16" fontSize="12" fontWeight="bold" fill="currentColor">d</text>
                  </svg>
                ),
              },
              {
                id: 'Snapchat',
                label: 'Snapchat',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#FFFC00" aria-hidden="true">
                    <path d="M12.016 2.016c-3.867 0-6.023 2.836-6.023 5.484 0 .961.328 2.086.727 2.883.187.375.14.539-.14.773-.422.352-1.079.82-1.618 1.453-.445.516-.258 1.055.352 1.078.656.023 1.336-.21 1.945-.445.328-.117.516.023.633.258.469.961 1.43 2.156 3.094 2.367.21.023.351.188.351.422 0 .445-.469.727-1.125.961-.75.281-1.805.656-2.062 1.734-.14.586.234 1.055.937 1.031.984-.047 1.945-.422 2.906-.726.258-.07.492-.024.68.14.773.68 1.851.68 2.625 0 .188-.164.422-.21.68-.14.96.304 1.922.68 2.906.726.703.024 1.078-.445.937-1.031-.258-1.078-1.312-1.453-2.062-1.734-.656-.234-1.125-.516-1.125-.961 0-.234.141-.399.351-.422 1.664-.211 2.625-1.406 3.094-2.367.117-.235.305-.375.633-.258.609.235 1.289.468 1.945.445.61-.023.797-.562.352-1.078-.539-.633-1.196-1.101-1.618-1.453-.281-.234-.328-.398-.14-.773.398-.797.727-1.922.727-2.883 0-2.648-2.157-5.484-6.024-5.484z" />
                  </svg>
                ),
              },
              {
                id: 'LinkedIn',
                label: 'LinkedIn',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.67 1.67 0 1 0 0-3.34 1.67 1.67 0 0 0 0 3.34m1.39 10.24v-8.37H5.07v8.37h2.78z" />
                  </svg>
                ),
              },
              {
                id: 'Vimeo',
                label: 'Vimeo',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1AB7EA" aria-hidden="true">
                    <path d="M22.396 7.164c-.093 2.026-1.507 4.8-4.245 8.32C15.323 19.161 12.935 21 10.985 21c-1.214 0-2.24-1.119-3.08-3.356-.56-2.052-1.12-4.105-1.68-6.158-.622-2.24-1.29-3.36-2.004-3.36-.156 0-.7.328-1.634.98L1.4 7.633c1.152-1.01 2.286-2.02 3.403-3.03 1.554-1.336 2.72-2.037 3.498-2.1 1.9-.155 3.072.95 3.518 3.315.528 2.8.887 4.542 1.076 5.228.56 2.395 1.182 3.593 1.867 3.593.53 0 1.23-.746 2.1-2.24.87-1.493 1.34-2.426 1.41-2.799.155-.84-.25-1.26-1.213-1.26-.467 0-.965.093-1.494.28 1.027-3.36 3.018-4.976 5.972-4.85 2.178.094 3.204 1.23 3.078 3.404z" />
                  </svg>
                ),
              },
              {
                id: 'WhatsApp',
                label: 'WhatsApp (E2EE)',
                icon: (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z" />
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
                  urlInputRef.current?.focus();
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
              className="tp-guest-meta cursor-pointer hover:border-white/20 transition-all select-none"
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
                        urlInputRef.current?.focus();
                      }}
                      className="tp-btn tp-btn-primary active:scale-[0.98] transition-transform"
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
                className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
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
                className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
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
                className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
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
                className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
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
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all active:scale-95 shadow-xl backdrop-blur-md"
                                aria-label="Previous slide"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveSlideIndex((prev) => (prev < carouselSlides.length - 1 ? prev + 1 : 0))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all active:scale-95 shadow-xl backdrop-blur-md"
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
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 dark:text-cyan-300 font-bold text-xs sm:text-sm hover:bg-cyan-500/25 transition-all shadow-lg shadow-cyan-500/10"
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
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 dark:text-cyan-300 font-bold text-xs sm:text-sm hover:bg-cyan-500/25 transition-all shadow-lg shadow-cyan-500/10"
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
                            className="tp-btn tp-btn-download flex-1 justify-center rounded-r-none border-r border-black/20 active:scale-[0.99] transition-transform"
                            style={{ height: '44px', fontSize: '13px' }}
                          >
                            <Download className="w-4 h-4" />
                            <span>{isImageMedia ? `Download Slide ${activeSlideIndex + 1} (1080p)` : `Download Video (${getShortResTag(bestVideo?.height)})`}</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setIsQuickDropdownOpen(!isQuickDropdownOpen)}
                            className="tp-btn tp-btn-download rounded-l-none px-3.5 active:scale-[0.99] transition-transform"
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
                                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-[var(--tp-paper-input)] active:scale-[0.98] text-[var(--tp-ink)] font-medium transition-all"
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
                                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-[var(--tp-paper-input)] active:scale-[0.98] text-[var(--tp-ink)] font-medium transition-all"
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
                                      className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-[var(--tp-paper-input)] active:scale-[0.98] text-[var(--tp-ink)] font-medium transition-all"
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
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 dark:text-amber-300 font-bold text-xs sm:text-sm hover:bg-amber-500/20 active:scale-[0.98] transition-all shadow-md"
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
                          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs sm:text-sm active:scale-[0.98] transition-all shadow-md ${
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
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
                                    className="tp-btn tp-btn-download active:scale-[0.97] transition-transform"
                                    style={{ height: '34px', fontSize: '11px', padding: '0 14px' }}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(fmt.url);
                                        toast.success('Direct stream link copied!');
                                      } catch {
                                        toast.error('Could not copy link');
                                      }
                                    }}
                                    className="tp-btn tp-btn-secondary active:scale-[0.97] transition-transform"
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
                      className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
                        className="group flex flex-col justify-between rounded-2xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-card)] overflow-hidden p-3.5 space-y-3 transition-all hover:border-[var(--tp-mid)]/40 hover:shadow-xl"
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
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all active:scale-95 shadow-xl backdrop-blur-md"
                          aria-label="Previous slide"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSlideIndex((prev) => (prev < carouselSlides.length - 1 ? prev + 1 : 0))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all active:scale-95 shadow-xl backdrop-blur-md"
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
