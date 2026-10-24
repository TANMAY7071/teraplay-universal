import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface AdBannerSlotProps {
  slotId: string;
  format?: 'leaderboard' | 'rectangle' | 'banner';
  className?: string;
  customHtml?: string;
  showPlaceholder?: boolean;
}

export const AdBannerSlot: React.FC<AdBannerSlotProps> = ({
  slotId,
  format = 'leaderboard',
  className = '',
  customHtml,
  showPlaceholder = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasCreative, setHasCreative] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    if (!customHtml || !customHtml.trim()) {
      setHasCreative(false);
      return;
    }

    const range = document.createRange();
    const fragment = range.createContextualFragment(customHtml);
    container.appendChild(fragment);

    const scripts = Array.from(container.querySelectorAll('script'));
    scripts.forEach((oldScript) => {
      const fresh = document.createElement('script');
      for (const attr of Array.from(oldScript.attributes)) {
        fresh.setAttribute(attr.name, attr.value);
      }
      fresh.text = oldScript.text;
      oldScript.parentNode?.replaceChild(fresh, oldScript);
    });

    setHasCreative(scripts.length > 0 || container.children.length > 0);

    return () => {
      container.innerHTML = '';
    };
  }, [customHtml]);

  // If no creative is configured and placeholder is not requested, do not render an empty box.
  if (!customHtml && !showPlaceholder) {
    return null;
  }

  const getFormatClasses = () => {
    switch (format) {
      case 'rectangle':
        return 'w-full max-w-[300px] h-[250px] mx-auto';
      case 'banner':
        return 'w-full max-w-[468px] min-h-[60px] mx-auto';
      case 'leaderboard':
      default:
        return 'w-full max-w-[728px] min-h-[90px] mx-auto';
    }
  };

  return (
    <div
      id={slotId}
      data-ad-slot={slotId}
      data-ad-format={format}
      className={`relative my-6 rounded-3xl border border-white/10 dark:border-white/[0.08] bg-white/[0.03] dark:bg-[#0c1222]/80 backdrop-blur-2xl p-3.5 text-center overflow-hidden shadow-lg transition-[border-color] duration-300 ${className}`}
    >
      {/* Discrete label */}
      <div className="flex items-center justify-between pb-2 px-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
        <span className="flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3 h-3 text-amber-400/80" />
          {hasCreative ? 'Sponsored' : 'Ad Slot'}
        </span>
        <span className="text-slate-500 text-[10px]">
          {hasCreative ? 'Partner Network' : 'No publisher creative active'}
        </span>
      </div>

      {/* Ad content container */}
      <div
        ref={containerRef}
        className={`flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-black/20 p-4 ${getFormatClasses()}`}
      >
        {!customHtml && showPlaceholder && (
          <div className="flex flex-col items-center justify-center gap-1 text-center py-4">
            <span className="text-xs font-medium text-slate-300">
              Ad Placement Slot ({format.toUpperCase()})
            </span>
            <span className="text-[11px] text-slate-400 max-w-sm">
              Ready for Monetag, Adsterra native banner tags, or Google AdSense script integration.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdBannerSlot;
