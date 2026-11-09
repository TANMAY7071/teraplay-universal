import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { canonicalUrl } from "@/config/site";
import { ThemeChanger } from "@/components/ThemeChanger";
import { useTheme } from "@/hooks/useTheme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Coffee,
  ExternalLink,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

export interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

export interface LegalPageShellProps {
  title: string;
  description: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

const LEGAL_PAGES = [
  { label: "DMCA NOTICE", path: "/dmca" },
  { label: "PRIVACY POLICY", path: "/privacy" },
  { label: "TERMS OF SERVICE", path: "/terms" },
  { label: "DISCLAIMER", path: "/disclaimer" },
  { label: "CONTACT SUPPORT", path: "/contact" },
];

/**
 * Shared layout for LinkCastle Universal legal and compliance pages.
 * Rendered with editorial typography (Anton display headings, Onest/Inter body,
 * uppercase subheads, and underline-active navigation tabs).
 */
const LegalPageShell: React.FC<LegalPageShellProps> = ({
  title,
  description,
  lastUpdated,
  intro,
  sections,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const location = useLocation();
  const canonical = canonicalUrl(location.pathname);

  return (
    <div className="tp-root min-h-screen flex flex-col justify-between" data-theme={theme}>
      <Helmet>
        <title>{title} | LinkCastle Universal</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`${title} | LinkCastle Universal`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={`${title} | LinkCastle Universal`} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      {/* MINIMAL FLOATING NAVIGATION BAR */}
      <header className="tp-nav">
        <Link to="/" className="tp-brand" aria-label="LinkCastle home">
          <span className="tp-brand-word">LinkCastle</span>
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

        <div className="tp-center-info" title="LinkCastle Network Status">
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
            title="Support LinkCastle"
            aria-label="Support LinkCastle"
          >
            <Coffee className="w-3.5 h-3.5 mr-1 text-black/80" aria-hidden="true" />
            <span>Support</span>
          </button>
        </div>
      </header>

      {/* MAIN LEGAL CONTENT CONTAINER */}
      <main className="w-full flex-1 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <article className="mx-auto w-full max-w-4xl">
          {/* Eyebrow: Revision + Category */}
          <div className="mb-4 text-[12px] sm:text-[13px] font-mono tracking-[0.2em] uppercase text-[var(--tp-muted)]">
            <span>LAST REVISION: {lastUpdated.toUpperCase()}</span>
            <span className="mx-2.5 opacity-50">·</span>
            <span>UNIVERSAL CLIENT TERMS</span>
          </div>

          {/* Page Heading & Intro */}
          <header className="mb-8">
            <h1
              style={{
                fontFamily: "var(--tp-font-display, 'Anton', 'Plus Jakarta Sans', sans-serif)",
                letterSpacing: "0.01em",
                lineHeight: "1.05",
              }}
              className="text-4xl sm:text-5xl lg:text-6xl font-normal uppercase tracking-wide text-[var(--tp-ink)] mb-4"
            >
              {title}
            </h1>
            {intro && (
              <p className="text-sm sm:text-base leading-relaxed text-[var(--tp-muted)] max-w-3xl">
                {intro}
              </p>
            )}
          </header>

          {/* Underlined Tab Navigation Bar */}
          <nav
            aria-label="Legal pages directory"
            className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-2 pb-1 border-b border-white/10 dark:border-white/10 mb-14"
          >
            {LEGAL_PAGES.map((page) => {
              const isActive = location.pathname === page.path;
              return (
                <Link
                  key={page.path}
                  to={page.path}
                  className={`group relative pb-3 text-xs sm:text-[13px] font-medium tracking-[0.18em] uppercase transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-[#C6F432]"
                      : "text-[var(--tp-muted)] hover:text-[var(--tp-ink)]"
                  }`}
                >
                  {page.label}
                  {/* Active lime bar OR subtle hover slide bar */}
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-all duration-300 ease-out ${
                      isActive
                        ? "bg-[#C6F432] opacity-100 scale-x-100"
                        : "bg-[#C6F432]/60 opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100"
                    }`}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </nav>

          {/* Numbered Sections with Anton Display Headings */}
          <div className="space-y-12">
            {sections.map((section, index) => (
              <section key={section.heading} className="group">
                <div className="flex items-baseline gap-4 sm:gap-6 mb-4">
                  <span
                    className="font-mono text-base sm:text-lg font-bold tracking-wider text-[#C6F432] select-none flex-shrink-0"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2
                    style={{
                      fontFamily: "var(--tp-font-display, 'Anton', 'Plus Jakarta Sans', sans-serif)",
                      letterSpacing: "0.01em",
                      lineHeight: "1.1",
                    }}
                    className="text-2xl sm:text-3xl lg:text-4xl uppercase text-[var(--tp-ink)] font-normal tracking-wide"
                  >
                    {section.heading}
                  </h2>
                </div>
                <div className="pl-9 sm:pl-12 text-sm sm:text-[15px] leading-relaxed text-[var(--tp-muted)] space-y-3.5 [&_a]:text-[#C6F432] [&_a:hover]:underline [&_strong]:text-[var(--tp-ink)] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:leading-relaxed">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>

      {/* UNIFIED 4-COLUMN FOOTER */}
      <footer className="tp-foot">
        <div className="tp-wrap tp-foot-grid">
          {/* Col 1: Brand & Status */}
          <div>
            <div className="tp-foot-brand">
              <span>LinkCastle</span>
              <svg width="17" height="14" viewBox="0 0 17 14" aria-hidden="true" className="text-[#C6F432]">
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
              <Link to="/?platform=YouTube">YouTube Studio & Shorts</Link>
              <Link to="/?platform=TeraBox">TeraBox In-Browser Stream</Link>
              <Link to="/?platform=TeraBox">1024TeraBox Mirrors</Link>
              <Link to="/?platform=TikTok">TikTok No-Watermark</Link>
              <Link to="/?platform=Instagram">Instagram Reels & Video</Link>
              <Link to="/?platform=Twitch">Twitch Clips & VODs</Link>
              <Link to="/?platform=Vimeo">Vimeo & Bilibili Hub</Link>
            </div>
          </div>

          {/* Col 3: Media Utilities */}
          <div>
            <h4 className="tp-foot-col-title">Media Utilities</h4>
            <div className="tp-foot-col-links">
              <Link to="/youtube-transcript-downloader">YouTube Transcript Downloader</Link>
              <Link to="/youtube-transcript-downloader">SubRip .SRT Generator</Link>
              <Link to="/youtube-thumbnail-downloader">1080p Thumbnail Grabber</Link>
              <Link to="/terabox-video-downloader">4K & MP4 Video Downloader</Link>
              <Link to="/terabox-to-mp4">Lossless MP3 Audio Extractor</Link>
              <Link to="/terabox-link-opener">Direct Stream Opener (M3U8)</Link>
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
            <span>© {new Date().getFullYear()} LinkCastle Universal Media Hub.</span>
          </div>
        </div>

        <div className="tp-foot-watermark" aria-hidden="true">
          <span className="tp-foot-word">LinkCastle</span>
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

      {/* SUPPORT MODAL */}
      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        <DialogContent
          className={`sm:max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border transition-all duration-200 ${
            theme === "light"
              ? "bg-white/98 text-slate-900 border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(12,16,28,0.2)] backdrop-blur-2xl"
              : "bg-[#0c152e]/98 text-slate-100 border-[#2659d9]/35 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
          }`}
        >
          <DialogHeader className="text-center flex flex-col items-center gap-2">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${
                theme === "light"
                  ? "bg-[#C6F432]/25 border-[#b6c200]/40 text-[#4c5200]"
                  : "bg-[#C6F432]/15 border-[#C6F432]/35 text-[#C6F432]"
              }`}
            >
              <Coffee className="w-7 h-7" />
            </div>
            <DialogTitle
              className={`text-xl font-bold tracking-tight mt-1 ${
                theme === "light" ? "text-slate-900" : "text-white"
              }`}
            >
              Support LinkCastle
            </DialogTitle>
            <DialogDescription
              className={`text-sm text-center max-w-sm leading-relaxed ${
                theme === "light" ? "text-slate-600" : "text-slate-300"
              }`}
            >
              LinkCastle is 100% free with zero paywalls and no mandatory accounts. If you find this tool helpful, consider supporting server costs or sharing it with friends.
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
                  toast.success("Site link copied to clipboard! Thanks for sharing.");
                  setShowSupportModal(false);
                } catch {
                  toast.error("Could not copy link to clipboard");
                }
              }}
              className={`h-11 rounded-xl font-medium text-sm gap-2 border transition-colors ${
                theme === "light"
                  ? "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800"
                  : "border-white/12 bg-white/6 hover:bg-white/12 text-white"
              }`}
            >
              <Share2 className="w-4 h-4 text-[#C6F432]" />
              <span>Share with Friends</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LegalPageShell;
