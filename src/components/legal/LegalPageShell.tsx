import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

interface LegalPageShellProps {
  title: string;
  description: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

const RELATED_PAGES = [
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Terms of Service", path: "/terms" },
  { label: "DMCA Notice", path: "/dmca" },
  { label: "Disclaimer", path: "/disclaimer" },
  { label: "Contact Us", path: "/contact" },
];

/**
 * Shared layout for the legal/static pages (DMCA, Privacy, Terms,
 * Disclaimer, Contact). Rendered inside AppShell, so navbar/footer come
 * from the app layout. Optimized for readability: ~65ch measure, numbered
 * section cards, and cross-links to the sibling legal pages.
 */
const LegalPageShell: React.FC<LegalPageShellProps> = ({
  title,
  description,
  lastUpdated,
  intro,
  sections,
}) => {
  const related = RELATED_PAGES.filter((p) => p.label !== title);

  return (
    <div className="min-h-screen bg-[#05060a] text-zinc-300">
      <Helmet><title>{title} | TeraPlay Universal</title><meta name="description" content={description} /></Helmet>

      {/* Accent band */}
      <div className="h-1 w-full bg-gradient-to-r from-[#A855F7] via-primary/60 to-[#06B6D4] opacity-80" aria-hidden="true" />

      <article className="mx-auto w-full max-w-2xl px-5 md:px-8 py-12 md:py-16">
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary border border-primary/25 bg-primary/10 rounded-full px-2.5 py-1">
              Updated {lastUpdated}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-3 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-sm md:text-[15px] leading-relaxed text-zinc-400">{intro}</p>
        </header>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <section
              key={section.heading}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-5 md:p-6 transition-colors hover:border-primary/20"
            >
              <h2 className="flex items-baseline gap-3 text-base md:text-lg font-bold text-white mb-3">
                <span
                  className="text-[11px] font-black tracking-widest text-primary/70 select-none"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.heading}
              </h2>
              <div className="text-sm md:text-[15px] leading-relaxed text-zinc-400 space-y-3 [&_a]:text-primary [&_a:hover]:underline [&_strong]:text-zinc-200 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        {/* Related legal pages */}
        <footer className="mt-12 border-t border-white/5 pt-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 mb-3">
            Continue reading
          </h2>
          <nav className="flex flex-wrap gap-2">
            {related.map((page) => (
              <Link
                key={page.path}
                to={page.path}
                className="text-xs font-bold text-zinc-400 border border-white/10 bg-white/[0.03] rounded-full px-3.5 py-1.5 hover:text-primary hover:border-primary/30 transition-colors"
              >
                {page.label}
              </Link>
            ))}
          </nav>
        </footer>
      </article>
    </div>
  );
};

export default LegalPageShell;
