import React, { useEffect, useRef, useState, useMemo } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, RotateCcw, SkipForward, Tv, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DanmakuMessage {
  id: string;
  text: string;
  color?: string;
  top: number; // percentage from top
  time: number; // timestamp in seconds
}

const getYoutubeEmbedUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("/embed/")) return url;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return url;
};

interface CustomVideoPlayerProps {
  videoUrl: string;
  isYoutubeEmbed?: boolean;
  fallbackUrls?: string[];
  poster: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  dbComments?: any[];
  animeTitle?: string;
  episodeNumber?: number;
  initialTime?: number;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  videoUrl,
  isYoutubeEmbed: isYoutubeEmbedProp,
  fallbackUrls = [],
  poster,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
  dbComments = [],
  animeTitle = "Donghua",
  episodeNumber = 1,
  initialTime = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentSrc, setCurrentSrc] = useState(videoUrl);
  const [failoverIndex, setFailoverIndex] = useState(0);

  const isIframeEmbed = isYoutubeEmbedProp || (
    currentSrc?.includes("dailymotion.com") || 
    currentSrc?.includes("geo.dailymotion.com") ||
    currentSrc?.includes("youtube.com") || 
    currentSrc?.includes("youtu.be") || 
    currentSrc?.includes("vk.com") ||
    currentSrc?.includes("ok.ru") ||
    currentSrc?.includes("filemoon") ||
    currentSrc?.includes("doodstream") ||
    currentSrc?.includes("/embed/") ||
    (currentSrc?.includes(".html") && !currentSrc?.includes(".mp4") && !currentSrc?.includes(".m3u8"))
  );

  const embedUrl = useMemo(() => {
    if (!isIframeEmbed) return "";
    if (currentSrc?.includes("youtube.com") || currentSrc?.includes("youtu.be")) {
      const embedBase = getYoutubeEmbedUrl(currentSrc);
      const hasParams = embedBase.includes("?");
      const separator = hasParams ? "&" : "?";
      
      const params = [];
      if (!embedBase.includes("autoplay=")) params.push("autoplay=1");
      if (!embedBase.includes("mute=")) params.push("mute=0");
      if (!embedBase.includes("rel=")) params.push("rel=0");
      if (!embedBase.includes("modestbranding=")) params.push("modestbranding=1");
      
      return params.length > 0 ? `${embedBase}${separator}${params.join("&")}` : embedBase;
    }
    return currentSrc;
  }, [currentSrc, isIframeEmbed]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("donghua-player-volume");
    return saved !== null ? parseFloat(saved) : 0.85;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("donghua-player-muted") === "true";
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const saved = localStorage.getItem("donghua-player-speed");
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [showControls, setShowControls] = useState(true);
  const [danmakusEnabled, setDanmakusEnabled] = useState(true);
  const [activeDanmakus, setActiveDanmakus] = useState<DanmakuMessage[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [initialSeekDone, setInitialSeekDone] = useState(false);

  const controlsTimeoutRef = useRef<number | null>(null);
  const lastSpawnedRef = useRef<Record<string, boolean>>({});

  // Reset failover states when props change
  useEffect(() => {
    setCurrentSrc(videoUrl);
    setFailoverIndex(0);
  }, [videoUrl]);

  // 1. Reset spawning cache when URL or episode changes
  useEffect(() => {
    lastSpawnedRef.current = {};
    setActiveDanmakus([]);
    setInitialSeekDone(false);
  }, [currentSrc, episodeNumber]);

  // Sync player preferences back onto video ref when URL loads
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = isMuted ? 0 : volume;
      video.playbackRate = playbackSpeed;
      video.muted = isMuted;
    }
  }, [currentSrc, volume, playbackSpeed, isMuted]);

  const triggerFailover = () => {
    if (fallbackUrls && failoverIndex < fallbackUrls.length) {
      const nextUrl = fallbackUrls[failoverIndex];
      console.warn(`Failover triggered! Switching from ${currentSrc} to backup URL: ${nextUrl}`);
      setFailoverIndex(prev => prev + 1);
      setCurrentSrc(nextUrl);
    } else {
      console.error("HLS player: All failover options exhausted.");
    }
  };

  // 2. Initialize Hls.js dynamically for HLS streams (.m3u8)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsPlaying(false);
    setCurrentTime(0);

    const isHls = currentSrc?.includes(".m3u8") || false;
    let hlsInstance: any = null;

    const handleNativeError = () => {
      console.warn("Native HLS video error, triggering failover...");
      triggerFailover();
    };

    if (isHls) {
      // Dynamic import of Hls.js to avoid building issues
      const loadHls = async () => {
        if (Hls || (window as any).Hls) {
          initHls(Hls || (window as any).Hls);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
        script.async = true;
        script.onload = () => {
          if ((window as any).Hls) {
            initHls((window as any).Hls);
          }
        };
        document.body.appendChild(script);
      };

      const initHls = (HlsClass: any) => {
        if (HlsClass.isSupported()) {
          hlsInstance = new HlsClass({
            maxBufferSize: 30 * 1024 * 1024,
            maxBufferLength: 30,
            enableWorker: true
          });
          hlsInstance.loadSource(currentSrc);
          hlsInstance.attachMedia(video);
          
          hlsInstance.on(HlsClass.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
              console.warn(`HLS fatal error: type = ${data.type}, details = ${data.details}`);
              if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
                hlsInstance.destroy();
                hlsInstance = null;
                triggerFailover();
              } else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
                hlsInstance.recoverMediaError();
              } else {
                hlsInstance.destroy();
                hlsInstance = null;
                triggerFailover();
              }
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS support (Safari)
          video.src = currentSrc;
          video.addEventListener("error", handleNativeError);
        }
      };

      loadHls();
    } else {
      video.src = currentSrc;
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      video.removeEventListener("error", handleNativeError);
    };
  }, [currentSrc]);

  // 3. Spawns Danmaku comments based on video playback timestamp
  useEffect(() => {
    if (!danmakusEnabled || !isPlaying) return;

    // Filter comments that align with the current second
    const currentSecond = Math.floor(currentTime);
    dbComments.forEach((comment) => {
      // Spawn criteria: comment has content, within current second, and not spawned yet
      const key = `${comment.id}-${currentSecond}`;
      if (
        comment.content &&
        !lastSpawnedRef.current[key] &&
        Math.abs((comment.timestamp_seconds || 0) - currentSecond) <= 1
      ) {
        lastSpawnedRef.current[key] = true;
        
        // Setup lanes (0 to 4 lanes to avoid overlapping)
        const lane = Math.floor(Math.random() * 5);
        const topOffset = 8 + lane * 15; // 8%, 23%, 38%, 53%, 68% height

        const newDanmaku: DanmakuMessage = {
          id: `${comment.id}-${Date.now()}`,
          text: comment.content,
          color: comment.danmaku_color || "#FFFFFF",
          top: topOffset,
          time: currentTime,
        };

        setActiveDanmakus((prev) => [...prev, newDanmaku]);

        // Clean up danmaku after 7 seconds (finished animating)
        setTimeout(() => {
          setActiveDanmakus((prev) => prev.filter((d) => d.id !== newDanmaku.id));
        }, 7000);
      }
    });
  }, [currentTime, isPlaying, dbComments, danmakusEnabled]);

  // 4. Handle mouse movement to show/hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(err => console.warn("Playback prevented:", err));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (onTimeUpdate) {
      onTimeUpdate(video.currentTime, video.duration || 1);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    
    // Seek to last progress time if provided and not done yet
    if (initialTime > 0 && !initialSeekDone) {
      video.currentTime = initialTime;
      setCurrentTime(initialTime);
      setInitialSeekDone(true);
      console.log(`Seeked player to initial timestamp: ${initialTime}s`);
    }
  };

  const handleScrub = (val: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = (val[0] / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (val: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = val[0];
    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
    video.muted = newVolume === 0;
    localStorage.setItem("donghua-player-volume", newVolume.toString());
    localStorage.setItem("donghua-player-muted", (newVolume === 0).toString());
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const muteState = !isMuted;
    setIsMuted(muteState);
    video.muted = muteState;
    localStorage.setItem("donghua-player-muted", muteState.toString());
    if (!muteState && volume === 0) {
      setVolume(0.5);
      video.volume = 0.5;
      localStorage.setItem("donghua-player-volume", "0.5");
    }
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    setPlaybackSpeed(speed);
    video.playbackRate = speed;
    localStorage.setItem("donghua-player-speed", speed.toString());
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Fullscreen request failed:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Sync fullscreen change with ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const skipIntro = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 90; // Skip typical 1.5 min intro
    setCurrentTime(90);
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const hasIntro = currentTime > 10 && currentTime < 90;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full h-full bg-black select-none overflow-hidden group/player"
    >
      {isIframeEmbed ? (
        <iframe
          src={embedUrl}
          className="w-full h-full border-0 aspect-video absolute inset-0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          title={animeTitle}
        />
      ) : (
        <video
          ref={videoRef}
          poster={poster}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={handlePlayPause}
          onPlay={() => {
            setIsPlaying(true);
            onPlay?.();
          }}
          onPause={() => {
            setIsPlaying(false);
            onPause?.();
          }}
          onEnded={() => {
            setIsPlaying(false);
            onEnded?.();
          }}
          onError={() => {
            console.warn("Video element reported source load error, triggering failover...");
            triggerFailover();
          }}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />
      )}

      {/* DANMAKU OVERLAY TRACKS */}
      {!isIframeEmbed && danmakusEnabled && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {activeDanmakus.map((d) => (
            <div
              key={d.id}
              className="absolute text-sm sm:text-base font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-danmaku-move"
              style={{
                top: `${d.top}%`,
                color: d.color,
                right: "-100%", // starts offscreen
              }}
            >
              {d.text}
            </div>
          ))}
        </div>
      )}

      {/* SKIP INTRO FLOATING CHIP */}
      {!isIframeEmbed && hasIntro && (
        <button
          onClick={skipIntro}
          className="absolute bottom-24 right-6 z-25 bg-black/75 hover:bg-primary border border-white/20 hover:border-transparent text-white font-extrabold text-xs sm:text-sm py-2.5 px-5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 active:opacity-90 transition-colors animate-reveal-up"
        >
          <SkipForward className="w-4 h-4 fill-current" />
          Skip Intro
        </button>
      )}

      {/* GLASSMORPHIC PLAYER CONTROLS OVERLAY */}
      {!isIframeEmbed && (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/35 flex flex-col justify-between p-4 transition-all duration-300 z-20",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Top Control Bar: Header details */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col text-left"></div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDanmakusEnabled(!danmakusEnabled)}
                className={cn(
                  "rounded-full text-xs font-bold flex items-center gap-1.5 h-8 px-3 border border-white/10 hover:bg-white/10",
                  danmakusEnabled ? "text-primary border-primary/20 bg-primary/10" : "text-white"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Danmaku {danmakusEnabled ? "On" : "Off"}</span>
              </Button>
            </div>
          </div>

          {/* Central Play/Pause large action overlay (appears on hover) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={cn(
                "w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md transition-all duration-300 transform scale-90",
                showControls ? "opacity-40 scale-100" : "opacity-0"
              )}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-1" />}
            </div>
          </div>

          {/* Bottom Control Bar */}
          <div className="space-y-4">
            {/* Progress Timeline */}
            <div className="flex items-center gap-3 w-full">
              <span className="text-[10px] sm:text-xs font-mono text-white/70 min-w-[35px] text-right">
                {formatTime(currentTime)}
              </span>
              
              <div className="flex-1">
                <Slider
                  value={[duration ? (currentTime / duration) * 100 : 0]}
                  onValueChange={handleScrub}
                  max={100}
                  step={0.1}
                  className="cursor-pointer py-2 [&_.relative]:bg-white/20 [&_.absolute]:bg-primary"
                />
              </div>

              <span className="text-[10px] sm:text-xs font-mono text-white/70 min-w-[35px]">
                {formatTime(duration)}
              </span>
            </div>

            {/* Controls button row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Play Pause */}
                <button
                  onClick={handlePlayPause}
                  className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white shadow transition-all duration-200"
                >
                  {isPlaying ? <Pause className="w-4.5 h-4.5 fill-white" /> : <Play className="w-4.5 h-4.5 fill-white ml-0.5" />}
                </button>

                {/* Skip 10s */}
                <button
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10);
                  }}
                  className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  title="Back 10s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2 group/vol">
                  <button
                    onClick={toggleMute}
                    className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="w-16 sm:w-20 transition-all duration-300">
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      onValueChange={handleVolumeChange}
                      max={1}
                      step={0.05}
                      className="cursor-pointer [&_.relative]:bg-white/20 [&_.absolute]:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Speed Controller */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10 text-xs font-bold px-2.5"
                    >
                      <span>{playbackSpeed}x</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-white/10 rounded-xl">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <DropdownMenuItem
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={cn(
                          "text-xs font-semibold cursor-pointer",
                          playbackSpeed === speed && "text-primary bg-primary/5"
                        )}
                      >
                        {speed === 1 ? "Normal (1x)" : `${speed}x`}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  title="Fullscreen"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

