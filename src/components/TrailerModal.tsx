import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Play } from "lucide-react";

interface TrailerModalProps {
  trailerUrl?: string; // MP4 or YouTube embed URL
  youtubeId?: string; // Standard youtube ID like 'dQw4w9WgXcQ'
  animeTitle?: string;
  originalTitle?: string; // e.g. "斗破苍穹"
  episodeNumber?: number;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

import { parseVideoUrl } from "@/lib/videoParser";

export function TrailerModal({ trailerUrl, youtubeId, animeTitle, originalTitle, episodeNumber, trigger, isOpen, onOpenChange }: TrailerModalProps) {
  if (!trailerUrl && !youtubeId && !animeTitle) return null;

  const rawUrl = trailerUrl || youtubeId || "";
  const parsed = parseVideoUrl(rawUrl, { autoplay: true });
  const isSearchFallback = !rawUrl.trim() && !!animeTitle;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-[900px] p-0 bg-black/90 border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="w-full aspect-video bg-black relative flex items-center justify-center">
          {isSearchFallback ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 bg-gradient-to-br from-black/80 to-purple-950/20">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <Play className="w-8 h-8 fill-current ml-1 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">✨ Preview Teaser Fallback</h3>
              <p className="text-sm text-white/60 max-w-md mb-6">
                YouTube has disabled third-party search queries in embedded frames. Click below to view the official teaser search directly on YouTube.
              </p>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                  (originalTitle || animeTitle) + (episodeNumber ? ` 第${episodeNumber}集 预告` : " 官方预告")
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-full bg-purple-600 hover:bg-purple-700 px-6 text-xs font-bold text-white transition-all duration-300 shadow-lg shadow-purple-600/35 hover:scale-105 active:scale-95"
              >
                Search on YouTube ↗
              </a>
            </div>
          ) : parsed.provider === 'direct' ? (
            <video 
              src={parsed.embedUrl} 
              controls 
              autoPlay 
              className="w-full h-full outline-none"
            />
          ) : (
            <iframe
              width="100%"
              height="100%"
              src={parsed.embedUrl}
              title="Trailer video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
