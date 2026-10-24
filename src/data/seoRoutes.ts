export interface SeoRouteConfig {
  path: string;
  badge: string;
  h1: string;
  subheadline: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  faqs: { question: string; answer: string }[];
}

export const SEO_ROUTES: Record<string, SeoRouteConfig> = {
  '/': {
    path: '/',
    badge: 'Universal Media & Creator Hub',
    h1: 'Universal Online Video Player & Multi-Platform Media Saver',
    subheadline: 'Watch, stream, and download videos across YouTube, TikTok, Instagram, TeraBox, Twitch, and 1,000+ sites. Save 4K MP4s, pull clean MP3 audio, and export timestamped subtitles with zero apps or accounts.',
    metaTitle: 'Universal Online Video Player & Downloader | Free 4K & MP3',
    metaDescription: 'Free online video player and multi-platform media downloader. Stream and save videos from YouTube, TikTok, Instagram, TeraBox, and Twitch in 4K MP4, MP3, and SRT.',
    keywords: [
      'universal video player',
      'free video downloader',
      'youtube transcript downloader',
      'terabox online player',
      'tiktok no watermark downloader',
      'instagram reels saver',
      'twitch clip downloader',
      '4k video downloader',
    ],
    faqs: [
      {
        question: 'Which video and social platforms does TeraPlay support?',
        answer: 'TeraPlay supports video streaming and media downloads from YouTube, TikTok, Instagram, TeraBox, Twitch, Snapchat, LinkedIn, Facebook, Vimeo, Bilibili, Dailymotion, and X (Twitter). Our universal extractor engine also handles direct MP4, M3U8 HLS streams, and over 1,000 video hosts across the web.',
      },
      {
        question: 'How do I download or stream videos without watermarks?',
        answer: 'Paste your link into the search box and select Launch & Analyze. TeraPlay fetches the original source file directly, allowing you to download clean MP4 video without platform watermarks or app overlays.',
      },
      {
        question: 'Can I extract audio-only MP3s and timestamped subtitles?',
        answer: 'Yes. TeraPlay can extract high-bitrate MP3 audio tracks and pull accurate subtitles in SubRip (.SRT) format or clean (.TXT) transcripts for YouTube and supported video platforms.',
      },
      {
        question: 'What video resolutions and qualities are supported?',
        answer: 'We deliver video files at maximum source resolution, from 720p and 1080p Full HD up to 4K Ultra HD where provided by the creator. YouTube thumbnail cover art is exported in full uncompressed 1080p.',
      },
      {
        question: 'Is TeraPlay 100% free with no account required?',
        answer: 'Yes. TeraPlay is completely free to use directly in your browser. There are no registration forms, no subscription fees, no software installations, and no daily download limits.',
      },
    ],
  },
  '/terabox-online-player': {
    path: '/terabox-online-player',
    badge: 'HD Web Player',
    h1: 'TeraBox Online Player - Watch Videos in Browser',
    subheadline: 'Bypass app install popups and throttled speeds. Watch any shared TeraBox video directly in your web browser with playback speed and quality controls.',
    metaTitle: 'TeraBox Online Player - Watch TeraBox Videos in Browser without App',
    metaDescription: 'Stream TeraBox shared videos online in your web browser. Fast loading, 1080p playback, speed and quality controls, and zero mandatory app downloads.',
    keywords: ['terabox online player', 'watch terabox in browser', 'stream terabox video online', 'terabox web player'],
    faqs: [
      {
        question: 'Why does TeraBox force app installation?',
        answer: 'TeraBox promotes its mobile app to drive downloads and ad views. Our web player extracts the video stream so you can watch directly in Safari, Chrome, or Firefox.'
      },
      {
        question: 'Can I adjust video speed and toggle fullscreen?',
        answer: 'Yes. Our player includes speed settings (0.5x to 2x), fullscreen, and a video quality selector when the source provides more than one resolution.'
      }
    ]
  },
  '/1024terabox-player': {
    path: '/1024terabox-player',
    badge: '1024tera Dedicated Player',
    h1: '1024TeraBox Online Video Player & Downloader',
    subheadline: 'Play and download 1024tera.com and 1024terabox.com links without slowdowns. Convert 1024tera share links into direct playable video streams.',
    metaTitle: '1024TeraBox Online Video Player - Stream 1024tera Links Free',
    metaDescription: 'Direct browser player for 1024tera and 1024terabox shared links. Fast stream resolution, high quality, and instant MP4 downloads.',
    keywords: ['1024terabox player', '1024tera player', '1024terabox video downloader', '1024tera online stream'],
    faqs: [
      {
        question: 'What is 1024tera.com?',
        answer: '1024tera is one of TeraBox\'s primary international web domains. All 1024tera share links work seamlessly with our resolver.'
      }
    ]
  },
  '/nephobox-player': {
    path: '/nephobox-player',
    badge: 'NephoBox Web Player',
    h1: 'NephoBox Online Player & Link Resolver',
    subheadline: 'Extract and watch NephoBox video links in smooth high definition. No account required.',
    metaTitle: 'NephoBox Player - Stream & Download NephoBox Video Links Online',
    metaDescription: 'Fast online web player for NephoBox cloud links. Stream or download NephoBox videos with zero app installation.',
    keywords: ['nephobox player', 'nephobox video downloader', 'watch nephobox online'],
    faqs: [
      {
        question: 'Are NephoBox links compatible with TeraBox links?',
        answer: 'Yes. NephoBox is an official mirror of TeraBox and uses the same underlying share storage architecture.'
      }
    ]
  },
  '/terabox-video-downloader': {
    path: '/terabox-video-downloader',
    badge: 'High Speed Downloader',
    h1: 'TeraBox Video Downloader - Fast MP4 Download',
    subheadline: 'Download any TeraBox video link directly as high quality MP4. Uncapped speed, zero malware, and direct CDN transfer.',
    metaTitle: 'TeraBox Video Downloader - Download TeraBox Videos as MP4 (1080p)',
    metaDescription: 'Download TeraBox shared video files directly to your device as MP4. Fast download speeds without speed limits or registration.',
    keywords: ['terabox video downloader', 'download terabox video', 'terabox to mp4', 'terabox link downloader'],
    faqs: [
      {
        question: 'How fast are the video downloads?',
        answer: 'Downloads originate directly from high-speed edge CDN servers to maximize your available internet bandwidth.'
      }
    ]
  },
  '/terabox-to-mp4': {
    path: '/terabox-to-mp4',
    badge: 'Format Converter',
    h1: 'Convert TeraBox Share Links to MP4',
    subheadline: 'Paste your TeraBox cloud link to get direct streamable and downloadable MP4 files with 1 click.',
    metaTitle: 'TeraBox to MP4 Converter - Extract Direct MP4 Video Links',
    metaDescription: 'Convert TeraBox links into standard MP4 files. Works on iPhone, Android, Windows, and Mac browsers.',
    keywords: ['terabox to mp4', 'convert terabox to mp4', 'terabox mp4 link generator'],
    faqs: [
      {
        question: 'Does this work on iPhone / iOS Safari?',
        answer: 'Yes, our MP4 conversion and HLS streams are fully compatible with Safari on iOS and iPadOS.'
      }
    ]
  },
  '/terabox-link-opener': {
    path: '/terabox-link-opener',
    badge: 'Instant Link Opener',
    h1: 'TeraBox Link Opener - Open TeraBox Links in Browser',
    subheadline: 'The easiest way to open Telegram and WhatsApp TeraBox links without installing third-party apps.',
    metaTitle: 'TeraBox Link Opener - Open Any TeraBox Share Link Instantly',
    metaDescription: 'Open and inspect TeraBox links directly in your browser. Bypass login walls and app requirements in seconds.',
    keywords: ['terabox link opener', 'open terabox link online', 'bypass terabox app'],
    faqs: [
      {
        question: 'Can I paste links copied from Telegram groups?',
        answer: 'Yes! Simply copy the link from Telegram or WhatsApp and click the "Paste from Clipboard" button.'
      }
    ]
  },
  '/youtube-transcript-downloader': {
    path: '/youtube-transcript-downloader',
    badge: 'YouTube Subtitle & Transcript Studio',
    h1: 'YouTube Transcript Downloader & SRT Generator',
    subheadline: 'Extract timestamped YouTube subtitles and transcripts with 1 click. Copy clean text or download standard .SRT and .TXT formats.',
    metaTitle: 'YouTube Transcript Downloader - Free Subtitle & SRT Export Online',
    metaDescription: 'Extract accurate YouTube transcripts with timestamps. 1-click copy, download as formatted .TXT or SubRip .SRT files. Free, fast, and no login required.',
    keywords: ['youtube transcript downloader', 'download youtube subtitles', 'youtube to srt', 'copy youtube transcript', 'youtube captions download'],
    faqs: [
      {
        question: 'How do I download transcripts as .SRT or .TXT?',
        answer: 'Paste any YouTube URL or video ID into the dock, click "Play & Download", and select Tab 1: "Transcript & Subtitles". Then click "Download .SRT" or "Download .TXT".'
      },
      {
        question: 'Does this support auto-generated captions?',
        answer: 'Yes. Our extractor reads both creator-uploaded closed captions and YouTube auto-generated speech recognition tracks.'
      }
    ]
  },
  '/youtube-thumbnail-downloader': {
    path: '/youtube-thumbnail-downloader',
    badge: '4K Thumbnail Studio',
    h1: 'YouTube Thumbnail Downloader - 1080p MaxRes',
    subheadline: 'Grab crystal-clear YouTube video cover images in MaxRes 1080p, High 720p, Medium, and Standard resolutions instantly.',
    metaTitle: 'YouTube Thumbnail Downloader - Download 1080p HD Thumbnails Free',
    metaDescription: 'Download full resolution YouTube video thumbnails in 1080p MaxRes, 720p HQ, and SD. 1-click JPG image download with zero quality loss.',
    keywords: ['youtube thumbnail downloader', 'download youtube thumbnail 1080p', 'youtube cover image download', 'maxresdefault download'],
    faqs: [
      {
        question: 'What is the highest thumbnail resolution available?',
        answer: 'If the creator uploaded a full HD thumbnail, you can download the 1920x1080 MaxRes image directly.'
      }
    ]
  },
  '/youtube-video-player': {
    path: '/youtube-video-player',
    badge: 'Distraction-Free Player',
    h1: 'YouTube Online Player & Creator Dock',
    subheadline: 'Stream YouTube videos in a clean, ad-free web player with synchronized transcripts and thumbnail tools.',
    metaTitle: 'YouTube Web Player - Clean Ad-Free Embed & Media Tools',
    metaDescription: 'Watch YouTube videos without distractions, browse transcripts, and download media assets in an all-in-one dock.',
    keywords: ['youtube online player', 'clean youtube player', 'youtube creator dock'],
    faqs: [
      {
        question: 'Can I view the player and transcript together?',
        answer: 'Yes, seamlessly switch between the Player, Subtitle Transcript, and Thumbnail tabs in the unified dock.'
      }
    ]
  }
};

export function getSeoConfigForPath(pathname: string): SeoRouteConfig {
  const normalized = pathname.toLowerCase().replace(/\/$/, '') || '/';
  const config = SEO_ROUTES[normalized];
  if (!config) {
    // A route without an entry silently publishes the homepage metadata. Say
    // so during development instead of shipping a duplicate landing page.
    if (import.meta.env.DEV) {
      console.warn(`[seo] no SEO_ROUTES entry for "${normalized}", falling back to the homepage config.`);
    }
    return SEO_ROUTES['/'];
  }
  return config;
}
