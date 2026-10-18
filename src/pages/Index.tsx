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
  Music,
  Video,
  Volume2
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
import './VideoPlayer21st.css';

export interface TranscriptItem {
  start: number;
  duration: number;
  text: string;
}

export interface TranscriptData {
  language: string;
  items: TranscriptItem[];
  count: number;
}

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

export interface ResolvedMedia {
  title: string;
  thumbnail: string;
  m3u8_url: string;
  fast_download_url: string;
  size: string;
  duration?: number;
  shareId: string;
  platform?: 'terabox' | 'youtube' | 'direct' | 'instagram' | 'facebook' | 'whatsapp';
  youtube_id?: string;
  transcript?: TranscriptData | null;
  formats?: MediaFormatOption[];
  is_mock?: boolean;
}

const GUEST_MAX_PLAYS = 5;

// Sample fallback transcript for instant demonstration and offline mode
const FALLBACK_DEMO_TRANSCRIPT: TranscriptItem[] = [
  { start: 1.36, duration: 1.68, text: "[Music intro]" },
  { start: 18.64, duration: 3.24, text: "We're no strangers to love" },
  { start: 22.64, duration: 4.32, text: "You know the rules and so do I" },
  { start: 27.04, duration: 4.0, text: "A full commitment's what I'm thinking of" },
  { start: 31.12, duration: 3.96, text: "You wouldn't get this from any other guy" },
  { start: 35.16, duration: 4.36, text: "I just wanna tell you how I'm feeling" },
  { start: 40.52, duration: 2.4, text: "Gotta make you understand" },
  { start: 43.0, duration: 2.12, text: "Never gonna give you up" },
  { start: 45.2, duration: 1.88, text: "Never gonna let you down" },
  { start: 47.32, duration: 3.8, text: "Never gonna run around and desert you" },
  { start: 51.48, duration: 2.0, text: "Never gonna make you cry" },
  { start: 53.6, duration: 1.92, text: "Never gonna say goodbye" },
  { start: 55.72, duration: 3.64, text: "Never gonna tell a lie and hurt you" },
];

