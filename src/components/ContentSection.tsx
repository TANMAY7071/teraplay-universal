import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContentCard from "./ContentCard";
import { SkeletonGrid } from "./SkeletonCard";
import type { AnimeCardItem } from "@/types/anime";
import PageWrapper from "./layout/PageWrapper";
import ResponsiveGrid from "./layout/ResponsiveGrid";

interface ContentSectionProps {
  title: string;
  items: AnimeCardItem[];
  mode?: "grid" | "carousel" | "compact" | "featured";
}

const ContentSection = ({ title, items, mode = "grid" }: ContentSectionProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [items]);

  return (
    <section className="py-14 sm:py-16">
      <PageWrapper withTopPadding={false}>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">{title}</h2>
          <Button variant="ghost" className="rounded-full text-primary hover:text-primary/80 group text-sm sm:text-base">
            <span className="hidden sm:inline">View All</span>
            <span className="sm:hidden">All</span>
            <ChevronRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <SkeletonGrid count={12} />
        ) : (
          <ResponsiveGrid mode={mode}>
            {items.map((item) => (
              <div key={item.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] md:w-auto">
                <ContentCard
                  id={item.id}
                  slug={item.slug}
                  title={item.title}
                  image={item.image}
                  rating={item.rating}
                  episodes={item.episodes}
                  year={item.year}
                  genre={item.genre}
                  isNew={item.isNew}
                />
              </div>
            ))}
          </ResponsiveGrid>
        )}
      </PageWrapper>
    </section>
  );
};

export default ContentSection;
