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
    badge: 'Universal Link Player & Downloader',
    h1: 'TeraBox Online Video Player & Downloader',
    subheadline: 'Paste any YouTube, TeraBox, Instagram, Facebook, or TikTok link to stream and download videos instantly in high speed — no app or login required.',
    metaTitle: 'TeraBox Online Video Player & Fast MP4 Downloader | Free No App',
    metaDescription: 'Play TeraBox and 1024tera video links online in HD with no app install required. High-speed direct MP4 downloader, zero buffering, and mobile-friendly web player.',
    keywords: ['terabox player', 'terabox online player', '1024terabox player', 'terabox video downloader', 'watch terabox online'],
    faqs: [
      {
        question: 'Do I need to install the TeraBox app or register an account?',
        answer: 'No. Our browser player extracts and streams direct video files directly inside your browser without requiring the TeraBox app or account registration.'
      },
      {
        question: 'Which TeraBox mirror domains are supported?',
        answer: 'We support all 17+ TeraBox mirrors, including terabox.com, terabox.app, 1024tera.com, 1024terabox.com, nephobox.com, freeterabox.com, mirrobox.com, and 4funbox.com.'
      },
      {
        question: 'Can I download the video directly to my phone or PC as an MP4 file?',
        answer: 'Yes! After pasting your link, click the "Fast Download MP4" button to download the original video file at full network bandwidth.'
      },
      {
        question: 'Is it completely free to use?',
        answer: 'Yes. First-time visitors get free instant guest streaming. Registered members unlock unlimited free daily streams.'
      }
    ]
  },
  '/terabox-online-player': {
    path: '/terabox-online-player',
    badge: 'HD Web Player',
    h1: 'TeraBox Online Player - Watch Videos in Browser',
    subheadline: 'Bypass app install popups and throttled speeds. Watch any shared TeraBox video directly in your web browser with Picture-in-Picture and playback speed controls.',
    metaTitle: 'TeraBox Online Player - Watch TeraBox Videos in Browser without App',
    metaDescription: 'Stream TeraBox shared videos online in your web browser. Fast loading, 1080p playback, Picture-in-Picture support, and zero mandatory app downloads.',
    keywords: ['terabox online player', 'watch terabox in browser', 'stream terabox video online', 'terabox web player'],
    faqs: [
      {
        question: 'Why does TeraBox force app installation?',
        answer: 'TeraBox promotes its mobile app to drive downloads and ad views. Our web player extracts the video stream so you can watch directly in Safari, Chrome, or Firefox.'
      },
      {
        question: 'Can I adjust video speed and toggle fullscreen?',
        answer: 'Yes. Our player includes speed settings (0.5x to 2x), Picture-in-Picture, mobile landscape rotation, and fullscreen toggles.'
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
  return SEO_ROUTES[normalized] || SEO_ROUTES['/'];
}
