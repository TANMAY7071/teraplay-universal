import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface AdBannerSlotProps {
  slotId: string;
  format?: 'leaderboard' | 'rectangle' | 'banner';
  className?: string;
  customHtml?: string;
}

export const AdBannerSlot: React.FC<AdBannerSlotProps> = ({
  slotId,
  format = 'leaderboard',
  className = '',
  customHtml,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customHtml && containerRef.current) {
      containerRef.current.innerHTML = '';
      const range = document.createRange();
      const fragment = range.createContextualFragment(customHtml);
      containerRef.current.appendChild(fragment);
    }
  }, [customHtml]);

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
      className={`relative my-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-3 text-center overflow-hidden transition-[border-color] duration-300 hover:border-white/10 ${className}`}
    >
      {/* Discrete label */}
      <div className="flex items-center justify-between pb-2 px-1 text-[10px] uppercase tracking-wider text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#e4f222]/50" />
          Sponsored
        </span>
        <span className="text-slate-600">Adsterra / Monetag Network</span>
      </div>

      {/* Ad content container */}
      <div
        ref={containerRef}
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#080d1e]/40 p-4 ${getFormatClasses()}`}
      >
        {!customHtml && (
          <div className="flex flex-col items-center justify-center gap-1.5 text-center">
            <span className="text-xs font-semibold text-slate-400">
              Ad Placement Slot ({format.toUpperCase()})
            </span>
            <span className="text-[11px] text-slate-500 max-w-sm">
              Ready for Monetag, Adsterra native banner tags, or Google AdSense script integration.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdBannerSlot;
