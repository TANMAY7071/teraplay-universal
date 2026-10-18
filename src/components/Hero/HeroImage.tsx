import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface HeroImageProps {
  image: string;
  focus: string;
  active: boolean;
  isMobile?: boolean;
  altText: string;
  focusX?: number;
  focusY?: number;
}

const HeroImage: React.FC<HeroImageProps> = ({
  image,
  focus,
  active,
  isMobile = false,
  altText,
  focusX,
  focusY
}) => {
  const [loaded, setLoaded] = useState(false);

  const computedFocus = (focusX !== undefined && focusY !== undefined)
    ? `${focusX}% ${focusY}%`
    : focus;

  const isIframe = 
    image.includes("pinterest.com") || 
    image.includes("embed.html") || 
    image.includes("youtube.com/embed") ||
    image.includes("player.vimeo.com") ||
    (image.startsWith("http") && !/\.(jpg|jpeg|png|webp|gif|svg|bmp)/i.test(image));

  if (isIframe) {
    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none z-0 bg-black">
        <iframe
          src={image}
          title={altText}
          className="absolute -top-12 left-0 w-full h-[calc(100%+48px)] border-none pointer-events-none scale-102"
          allow="autoplay; encrypted-media"
          scrolling="no"
        />
        <div className="absolute inset-0 bg-black/10 z-10 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none z-0 bg-black">
      {/* 1. Blurred Preview Placeholder (LQIP) */}
      {!loaded && (
        <div 
          className="absolute -top-12 left-0 w-full h-[calc(100%+48px)] bg-cover blur-2xl scale-110 opacity-70 transition-opacity duration-1000"
          style={{ 
            backgroundImage: `url(${image})`,
            backgroundPosition: computedFocus 
          }}
        />
      )}
      
      {/* 2. High-resolution Image Fade (Only triggers Ken Burns when loaded) */}
      <img
        src={image}
        alt={altText}
        fetchPriority={active ? "high" : "auto"}
        loading={active ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute -top-12 left-0 w-full h-[calc(100%+48px)] object-cover ease-out transition-all",
          active || loaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          objectPosition: computedFocus,
          transform: (active && loaded)
            ? (isMobile ? "translate3d(0, 48px, 0) scale3d(1.05, 1.05, 1)" : "translate3d(0, 48px, 0) scale3d(1.08, 1.08, 1)")
            : "translate3d(0, 48px, 0) scale3d(1, 1, 1)",
          transitionDuration: (active && loaded) ? "8000ms" : "0ms",
          transitionProperty: "transform, opacity",
          willChange: (active && loaded) ? "transform" : "auto"
        }}
      />
    </div>
  );
};

export default HeroImage;
