import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Scroll-into-view reveal, same motion language as the reference design
 * (fade + 20px rise, expo-out ease). One observer per instance, unobserved
 * after firing. Static when the user prefers reduced motion.
 */
export const Reveal: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`tp-reveal${shown ? ' tp-reveal-in' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
};

/* Why-choose-us phrases, not platform names. Keep each under ~18 chars so
   the band never wraps on narrow screens. */
const MARQUEE_PLATFORMS = [
  'No Sign-Up',
  '4K Source Quality',
  'Timestamped .SRT',
  'In-Browser Player',
  'Zero Watermarks',
  'Free Forever',
  'Lossless MP3',
  '1080p Cover Art',
];

/** Hairline-bordered scrolling band of supported platforms, sits right under the hero. */
export const MarqueeBand: React.FC = () => (
  <section className="tp-marquee" aria-label="Supported platforms">
    <div className="tp-marquee-track">
      {[0, 1].map((setIdx) => (
        <div key={setIdx} className="tp-marquee-set" aria-hidden={setIdx === 1 ? 'true' : undefined}>
          {MARQUEE_PLATFORMS.map((name) => (
            <React.Fragment key={name}>
              <span className="tp-marquee-entry">{name}</span>
              <span className="tp-marquee-dot" aria-hidden="true" />
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  </section>
);

const TOOLS = [
  {
    idx: '01',
    name: 'Transcript Downloader',
    blurb:
      'Pull timestamped SubRip .SRT or clean .TXT transcripts from any YouTube link. Millisecond-accurate, author title preserved.',
    meta: 'Free — No Sign-Up',
    category: 'Transcripts & Subtitles',
    to: '/youtube-transcript-downloader',
  },
  {
    idx: '02',
    name: 'Thumbnail Downloader',
    blurb:
      'Grab uncompressed cover art up to 1080p straight from the source. No compression, no watermark, no re-encode.',
    meta: 'Free — No Sign-Up',
    category: 'Artwork & Covers',
    to: '/youtube-thumbnail-downloader',
  },
  {
    idx: '03',
    name: 'TeraBox Online Player',
    blurb:
      'Stream TeraBox, 1024tera, and NephoBox cloud links in the browser. Picture-in-Picture, custom speeds, zero app installs.',
    meta: 'Free — No Sign-Up',
    category: 'Cloud Streaming',
    to: '/terabox-online-player',
  },
];

/** Editorial tool rows: hairline rules, display-type names, accent on hover. */
export const ToolsGrid: React.FC = () => (
  <section className="tp-tools-sec">
    <div className="tp-eyebrow">
      <span className="tp-eyebrow-dot" aria-hidden="true" />
      <span>The Toolkit</span>
    </div>
    <h2 className="tp-sec-title">Three tools. One input field.</h2>
    <ul className="tp-tool-list">
      {TOOLS.map((tool) => (
        <li key={tool.idx}>
          <Reveal>
            <Link className="tp-tool-row" to={tool.to}>
              <span className="tp-tool-idx" aria-hidden="true">
                {tool.idx}
              </span>
              <span className="tp-tool-main">
                <span className="tp-tool-name">{tool.name}</span>
                <span className="tp-tool-blurb">{tool.blurb}</span>
                <span className="tp-tool-category">{tool.category}</span>
              </span>
              <span className="tp-tool-meta">
                <span className="tp-tool-cost">{tool.meta}</span>
                <span className="tp-tool-arrow" aria-hidden="true" />
              </span>
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  </section>
);

/* Real screenshots of the app flow, captured from the local dev server
   (input with link / Resolving state / results dock). Files live in
   public/assets/how-it-works/. */
const STEPS = [
  {
    idx: '01',
    name: 'Paste any link',
    blurb: 'YouTube, TeraBox, TikTok, Instagram, Twitch, and a thousand more sites. One field, no app installs, no accounts.',
    outcome: 'Any Platform',
    category: 'Paste',
    img: '/assets/how-it-works/step-01-paste.jpg',
    alt: 'The LinkCastle input field filled with a YouTube link, Launch & Analyze button below',
  },
  {
    idx: '02',
    name: 'We probe the source',
    blurb: 'LinkCastle reads the metadata and lists every format the source exposes: up to 4K MP4, lossless MP3, timestamped .SRT, 1080p cover art.',
    outcome: '4K · MP3 · SRT',
    category: 'Analyze',
    img: '/assets/how-it-works/step-02-analyzing.jpg',
    alt: 'The Launch & Analyze button in its Resolving state while LinkCastle reads the source',
  },
  {
    idx: '03',
    name: 'Results land in one dock',
    blurb: 'Downloads, transcripts, thumbnails, and a player show up in one dock. Picture-in-Picture and custom speeds, zero banner overlays.',
    outcome: 'Player & Tabs',
    category: 'Stream',
    img: '/assets/how-it-works/step-03-results.jpg',
    alt: 'The results dock with Downloads, Transcripts, Thumbnails and Player tabs and a 4K download button',
  },
  {
    idx: '04',
    name: 'Pick format & save',
    blurb: 'Choose 4K MP4 down to 360p, or MP3 at 320 kbps. File size listed on every row. One click, straight to your device, no watermarks.',
    outcome: 'One-Click Save',
    category: 'Save',
    img: '/assets/how-it-works/step-04-save.jpg',
    alt: 'The quality picker listing 4K to 360p MP4 file sizes with yellow Download buttons',
  },
];

/** How-it-works as ventures-style cards: media box on top, name + meta below. */
export const HowItWorks: React.FC = () => (
  <section className="tp-how-sec">
    <div className="tp-how-header">
      <div>
        <div className="tp-eyebrow">
          <span className="tp-eyebrow-dot" aria-hidden="true" />
          <span>How It Works</span>
        </div>
        <h2 className="tp-sec-title">Paste a link. We do the rest.</h2>
      </div>
      <div className="tp-how-count">04 / Steps</div>
    </div>
    <ul className="tp-how-grid">
      {STEPS.map((step) => (
        <li key={step.idx} className="tp-how-card">
          <Reveal>
            <div className="tp-how-img">
              <span className="tp-how-badge" aria-hidden="true">
                {step.idx}
              </span>
              <img src={step.img} alt={step.alt} loading="lazy" decoding="async" />
            </div>
            <div className="tp-how-meta-row">
              <div>
                <h3 className="tp-how-name">{step.name}</h3>
                <p className="tp-how-blurb">{step.blurb}</p>
              </div>
              <div className="tp-how-meta">
                <div className="tp-how-step">Step {step.idx}</div>
                <div className="tp-how-outcome">{step.outcome}</div>
              </div>
            </div>
            <div className="tp-how-category">{step.category}</div>
          </Reveal>
        </li>
      ))}
    </ul>
  </section>
);