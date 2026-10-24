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
  ArrowLeft,
  ShieldCheck,
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
  { label: "DMCA Notice", path: "/dmca" },
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Terms of Service", path: "/terms" },
  { label: "Disclaimer", path: "/disclaimer" },
  { label: "Contact Support", path: "/contact" },
];

/**
 * Shared layout for TeraPlay Universal legal and compliance pages.
 * Fully theme-responsive (Apple HIG dark midnight glass & clean light mode).
 * Includes universal navigation header, legal directory pill-deck,
 * readable typography, and the unified 4-column TeraPlay footer.
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
        <title>{title} | TeraPlay Universal</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`${title} | TeraPlay Universal`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={`${title} | TeraPlay Universal`} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      {/* FLOATING TOP NAVIGATION BAR */}
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

        <div className="tp-center-info" title="TeraPlay Legal & Trust Compliance">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Legal & Trust</span>
          <span className="tp-center-bar" aria-hidden="true" />
          <span>Compliance</span>
        </div>

        <div className="tp-nav-actions">
          <Link
            to="/"
            className="tp-btn-theme hidden sm:inline-flex items-center gap-1.5"
            title="Return to Universal Dock"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dock</span>
          </Link>

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

      {/* MAIN LEGAL CONTENT CONTAINER */}
      <main className="w-full flex-1 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <article className="mx-auto w-full max-w-3xl">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--tp-muted)] hover:text-[var(--tp-mid)] dark:hover:text-[#e4f222] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Universal Dock</span>
            </Link>

            <span
              className={`text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                theme === "light"
                  ? "bg-[#2659d9]/10 text-[#2659d9] border-[#2659d9]/25"
                  : "bg-[#e4f222]/15 text-[#e4f222] border-[#e4f222]/35"
              }`}
            >
              Updated {lastUpdated}
            </span>
          </div>

          {/* Page Heading */}
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--tp-ink)] mb-4">
              {title}
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-[var(--tp-muted)]">
              {intro}
            </p>
          </header>

          {/* Quick Legal Directory Switcher */}
          <nav
            aria-label="Legal pages directory"
            className={`mb-8 p-1.5 rounded-2xl border flex flex-wrap gap-1.5 ${
              theme === "light"
                ? "bg-slate-100/80 border-slate-200/90"
                : "bg-[rgba(8,14,34,0.85)] border-[rgba(169,195,243,0.12)] backdrop-blur-md"
            }`}
          >
            {LEGAL_PAGES.map((page) => {
              const isActive = location.pathname === page.path;
              return (
                <Link
                  key={page.path}
                  to={page.path}
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${
                    isActive
                      ? theme === "light"
                        ? "bg-[#2659d9] text-white shadow-sm"
                        : "bg-[#e4f222] text-[#0c0e13] font-black shadow-sm"
                      : theme === "light"
                      ? "text-slate-600 hover:text-slate-900 hover:bg-white"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {page.label}
                </Link>
              );
            })}
          </nav>

          {/* Numbered Sections */}
          <div className="space-y-5">
            {sections.map((section, index) => (
              <section
                key={section.heading}
                className={`rounded-2xl border p-5 sm:p-7 transition-all duration-200 ${
                  theme === "light"
                    ? "bg-white border-slate-200/90 shadow-[0_12px_36px_-10px_rgba(12,16,28,0.06)] hover:border-slate-300"
                    : "bg-[rgba(14,25,56,0.65)] border-[rgba(169,195,243,0.14)] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl hover:border-[#2659d9]/45"
                }`}
              >
                <h2 className="flex items-center gap-3 text-base sm:text-lg lg:text-xl font-bold text-[var(--tp-ink)] mb-3.5">
                  <span
                    className={`text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded-md ${
                      theme === "light"
                        ? "bg-[#2659d9]/10 text-[#2659d9] border border-[#2659d9]/25"
                        : "bg-[#e4f222]/15 text-[#e4f222] border border-[#e4f222]/30"
                    }`}
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{section.heading}</span>
                </h2>
                <div className="text-sm sm:text-[15px] leading-relaxed text-[var(--tp-muted)] space-y-3 [&_a]:text-[#2659d9] dark:[&_a]:text-[#a9c3f3] [&_a:hover]:underline [&_strong]:text-[var(--tp-ink)] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:leading-relaxed">
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
                  ? "bg-[#e4f222]/25 border-[#b6c200]/40 text-[#4c5200]"
                  : "bg-[#e4f222]/15 border-[#e4f222]/35 text-[#e4f222]"
              }`}
            >
              <Coffee className="w-7 h-7" />
            </div>
            <DialogTitle
              className={`text-xl font-bold tracking-tight mt-1 ${
                theme === "light" ? "text-slate-900" : "text-white"
              }`}
            >
              Support TeraPlay
            </DialogTitle>
            <DialogDescription
              className={`text-sm text-center max-w-sm leading-relaxed ${
                theme === "light" ? "text-slate-600" : "text-slate-300"
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
              <Share2 className="w-4 h-4 text-[#2659d9] dark:text-[#a9c3f3]" />
              <span>Share with Friends</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LegalPageShell;
