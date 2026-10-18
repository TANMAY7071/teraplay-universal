import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  /** Main row label, e.g. "Top 10 Xianxia Masterpieces" */
  title: string;
  /** Small uppercase kicker rendered above the title */
  eyebrow?: string;
  /** Right-aligned meta content (badges, counts, timestamps) */
  meta?: React.ReactNode;
  /** Right-aligned interactive action (link/button) */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Premium section chrome: eyebrow kicker + title + hairline rule.
 * Replaces the bare `font-black` headings so each rail reads as its own zone.
 */
const SectionHeading: React.FC<SectionHeadingProps> = ({ title, eyebrow, meta, action, className }) => (
  <div className={cn("mb-3.5 space-y-0.5", className)}>
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground/90 pl-0.5 mb-0.5">
            {eyebrow}
          </div>
        )}
        <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight pl-0.5">
          {title}
        </h3>
      </div>
      {(meta || action) && (
        <div className="flex shrink-0 items-center gap-2 pb-0.5">
          {meta}
          {action}
        </div>
      )}
    </div>
  </div>
);

export default SectionHeading;
