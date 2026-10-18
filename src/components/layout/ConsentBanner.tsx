import React, { useState, useEffect } from "react";
import { Shield, Check, Info } from "lucide-react";

const ConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show once per browser until acknowledged
    const consent = localStorage.getItem("donghua-consent-granted");
    if (consent === null) {
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem("donghua-consent-granted", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-md z-50 animate-fade-in-up">
      <div className="glass-panel rounded-[24px] border border-white/10 p-5 shadow-2xl shadow-black/80 flex flex-col gap-4 relative overflow-hidden backdrop-blur-xl bg-background/80">
        {/* Glow accent */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
              Saved on your device only
            </h4>
            <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
              To remember your watch progress, library, and player settings, this site stores a
              small amount of data in your browser's local storage. It stays on your device —
              nothing is sent to our servers while you browse, and there are no tracking cookies
              or analytics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleAcknowledge}
            className="flex-1 h-9 rounded-full bg-primary text-[10px] font-black text-primary-foreground uppercase tracking-wider hover:bg-primary/95 transition-all duration-300 shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5"
          >
            <Check className="h-3 w-3" />
            Got it
          </button>
        </div>

        <div className="flex items-center justify-between text-[9px] text-muted-foreground/60 border-t border-white/5 pt-2.5 px-0.5">
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3 text-muted-foreground/45" />
            Clear anytime via your browser's site-data settings
          </span>
          <span>No tracking</span>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
