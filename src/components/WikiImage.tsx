import React, { useState } from "react";
import { Globe, Users, Gift, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface WikiImageProps {
  src?: string;
  role: "hero" | "portrait" | "thumbnail" | "gallery";
  alt: string;
  className?: string;
}

export const WikiImage: React.FC<WikiImageProps> = ({ src, role, alt, className }) => {
  const [hasError, setHasError] = useState(false);

  const fallbackBackground = "bg-gradient-to-tr from-[#0c0d12] to-[#030409]";

  // Normalize/clean revision URLs on compile/render time while preserving ?cb= cache key
  const getNormalizedUrl = (urlStr?: string): string => {
    if (!urlStr) return "";
    let clean = urlStr.trim();
    if (clean.includes("wsrv.nl/?url=")) {
      try {
        const parsed = new URL(clean);
        const inner = parsed.searchParams.get("url");
        if (inner) clean = decodeURIComponent(inner);
      } catch (e) {}
    }
    if (clean.includes("/scale-to-width-down/")) {
      clean = clean.replace(/\/scale-to-width-down\/\d+/, "");
    }
    return clean;
  };

  const finalSrc = getNormalizedUrl(src);

  if (!finalSrc || hasError) {
    if (role === "hero") {
      return (
        <div className={cn("w-full h-full flex items-center justify-center relative overflow-hidden", fallbackBackground, className)}>
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]" />
          <Globe className="h-16 w-16 text-zinc-800 opacity-40 animate-pulse" />
        </div>
      );
    }
    if (role === "portrait") {
      return (
        <div className={cn("aspect-[3/4] w-full rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center relative overflow-hidden", fallbackBackground, className)}>
          <Users className="h-10 w-10 text-zinc-800 opacity-40 mb-1" />
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-wider">No Portrait</span>
        </div>
      );
    }
    if (role === "thumbnail") {
      return (
        <div className={cn("w-full h-full flex items-center justify-center relative overflow-hidden", fallbackBackground, className)}>
          <Gift className="h-8 w-8 text-zinc-800 opacity-30" />
        </div>
      );
    }
    return (
      <div className={cn("w-full h-full aspect-square flex items-center justify-center relative overflow-hidden", fallbackBackground, className)}>
        <Image className="h-6 w-6 text-zinc-800 opacity-20" />
      </div>
    );
  }

  if (role === "hero") {
    return (
      <div className={cn("absolute inset-0 overflow-hidden", className)}>
        <img
          src={finalSrc}
          alt={alt}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover opacity-75 group-hover:opacity-85 transition-opacity duration-500"
          style={{ objectPosition: "center 25%" }}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030409] via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-primary/2 opacity-0 group-hover:opacity-100 transition-all duration-300" />
      </div>
    );
  }

  if (role === "portrait") {
    return (
      <div className={cn("aspect-[3/4] rounded-2xl overflow-hidden bg-black/60 border border-white/[0.06] flex items-center justify-center relative group p-2", className)}>
        <img
          src={finalSrc}
          alt={alt}
          onError={() => setHasError(true)}
          className="max-h-full max-w-full object-contain rounded-xl transition-transform duration-500 group-hover:scale-102"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (role === "gallery") {
    return (
      <div className={cn("aspect-square rounded-2xl overflow-hidden bg-[#0c0d12]/35 border border-white/[0.06] flex items-center justify-center p-2 group cursor-pointer hover:border-primary/30 transition-all", className)}>
        <img
          src={finalSrc}
          alt={alt}
          onError={() => setHasError(true)}
          className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-500 group-hover:scale-103"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <img
      src={finalSrc}
      alt={alt}
      onError={() => setHasError(true)}
      className={cn("w-full h-full object-cover transition-transform duration-500 group-hover:scale-102", className)}
      referrerPolicy="no-referrer"
    />
  );
};
