import React from "react";
import { Universe, Installment } from "@/types/universe";
import { ExternalLink, Film, User, Star, Library } from "lucide-react";

interface ProductionCreditsProps {
  universe: Universe;
  selectedInstallment: Installment;
}

export const ProductionCredits: React.FC<ProductionCreditsProps> = ({
  universe,
  selectedInstallment,
}) => {
  const isBtth = universe.slug === "battle-through-the-heavens";
  const author = isBtth ? "Tian Can Tu Dou (Tiancan Tudou)" : "Chinese Web Novel Adaptation";
  const director = isBtth ? "Gu Zhenhua" : "Tencent Production Director";
  const distributor = "Tencent Penguin Pictures";
  const mainStudio = universe.studios.split("/")[0]?.trim() || "Motion Magic";

  return (
    <div className="space-y-4 text-left">
      <div className="border-b border-white/5 pb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
          PRODUCTION REGISTRY
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[11px] pt-1">
        
        {/* COLUMN 1: STUDIO */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-wider text-[9px]">
            <Film className="h-3 w-3" />
            <span>Studio & Agency</span>
          </div>
          <div className="space-y-1">
            <div>
              <span className="text-[9px] font-black uppercase text-zinc-500 block">Animation Studio</span>
              <span className="font-bold text-zinc-300 block">{mainStudio}</span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-zinc-500 block">Distributor</span>
              <span className="font-bold text-zinc-400 block">{distributor}</span>
            </div>
          </div>
        </div>

        {/* COLUMN 2: CREATIVE TEAM */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-wider text-[9px]">
            <User className="h-3 w-3" />
            <span>Creative Team</span>
          </div>
          <div className="space-y-1">
            <div>
              <span className="text-[9px] font-black uppercase text-zinc-500 block">Original Work</span>
              <span className="font-bold text-zinc-300 block">{author}</span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-zinc-500 block">Chief Director</span>
              <span className="font-bold text-zinc-400 block">{director}</span>
            </div>
          </div>
        </div>

        {/* COLUMN 3: BROADCAST */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-wider text-[9px]">
            <Star className="h-3 w-3" />
            <span>Broadcast Specs</span>
          </div>
          <div className="space-y-1">
            <div>
              <span className="text-[9px] font-black uppercase text-zinc-500 block">Origin & Format</span>
              <span className="font-bold text-zinc-300 block">China (Donghua 3D ONA)</span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-zinc-500 block">Episode Runtime</span>
              <span className="font-bold text-zinc-400 block">24 minutes per episode</span>
            </div>
          </div>
        </div>

        {/* COLUMN 4: LINKS */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-wider text-[9px]">
            <Library className="h-3 w-3" />
            <span>External Databases</span>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <a
                href="https://anilist.co"
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-primary/45 text-[9px] font-black text-zinc-300 hover:text-white flex items-center gap-1 transition-all"
              >
                <span>AniList</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <a
                href="https://myanimelist.net"
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-primary/45 text-[9px] font-black text-zinc-300 hover:text-white flex items-center gap-1 transition-all"
              >
                <span>MAL</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>

            {universe.originalTitle && (
              <div>
                <span className="text-[9px] font-black uppercase text-zinc-500 block">Native Chinese</span>
                <span className="font-serif font-black text-primary text-[10px] block">{universe.originalTitle}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
