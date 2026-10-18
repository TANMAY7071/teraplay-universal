import { Swords, Heart, Zap, Crown, Shield, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { animeCatalog } from "@/data/anime";

const genres = [
  { name: "Action", icon: Swords },
  { name: "Romance", icon: Heart },
  { name: "Adventure", icon: Zap },
  { name: "Historical", icon: Crown },
  { name: "Martial Arts", icon: Shield },
  { name: "Fantasy", icon: Sparkles },
];

const GenreSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        <div className="mb-12 max-w-3xl">
          <h2 className="mb-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Explore by <span className="bg-gradient-accent bg-clip-text text-transparent">Genre</span>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            Discover your favorite donghua series across different genres and themes
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 lg:gap-5">
          {genres.map((genre) => {
            const IconComponent = genre.icon;
            return (
              <div
                key={genre.name}
                className="group premium-surface relative cursor-pointer overflow-hidden rounded-2xl p-5 transition-all duration-500 hover:-translate-y-1 hover:border-primary/40"
                onClick={() => navigate(`/genre/${genre.name}`)}
              >
                {/* Background Glow */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content */}
                <div className="relative z-10 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                    <IconComponent className="h-6 w-6 text-primary group-hover:text-primary" />
                  </div>
                  
                  <h3 className="mb-2 font-extrabold text-foreground transition-colors group-hover:text-primary">
                    {genre.name}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground">
                    {animeCatalog.filter((anime) => anime.genres.includes(genre.name)).length} series
                  </p>
                </div>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/30 rounded-xl transition-all duration-300" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GenreSection;
