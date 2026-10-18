import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  mode?: "grid" | "carousel" | "compact" | "featured";
}

const ResponsiveGrid = ({ children, className, mode = "grid" }: ResponsiveGridProps) => {
  if (mode === "compact") {
    return (
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
        {children}
      </div>
    );
  }

  if (mode === "featured") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex snap-x gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        "md:grid md:snap-none md:grid-cols-3 md:overflow-visible md:pb-0",
        "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
        mode === "carousel" && "md:flex md:overflow-x-auto lg:grid lg:overflow-visible",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ResponsiveGrid;
