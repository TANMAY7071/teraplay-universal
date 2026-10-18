import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HorizontalScrollRowProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
}

export const HorizontalScrollRow: React.FC<HorizontalScrollRowProps> = ({
  children,
  className,
  showArrows = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Mouse Drag & Inertia Refs
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [children, checkScroll]);

  // Inertia Deceleration loop after mouse release
  const applyInertia = () => {
    const el = containerRef.current;
    if (!el) return;

    if (Math.abs(velocityRef.current) > 0.5) {
      el.scrollLeft -= velocityRef.current;
      velocityRef.current *= 0.92; // Friction factor
      animationFrameRef.current = requestAnimationFrame(applyInertia);
    } else {
      velocityRef.current = 0;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsMouseDown(true);
    startXRef.current = e.clientX;
    startScrollLeftRef.current = el.scrollLeft;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;
    const el = containerRef.current;
    if (!el) return;
    e.preventDefault();

    const currentX = e.clientX;
    const now = performance.now();
    const dt = now - lastTimeRef.current;

    // Calculate drag distance
    const walk = currentX - startXRef.current;
    el.scrollLeft = startScrollLeftRef.current - walk;

    // Calculate instantaneous velocity for release momentum
    if (dt > 0) {
      const dx = currentX - lastXRef.current;
      velocityRef.current = (dx / dt) * 12; // Inertia multiplier
    }

    lastXRef.current = currentX;
    lastTimeRef.current = now;
  };

  const handleMouseUpOrLeave = () => {
    if (!isMouseDown) return;
    setIsMouseDown(false);
    // Trigger inertia deceleration on release
    if (Math.abs(velocityRef.current) > 1) {
      animationFrameRef.current = requestAnimationFrame(applyInertia);
    }
  };

  // Convert vertical mouse wheel over row to horizontal scroll
  const handleWheel = (e: React.WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    if (e.deltaY !== 0 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      el.scrollLeft += e.deltaY * 0.8;
    }
  };

  const scrollByAmount = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative group/scroll-row">
      {/* Left Chevron Button */}
      {showArrows && canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-30 h-9 w-9 items-center justify-center rounded-full bg-black/85 border border-white/20 text-white shadow-2xl backdrop-blur-md opacity-0 group-hover/scroll-row:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-black hover:border-primary cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        className={cn(
          "flex gap-4 overflow-x-auto pt-1.5 pb-4 scrollbar-none select-none cursor-grab active:cursor-grabbing",
          isMouseDown ? "snap-none cursor-grabbing scroll-auto" : "snap-x snap-mandatory scroll-smooth",
          className
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </div>

      {/* Right Chevron Button */}
      {showArrows && canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 h-9 w-9 items-center justify-center rounded-full bg-black/85 border border-white/20 text-white shadow-2xl backdrop-blur-md opacity-0 group-hover/scroll-row:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-black hover:border-primary cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default HorizontalScrollRow;
