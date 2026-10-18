import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import ContentCard from "@/components/ContentCard";
import PageWrapper from "@/components/layout/PageWrapper";
import ResponsiveGrid from "@/components/layout/ResponsiveGrid";
import { useAnimeCatalogQuery } from "@/hooks/useAnimeQueries";
import { SkeletonGrid } from "@/components/SkeletonCard";

const GenrePage = () => {
  const navigate = useNavigate();
  const { genre } = useParams();
  const [displayCount, setDisplayCount] = useState(8);

  const { data: genreContent = [], isPending } = useAnimeCatalogQuery({ genre });

  const displayedContent = genreContent.slice(0, displayCount);
  const hasMore = displayCount < genreContent.length;

  const loadMore = () => {
    setDisplayCount(prev => prev + 8);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PageWrapper className="pb-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground mb-2 sm:text-4xl lg:text-6xl">
              {genre} Donghua
            </h1>
            <p className="text-muted-foreground">
              {genreContent.length} {genre?.toLowerCase()} series available
            </p>
          </div>

          {isPending ? (
            <SkeletonGrid count={8} />
          ) : genreContent.length > 0 ? (
            <>
              <ResponsiveGrid>
                {displayedContent.map((item) => (
                  <div key={item.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] md:w-auto">
                    <ContentCard {...item} />
                  </div>
                ))}
              </ResponsiveGrid>
              
              {hasMore && (
                <div className="text-center mt-8">
                  <Button onClick={loadMore} variant="outline">
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📺</div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No {genre} donghua found
              </h2>
              <p className="text-muted-foreground">
                Check back later for new releases
              </p>
            </div>
          )}
        </div>
      </PageWrapper>
    </div>
  );
};

export default GenrePage;