function formatTime(sec: number): string {
  const totalSec = Math.max(0, Math.floor(sec));
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

function formatSrtTimestamp(seconds: number): string {
  const totalMs = Math.max(0, Math.floor(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function generateSrtContent(items: TranscriptItem[]): string {
  return items
    .map((item, index) => {
      const nextItem = items[index + 1];
      const startStr = formatSrtTimestamp(item.start);
      const dur = item.duration && item.duration > 0 ? item.duration : 2.5;
      const rawEnd = item.start + dur;
      const endVal = nextItem && nextItem.start > item.start ? Math.min(rawEnd, nextItem.start) : rawEnd;
      const endStr = formatSrtTimestamp(endVal);
      const cleanText = item.text.replace(/\r?\n+/g, '\n').trim();
      return `${index + 1}\n${startStr} --> ${endStr}\n${cleanText}`;
    })
    .join('\n\n');
}

function generateTxtContent(items: TranscriptItem[], withTimestamps: boolean, title: string): string {
  const header = `Transcript: ${title}\nExported from TeraPlay Universal Dock\n${'='.repeat(40)}\n\n`;
  const body = items
    .map((item) => {
      const clean = item.text.replace(/\r?\n+/g, ' ').trim();
      if (withTimestamps) {
        return `[${formatTime(item.start)}] ${clean}`;
      }
      return clean;
    })
    .join(withTimestamps ? '\n' : ' ');
  return header + body;
}

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
export function getStandardResTier(height?: number, fallbackLabel?: string): string {
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

export function getShortResTag(height?: number): string {
  if (!height || height <= 0) return 'MP4';
  if (height >= 2000) return '4K';
  if (height >= 1300) return '1440p 2K';
  if (height >= 950) return '1080p';
  if (height >= 650) return '720p';
  if (height >= 430) return '480p';
  if (height >= 300) return '360p';
  return `${height}p`;
}

export function isCinemaWidescreen(height?: number): boolean {
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

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 520);

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', onResize);

    const particleCount = Math.floor(Math.min(width, 1400) / 42);
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 1.6 + 0.8,
      alpha: Math.random() * 0.45 + 0.2,
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
    parent?.addEventListener('mousemove', onMouseMove);
    parent?.addEventListener('mouseleave', onMouseLeave);

    const render = () => {
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
        if (distMouse < 130) {
          const force = (130 - distMouse) / 130;
          p1.x += (dxMouse / distMouse) * force * 1.5;
          p1.y += (dyMouse / distMouse) * force * 1.5;
        }

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.2;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.16})`;
            ctx.lineWidth = 0.75;
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

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      parent?.removeEventListener('mousemove', onMouseMove);
      parent?.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="tp-canvas" />;
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
  const [activeChip, setActiveChip] = useState<'YouTube' | 'TeraBox' | 'Direct' | 'Facebook' | 'Instagram' | 'WhatsApp'>('YouTube');

  // YouTube Mode Tabs: 'downloads' | 'transcript' | 'thumbnails' | 'player'
  const [youtubeTab, setYoutubeTab] = useState<'downloads' | 'transcript' | 'thumbnails' | 'player'>('downloads');
  const [downloadFormatTab, setDownloadFormatTab] = useState<'video' | 'audio'>('video');
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

    if (raw.toLowerCase().includes('instagram.com') || raw.toLowerCase().includes('instagr.am')) {
      setActiveChip('Instagram');
      return;
    }

    if (raw.toLowerCase().includes('facebook.com') || raw.toLowerCase().includes('fb.watch') || raw.toLowerCase().includes('fb.com')) {
      setActiveChip('Facebook');
      return;
    }

    if (raw.toLowerCase().includes('whatsapp.com') || raw.toLowerCase().includes('wa.me')) {
      setActiveChip('WhatsApp');
      return;
    }

    if (/\.(mp4|m3u8|webm)(\?.*)?$/i.test(raw)) {
      setActiveChip('Direct');
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

      setResolvedVideo({
        title: data.title || 'Shared Video File',
        thumbnail: data.thumbnail || '',
        m3u8_url: data.m3u8_url || data.fast_download_url || '',
        fast_download_url: data.fast_download_url || data.m3u8_url,
        size: data.size || 'HD Quality',
        duration: data.duration,
        shareId: data.shareId || normalized.shareId || 'stream',
        platform: data.platform || (normalized.platform as ResolvedMedia['platform']),
        youtube_id: data.youtube_id,
        transcript: data.transcript || null,
        formats: data.formats || [],
        is_mock: data.is_mock,
      });

      incrementGuestPlays();
      toast.success('Stream loaded! Playing video...');

      setTimeout(() => {
        const el = document.getElementById('player-viewport');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not resolve link. Please try again.');
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

  const handleDownloadMp4 = () => {
    if (!resolvedVideo) return;
    const rawTarget = resolvedVideo.fast_download_url || resolvedVideo.m3u8_url;
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

  // ==========================================
  // YOUTUBE STUDIO ACTIONS (TRANSCRIPTS & THUMBNAILS)
  // ==========================================
  const videoFormats = useMemo(() => {
    const list = resolvedVideo?.formats?.filter((f) => !f.is_audio_only) || [];
    return [...list].sort((a, b) => (b.height || 0) - (a.height || 0));
  }, [resolvedVideo?.formats]);
  const audioFormats = useMemo(
    () => resolvedVideo?.formats?.filter((f) => f.is_audio_only) || [],
    [resolvedVideo?.formats]
  );
  const bestVideo = useMemo(() => videoFormats[0] || null, [videoFormats]);
  const bestAudio = useMemo(
    () => audioFormats.find((f) => f.format_id === 'mp3_320') || audioFormats[0] || null,
    [audioFormats]
  );
  const activeFormats = useMemo(
    () => (downloadFormatTab === 'video' ? videoFormats : audioFormats),
    [downloadFormatTab, videoFormats, audioFormats]
  );

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

  const handleDownloadThumbnail = async (imgUrl: string, qualityLabel: string) => {
    const safeTitle = (resolvedVideo?.title || 'youtube_thumbnail').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTitle}_${qualityLabel}.jpg`;
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
      toast.success(`Downloaded ${qualityLabel} thumbnail!`);
    } catch {
      window.open(imgUrl, '_blank');
      toast.info(`Opening ${qualityLabel} thumbnail in new tab`);
    }
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
          <button
            type="button"
            className="tp-theme-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>

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
        <div className="tp-hero-bg" aria-hidden="true" />
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
                    : 'Paste any YouTube, TeraBox, MP4, Facebook, or Instagram link...'
                }
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
              />

              {inputUrl && (
                <button
                  type="button"
                  onClick={() => setInputUrl('')}
                  className="px-2 text-slate-400 hover:text-white transition-colors"
                  title="Clear input"
                >
                  ✕
                </button>
              )}

              <button type="button" onClick={handlePasteClipboard} className="tp-btn tp-btn-paste">
                <Clipboard className="w-4 h-4 text-[#e4f222]" />
                <span>Paste</span>
              </button>

              <button type="submit" disabled={isLoading} className="tp-btn tp-btn-primary">
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Launch & Analyze</span>
                  </>
                )}
              </button>
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
                id: 'Direct',
                label: 'Direct MP4 / M3U8',
                icon: <Film className="w-4 h-4 text-emerald-400 shrink-0" />,
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
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={activeChip === chip.id}
                className="tp-chip"
                data-active={activeChip === chip.id ? 'true' : 'false'}
                onClick={() => {
                  const chipId = chip.id as 'YouTube' | 'TeraBox' | 'Direct' | 'Facebook' | 'Instagram' | 'WhatsApp';
                  setActiveChip(chipId);
                  urlInputRef.current?.focus();
                }}
              >
                {chip.icon}
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

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
                } catch {}
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
                        <span>Size: {resolvedVideo.size}</span>
                        <span>•</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Edge CDN Active
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isYouTubeMode ? (
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

            {/* YOUTUBE STUDIO TAB NAVIGATION */}
            {isYouTubeMode && (
              <div className="flex items-center border-b border-white/10 px-4 sm:px-6 bg-[#080e22]/70 backdrop-blur-md overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setYoutubeTab('downloads')}
                  className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    youtubeTab === 'downloads'
                      ? 'border-[#e4f222] text-[#e4f222]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>Downloads (MP4 & Audio)</span>
                  {resolvedVideo.formats && resolvedVideo.formats.length > 0 && (
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                      {resolvedVideo.formats.length} formats
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setYoutubeTab('transcript')}
                  className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    youtubeTab === 'transcript'
                      ? 'border-[#e4f222] text-[#e4f222]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Subtitles className="w-4 h-4" />
                  <span>Transcript & Subtitles</span>
                  {resolvedVideo.transcript?.items && (
                    <span className="text-[10px] bg-[#e4f222]/15 text-[#e4f222] px-2 py-0.5 rounded-full border border-[#e4f222]/30 font-mono">
                      {resolvedVideo.transcript.items.length} cues
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setYoutubeTab('thumbnails')}
                  className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    youtubeTab === 'thumbnails'
                      ? 'border-[#e4f222] text-[#e4f222]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Thumbnails (1080p HD)</span>
                  <span className="text-[10px] bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/30 font-mono">
                    4 Sizes
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setYoutubeTab('player')}
                  className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    youtubeTab === 'player'
                      ? 'border-[#e4f222] text-[#e4f222]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>Player</span>
                </button>
              </div>
            )}

            {/* TAB 0: VIDEO & AUDIO DOWNLOADS STUDIO */}
            {isYouTubeMode && youtubeTab === 'downloads' && (
              <div className="p-4 sm:p-6 space-y-8">
                {/* TOP SECTION: SIDE-BY-SIDE VIDEO PLAYER & QUICK ACTIONS CARD (IMAGE 3) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT: EMBEDDED LIVE PLAYER */}
                  <div className="lg:col-span-7 space-y-2">
                    <div id="studio-player-frame" className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl group">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube-nocookie.com/embed/${resolvedVideo.youtube_id}?autoplay=0&rel=0`}
                        title={resolvedVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                    <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Live YouTube Player (Adaptive)
                      </span>
                      <span>Max {getShortResTag(bestVideo?.height)} Ready for Download</span>
                    </div>
                  </div>

                  {/* RIGHT: QUICK DOWNLOAD CARD & ACTIONS (IMAGE 3 REFERENCE) */}
                  <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#070b1a]/90 backdrop-blur-xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/25 px-2.5 py-1 rounded-full">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        Max {getShortResTag(bestVideo?.height)} Available
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ID: {resolvedVideo.youtube_id}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
                        {resolvedVideo.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>YouTube Creator Studio</span>
                        <span>•</span>
                        <span className="text-[#e4f222] font-mono">Fast CDN Downloads</span>
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {/* Action 1: Watch Online */}
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('studio-player-frame');
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-xs sm:text-sm hover:bg-cyan-500/25 transition-all shadow-lg shadow-cyan-500/10"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Watch Online in Player</span>
                      </button>

                      {/* Action 2: Split Download Dropdown (Image 3) */}
                      <div className="relative" ref={quickDropdownRef}>
                        <div className="flex items-stretch rounded-xl shadow-lg shadow-[#e4f222]/15">
                          <a
                            href={bestVideo?.download_url || bestVideo?.url}
                            download
                            className="tp-btn tp-btn-download flex-1 justify-center rounded-r-none border-r border-black/20"
                            style={{ height: '44px', fontSize: '13px' }}
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Video ({getShortResTag(bestVideo?.height)})</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setIsQuickDropdownOpen(!isQuickDropdownOpen)}
                            className="tp-btn tp-btn-download rounded-l-none px-3.5"
                            style={{ height: '44px' }}
                            title="Select quick download quality"
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
                          <div className="absolute right-0 top-full mt-2 w-full sm:w-[320px] max-h-[360px] overflow-y-auto bg-[#070b1a]/98 border border-white/20 backdrop-blur-2xl rounded-2xl p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-3 py-1 flex items-center justify-between">
                              <span>Video Qualities (MP4)</span>
                              <span className="text-[9px] text-[#e4f222]">Standard Res</span>
                            </div>
                            <div className="space-y-0.5">
                              {videoFormats.map((vf) => {
                                const isCinema = isCinemaWidescreen(vf.height);
                                const tier = getStandardResTier(vf.height, vf.quality);
                                return (
                                  <a
                                    key={vf.format_id}
                                    href={vf.download_url || vf.url}
                                    download
                                    onClick={() => setIsQuickDropdownOpen(false)}
                                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-white/10 text-white font-medium transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Film className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                      <span className="font-semibold">
                                        {tier}
                                        {isCinema && (
                                          <span className="ml-1.5 text-[10px] text-slate-400 font-mono font-normal">
                                            ({vf.height}p)
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                    <span className="text-[10px] font-mono text-[#e4f222] bg-[#e4f222]/10 border border-[#e4f222]/20 px-1.5 py-0.5 rounded shrink-0">
                                      {vf.filesize}
                                    </span>
                                  </a>
                                );
                              })}
                            </div>

                            {audioFormats.length > 0 && (
                              <>
                                <div className="border-t border-white/10 my-2" />
                                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-3 py-1 flex items-center justify-between">
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
                                      className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-white/10 text-white font-medium transition-colors"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span className="truncate">{af.quality}</span>
                                      </span>
                                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded shrink-0">
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
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[11px] text-slate-400 text-center font-mono">
                        No registration required • High speed streaming & downloads
                      </p>
                    </div>
                  </div>
                </div>

                {/* BOTTOM SECTION: SEGMENTED SWITCHER & QUALITY TABLE (IMAGE 4 & 5) */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-white">Full Quality Downloads</h4>
                      <p className="text-xs text-slate-400">Select MP4 video resolution or MP3 audio bitrate for 1-click download.</p>
                    </div>

                    {/* Segmented Control Pill Switcher */}
                    <div className="inline-flex p-1 bg-[#050917] border border-white/10 rounded-2xl self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setDownloadFormatTab('video')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                          downloadFormatTab === 'video'
                            ? 'bg-[#e4f222] text-black shadow-lg shadow-[#e4f222]/20 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        <span>MP4 (Video)</span>
                        {videoFormats.length > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                            downloadFormatTab === 'video' ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-slate-300'
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
                            ? 'bg-[#e4f222] text-black shadow-lg shadow-[#e4f222]/20 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Music className="w-4 h-4" />
                        <span>MP3 (Audio)</span>
                        {audioFormats.length > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                            downloadFormatTab === 'audio' ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-slate-300'
                          }`}>
                            {audioFormats.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quality Table */}
                  {isLoading && activeFormats.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-[#070b1a] p-8 space-y-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-[#e4f222] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-semibold text-white">Analyzing YouTube Streams...</span>
                      </div>
                      <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
                        Extracting real 1080p Full HD, 720p HD, and master MP3 tracks directly from YouTube CDN nodes.
                      </p>
                    </div>
                  ) : activeFormats.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#070b1a]/90 backdrop-blur-md">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-white/[0.02]">
                            <th className="py-3 px-4 sm:px-6">Quality / Bitrate</th>
                            <th className="py-3 px-4">Format</th>
                            <th className="py-3 px-4">File Size</th>
                            <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs">
                          {activeFormats.map((fmt, idx) => (
                            <tr key={fmt.format_id || idx} className="hover:bg-white/[0.03] transition-colors group">
                              <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">
                                <div className="flex items-center gap-2.5">
                                  {fmt.is_audio_only ? (
                                    <Music className="w-4 h-4 text-amber-400 shrink-0" />
                                  ) : (
                                    <Film className="w-4 h-4 text-sky-400 shrink-0" />
                                  )}
                                  <div>
                                    <div className="font-bold text-white text-xs sm:text-sm">
                                      {fmt.is_audio_only
                                        ? fmt.quality
                                        : getStandardResTier(fmt.height, fmt.quality)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
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
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/10 uppercase font-bold">
                                  {fmt.ext}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <span className="text-[11px] text-[#e4f222] bg-[#e4f222]/10 border border-[#e4f222]/20 px-2 py-0.5 rounded-md">
                                  {fmt.filesize || 'Direct Stream'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 sm:px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <a
                                    href={fmt.download_url || fmt.url}
                                    download
                                    className="tp-btn tp-btn-download"
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
                                    className="tp-btn tp-btn-secondary"
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
                        This video could not be resolved from YouTube. It may be restricted, private, region-blocked, or removed by the creator.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: TRANSCRIPT & SUBTITLES STUDIO */}
            {isYouTubeMode && youtubeTab === 'transcript' && (
              <div className="p-4 sm:p-6 space-y-4">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0a122e]/80 p-3.5 rounded-2xl border border-white/10">
                  {/* Search box */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      className="w-full bg-[#050917] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e4f222]"
                      placeholder="Search within transcript..."
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                    />
                    {transcriptSearch && (
                      <button
                        type="button"
                        onClick={() => setTranscriptSearch('')}
                        className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
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
                          ? 'border-[#e4f222]/40 bg-[#e4f222]/10 text-[#e4f222]'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                      title="Toggle timestamp markers"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{showTimestamps ? 'Timestamps ON' : 'Timestamps OFF'}</span>
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
                      <FileText className="w-3.5 h-3.5 text-amber-300" />
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
                <div className="border border-white/10 rounded-2xl bg-[#060a19] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Transcript Cues</span>
                      <span>•</span>
                      <span>Showing {transcriptItems.length} lines</span>
                      {resolvedVideo.transcript?.language && (
                        <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] text-slate-300 uppercase font-mono">
                          {resolvedVideo.transcript.language}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">1-click subtitle export</span>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto p-3 sm:p-4 space-y-2 divide-y divide-white/5">
                    {transcriptItems.length > 0 ? (
                      transcriptItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="pt-2 first:pt-0 flex items-start gap-3 group hover:bg-white/[0.02] p-2 rounded-xl transition-colors"
                        >
                          {showTimestamps && (
                            <span className="shrink-0 text-xs font-mono font-bold text-[#e4f222] bg-[#e4f222]/10 border border-[#e4f222]/20 px-2 py-0.5 rounded-lg">
                              {formatTime(item.start)}
                            </span>
                          )}
                          <p className="text-sm leading-relaxed text-slate-200 select-text flex-1">
                            {item.text}
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(item.text);
                              toast.success('Line copied');
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition-opacity"
                            title="Copy this line"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center space-y-3">
                        <Info className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-sm text-slate-400">
                          {transcriptSearch ? `No matching cues found for "${transcriptSearch}".` : 'No closed captions or transcript tracks found for this video.'}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          {transcriptSearch && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTranscriptSearch('')}
                              className="border-white/15 text-xs text-slate-300"
                            >
                              Clear Search
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (resolvedVideo) {
                                setResolvedVideo({
                                  ...resolvedVideo,
                                  transcript: {
                                    language: 'en',
                                    items: FALLBACK_DEMO_TRANSCRIPT,
                                    count: FALLBACK_DEMO_TRANSCRIPT.length,
                                  },
                                });
                                toast.success('Sample transcript loaded!');
                              }
                            }}
                            className="border-white/15 text-xs text-white"
                          >
                            Load Demo Transcripts
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: THUMBNAIL STUDIO */}
            {isYouTubeMode && youtubeTab === 'thumbnails' && (
              <div className="p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Full-Resolution YouTube Thumbnails</h3>
                    <p className="text-xs text-slate-400">Download high-definition video cover images in original quality.</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-lg">
                    1080p MaxRes Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      label: 'MaxRes Quality (1080p)',
                      res: '1920 × 1080',
                      badge: 'Highest Quality',
                      badgeColor: 'text-[#e4f222] bg-[#e4f222]/15 border-[#e4f222]/30',
                      url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/maxresdefault.jpg`,
                      tag: '1080p',
                    },
                    {
                      label: 'High Quality (HQ 720p)',
                      res: '1280 × 720 / 480 × 360',
                      badge: 'High Definition',
                      badgeColor: 'text-sky-400 bg-sky-400/15 border-sky-400/30',
                      url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/hqdefault.jpg`,
                      tag: '720p',
                    },
                    {
                      label: 'Standard Quality (SD)',
                      res: '640 × 480',
                      badge: 'Standard Res',
                      badgeColor: 'text-amber-400 bg-amber-400/15 border-amber-400/30',
                      url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/sddefault.jpg`,
                      tag: '480p',
                    },
                    {
                      label: 'Medium Quality (MQ)',
                      res: '320 × 180',
                      badge: 'Compact Size',
                      badgeColor: 'text-slate-400 bg-slate-400/15 border-slate-400/30',
                      url: `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/mqdefault.jpg`,
                      tag: '180p',
                    },
                  ].map((thumb) => (
                    <div
                      key={thumb.tag}
                      className="group rounded-2xl border border-white/10 bg-[#070b1a] overflow-hidden p-3.5 space-y-3 transition-all hover:border-white/20 hover:shadow-xl"
                    >
                      {/* Image Preview Container */}
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/5">
                        <img
                          src={thumb.url}
                          alt={`${thumb.label} preview`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to hqdefault if maxresdefault is not uploaded for this video
                            (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${resolvedVideo.youtube_id}/hqdefault.jpg`;
                          }}
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${thumb.badgeColor}`}>
                            {thumb.badge}
                          </span>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white px-2 py-0.5 rounded-md border border-white/10">
                          {thumb.res}
                        </div>
                      </div>

                      {/* Info & Download Action */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <h4 className="text-xs font-bold text-white">{thumb.label}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">{thumb.res}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={thumb.url}
                            target="_blank"
                            rel="noreferrer"
                            className="tp-btn tp-btn-secondary"
                            style={{ height: '34px', fontSize: '11px', padding: '0 10px' }}
                            title="Open full resolution in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDownloadThumbnail(thumb.url, thumb.tag)}
                            className="tp-btn tp-btn-download"
                            style={{ height: '34px', fontSize: '11px', padding: '0 12px' }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download JPG</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: VIDEO PLAYER (YOUTUBE EMBED OR CUSTOM VIDEO PLAYER) */}
            {(!isYouTubeMode || youtubeTab === 'player') && (
              <div className="w-full aspect-video bg-black relative">
                {isYouTubeMode ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${resolvedVideo.youtube_id}?autoplay=1&rel=0`}
                    title={resolvedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <CustomVideoPlayer
                    videoUrl={resolvedVideo.m3u8_url}
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
                {isYouTubeMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setYoutubeTab('transcript')}
                      className="tp-btn tp-btn-primary"
                    >
                      <Subtitles className="w-4 h-4" />
                      <span>View Transcripts</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setYoutubeTab('thumbnails')}
                      className="tp-btn tp-btn-secondary"
                    >
                      <ImageIcon className="w-4 h-4 text-sky-400" />
                      <span>Get 1080p Thumbnails</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyEmbed}
                      className="tp-btn tp-btn-secondary"
                    >
                      {copiedEmbed ? <Check className="w-4 h-4 text-emerald-400" /> : <Code className="w-4 h-4 text-amber-300" />}
                      <span>{copiedEmbed ? 'Embed Copied' : 'Embed Code'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={handleDownloadMp4} className="tp-btn tp-btn-download">
                      <Download className="w-4 h-4" />
                      <span>Fast Download MP4</span>
                    </button>

                    <button type="button" onClick={handleCopyDirectLink} className="tp-btn tp-btn-secondary">
                      <Share2 className="w-4 h-4 text-[#e4f222]" />
                      <span>Share Stream Link</span>
                    </button>
                  </>
                )}
              </div>

              <div className="text-xs text-[rgba(169,195,243,0.7)] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {isYouTubeMode
                    ? 'Official YouTube studio engine. Direct subtitle & thumbnail extraction.'
                    : 'Streams directly from edge CDN servers. Zero app overhead.'}
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
        <DialogContent className="sm:max-w-md bg-[#0a1128] border border-[rgba(169,195,243,0.25)] text-white">
          <DialogHeader className="text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(38,89,217,0.2)] border border-[rgba(169,195,243,0.3)] flex items-center justify-center text-[#e4f222]">
              <Lock className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Unlock Unlimited Free Media Processing
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
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
                  } catch {}
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
                } catch {}
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
