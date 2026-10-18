import React from "react";
import { cn } from "@/lib/utils";

interface HeroOverlayProps {
  type: "dark" | "cinema" | "soft" | "gradient";
  isMobile?: boolean;
}

const HeroOverlay: React.FC<HeroOverlayProps> = ({ type, isMobile = false }) => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10 select-none">
      {/* Primary horizontal overlay for desktop readability (brighter artwork focus) */}
      {!isMobile && (
        <div
          className={cn(
            "absolute inset-0 transition-all duration-700",
            type === "cinema"
              ? "bg-[linear-gradient(90deg,rgba(0,0,0,0.70)_0%,rgba(0,0,0,0.30)_35%,rgba(0,0,0,0.05)_65%,rgba(0,0,0,0)_100%)]"
              : type === "soft"
              ? "bg-gradient-to-r from-background/55 via-background/25 to-transparent"
              : type === "gradient"
              ? "bg-gradient-to-r from-background/75 via-background/45 to-transparent"
              : "bg-gradient-to-r from-background/80 via-background/55 via-45% to-transparent" // Default dark (reduced by ~25%)
          )}
        />
      )}

      {/* Mobile overlays - darker and vertically oriented for overlaying text readability */}
      {isMobile && (
        <div
          className={cn(
            "absolute inset-0 transition-all duration-700",
            type === "cinema"
              ? "bg-gradient-to-t from-black via-black/70 via-45% to-black/10"
              : type === "soft"
              ? "bg-gradient-to-t from-black/70 via-black/40 to-transparent"
              : type === "gradient"
              ? "bg-gradient-to-t from-black/80 via-black/55 to-transparent"
              : "bg-gradient-to-t from-black/85 via-black/65 via-40% to-black/10" // Default dark (reduced by ~25%)
          )}
        />
      )}

      {/* Decorative Bottom Fade to blend naturally with the page content below */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/75 to-transparent",
          isMobile ? "h-[120px]" : "h-[150px] sm:h-[200px] md:h-[250px]" // Taller fade for smoother transition
        )}
      />
    </div>
  );
};

export default HeroOverlay;
