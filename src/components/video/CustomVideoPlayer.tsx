import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Thin h-1 clickable+draggable bar (mock-style). value: 0-100, white fill. */
const ThinBar: React.FC<{
  value: number;
  onChange: (pct: number) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const setFromClientX = (clientX: number) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(ratio * 100);
  };

  return (
    <div
      ref={barRef}
      className={cn("relative w-full h-1 bg-white/20 rounded-full cursor-pointer", className)}
      onPointerDown={(e) => {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) setFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    >
      <div
        className="absolute top-0 left-0 h-full bg-white rounded-full pointer-events-none"
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

/** Playback rates offered by the speed menu. */
const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

/** One selectable rendition of the current video. */
export interface PlayerQuality {
  /** Short label shown in the menu, e.g. "1080p". */
  label: string;
  /** Playable URL. Must carry audio — use the server-muxed stream, not a raw video-only track. */
  url: string;
  height: number;
}

interface PlayerMenuItem {
  value: string;
  label: string;
}

/**
 * Single-button control that opens a short option list.
 *
 * Replaces the four separate speed buttons with one trigger that fits the
 * mobile control bar, and doubles as the quality selector when the source
 * ships more than one rendition. The panel opens upward because the control
 * bar is pinned to the bottom of the video.
 */
const PlayerMenu: React.FC<{
  items: PlayerMenuItem[];
  value: string;
  onSelect: (value: string) => void;
  trigger: string;
  title: string;
  /** Highlight the trigger when the user has moved off the default. */
  isModified?: boolean;
}> = ({ items, value, onSelect, trigger, title, isModified = false }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={title}
        className={cn(
          "inline-flex items-center justify-center rounded-md h-10 px-2.5 text-sm font-medium transition-colors whitespace-nowrap",
          isModified
            ? "bg-[#e4f222] text-black font-bold"
            : "text-white hover:bg-[#111111d1]"
        )}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={title}
          className="absolute bottom-full right-0 mb-2 z-50 min-w-[7rem] overflow-hidden rounded-xl border border-white/10 bg-[#111111f2] py-1 shadow-2xl shadow-black/60 backdrop-blur-md"
        >
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              role="menuitemradio"
              aria-checked={item.value === value}
              onClick={() => {
                onSelect(item.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                item.value === value
                  ? "text-[#e4f222] font-bold"
                  : "text-white hover:bg-white/10"
              )}
            >
              <span className="w-3 shrink-0">
                {item.value === value && <Check className="w-3 h-3" />}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const getYoutubeEmbedUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("/embed/")) return url;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
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
  /** Alternative renditions of the same video, highest first. Rendered as a quality menu when 2+ are supplied. */
  qualities?: PlayerQuality[];
  poster: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  animeTitle?: string;
  episodeNumber?: number;
  initialTime?: number;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  videoUrl,
  isYoutubeEmbed: isYoutubeEmbedProp,
  fallbackUrls = [],
  qualities = [],
  poster,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
  animeTitle = "Donghua",
  episodeNumber = 1,
  initialTime = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentSrc, setCurrentSrc] = useState(videoUrl);

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
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [initialSeekDone, setInitialSeekDone] = useState(false);
  const [activeQualityIndex, setActiveQualityIndex] = useState(0);

  const controlsTimeoutRef = useRef<number | null>(null);
  const overControlsRef = useRef(false);
  // True while the pointer is anywhere over the player. The keyboard
  // shortcuts only apply then, or while the player holds focus.
  const pointerOverRef = useRef(false);
  // A quality switch swaps the media source, which reloads the buffer from
  // byte 0. These carry the playback position and play state across it.
  const pendingSeekRef = useRef<number | null>(null);
  const resumeAfterSwapRef = useRef(false);
  // Failover bookkeeping. One media error can reach the handler twice (the
  // React error prop and the native media event), and a candidate that equals
  // the current source cannot recover anything.
  const failoverTriggeredRef = useRef(false);
  const triedFallbacksRef = useRef<string[]>([]);
  const [failoverExhausted, setFailoverExhausted] = useState(false);

  // Reset failover states when props change
  useEffect(() => {
    setCurrentSrc(videoUrl);
    setActiveQualityIndex(0);
    triedFallbacksRef.current = [];
    setFailoverExhausted(false);
  }, [videoUrl]);

  // 1. Reset the initial seek when the URL or episode changes
  useEffect(() => {
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

  const triggerFailover = useCallback(() => {
    // A single error reaches this twice: once through the React error prop and
    // once through the native media event. One failure must advance the list by
    // one entry, not two.
    if (failoverTriggeredRef.current) return;

    const nextUrl = fallbackUrls.find(
      (u) => u && u !== currentSrc && !triedFallbacksRef.current.includes(u)
    );

    if (!nextUrl) {
      console.error("[HLS player] All failover options exhausted.");
      setFailoverExhausted(true);
      return;
    }

    triedFallbacksRef.current.push(nextUrl);
    failoverTriggeredRef.current = true;
    console.warn(`Failover triggered! Switching from ${currentSrc} to backup URL: ${nextUrl}`);
    setCurrentSrc(nextUrl);
    // The backup is the primary rendition, so the quality chip follows it.
    setActiveQualityIndex(0);
  }, [fallbackUrls, currentSrc]);

  // 2. Initialize hls.js for HLS streams (.m3u8)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // A new source gets a fresh set of failover candidates.
    failoverTriggeredRef.current = false;

    const isHls = currentSrc?.includes(".m3u8") || false;
    let hlsInstance: Hls | null = null;

    const handleNativeError = () => {
      console.warn("Native HLS video error, triggering failover...");
      triggerFailover();
    };

    if (isHls) {
      if (Hls.isSupported()) {
        hlsInstance = new Hls({
          maxBufferSize: 30 * 1024 * 1024,
          maxBufferLength: 30,
          enableWorker: true,
        });
        hlsInstance.loadSource(currentSrc);
        hlsInstance.attachMedia(video);

        hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          console.warn(`HLS fatal error: type = ${data.type}, details = ${data.details}`);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hlsInstance?.destroy();
            hlsInstance = null;
            triggerFailover();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hlsInstance?.recoverMediaError();
          } else {
            hlsInstance?.destroy();
            hlsInstance = null;
            triggerFailover();
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari)
        video.src = currentSrc;
        video.addEventListener("error", handleNativeError);
      }
    } else {
      video.src = currentSrc;
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      video.removeEventListener("error", handleNativeError);
    };
  }, [currentSrc, triggerFailover]);

  // 3. Handle mouse/touch movement to show/hide controls (hover-only UX)
  const handleMouseMove = () => {
    if (overControlsRef.current) return; // over the glass bar: never re-arm the hide timer
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

    // A quality switch already captured the position; restore it and resume.
    if (pendingSeekRef.current !== null) {
      const target = pendingSeekRef.current;
      pendingSeekRef.current = null;
      const shouldResume = resumeAfterSwapRef.current;
      resumeAfterSwapRef.current = false;
      video.currentTime = target;
      setCurrentTime(target);
      if (shouldResume) {
        video.play().catch((err) => console.warn("Resume after quality switch failed:", err));
      }
      return;
    }

    // Seek to last progress time if provided and not done yet
    if (initialTime > 0 && !initialSeekDone) {
      video.currentTime = initialTime;
      setCurrentTime(initialTime);
      setInitialSeekDone(true);
      console.log(`Seeked player to initial timestamp: ${initialTime}s`);
    }
  };

  const handleVolumeChange = useCallback((val: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = val[0];
    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
    video.muted = newVolume === 0;
    localStorage.setItem("donghua-player-volume", newVolume.toString());
    localStorage.setItem("donghua-player-muted", (newVolume === 0).toString());
  }, []);

  const toggleMute = useCallback(() => {
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
  }, [isMuted, volume]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    localStorage.setItem("donghua-player-speed", speed.toString());
  };

  // Deduplicate incoming qualities so the player menu never shows duplicate resolution tags
  const distinctQualities = useMemo(() => {
    const seen = new Set<string>();
    return qualities.filter((q) => {
      const key = q.label || `${q.height}p`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [qualities]);

  /**
   * Swap the media source to a different rendition of the same video.
   *
   * The new source reloads the buffer from byte 0, so the current position
   * and play state are captured here and restored in handleLoadedMetadata.
   */
  const handleQualityChange = (index: number) => {
    const target = distinctQualities[index];
    if (!target || index === activeQualityIndex) return;
    const video = videoRef.current;
    pendingSeekRef.current = video ? video.currentTime : currentTime;
    resumeAfterSwapRef.current = video ? !video.paused && !video.ended : isPlaying;
    setActiveQualityIndex(index);
    setCurrentSrc(target.url);
  };

  const toggleFullscreen = useCallback(() => {
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
  }, []);

  // Sync fullscreen change with ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard shortcuts (native player only): space/k play, arrows seek/volume, m mute, f fullscreen
  useEffect(() => {
    if (isIframeEmbed) return;

    // Space and the arrow keys belong to whatever control has focus. The
    // player only takes them while the pointer is over it or it holds focus.
    const isInteractiveTarget = (el: HTMLElement | null) =>
      !!el &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable ||
        !!el.closest(
          "button, a, select, [role='tab'], [role='menuitem'], [role='menuitemradio'], [role='slider']"
        ));

    const playerIsActive = () =>
      pointerOverRef.current || !!containerRef.current?.contains(document.activeElement);

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
        case "k":
          if (isInteractiveTarget(target) || !playerIsActive()) return;
          e.preventDefault();
          if (video.paused) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
          break;
        case "ArrowRight":
          if (isInteractiveTarget(target) || !playerIsActive()) return;
          video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5);
          break;
        case "ArrowLeft":
          if (isInteractiveTarget(target) || !playerIsActive()) return;
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case "ArrowUp":
          if (isInteractiveTarget(target) || !playerIsActive()) return;
          e.preventDefault();
          handleVolumeChange([Math.min(1, video.volume + 0.1)]);
          break;
        case "ArrowDown":
          if (isInteractiveTarget(target) || !playerIsActive()) return;
          e.preventDefault();
          handleVolumeChange([Math.max(0, video.volume - 0.1)]);
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isIframeEmbed, handleVolumeChange, toggleMute, toggleFullscreen]);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        pointerOverRef.current = true;
      }}
      onMouseLeave={() => {
        pointerOverRef.current = false;
        setShowControls(false);
      }}
      onTouchStart={handleMouseMove}
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
          onDoubleClick={toggleFullscreen}
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
          tabIndex={0}
          aria-label={animeTitle}
        />
      )}

      {/* FLOATING GLASS CONTROL BAR */}
      {!isIframeEmbed && (
        <div
          onMouseEnter={() => {
            overControlsRef.current = true;
            if (controlsTimeoutRef.current) {
              window.clearTimeout(controlsTimeoutRef.current);
              controlsTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            overControlsRef.current = false;
            if (isPlaying) {
              controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3000);
            }
          }}
          className={cn(
            "absolute bottom-0 left-0 right-0 mx-auto max-w-xl p-4 bg-[#11111198] backdrop-blur-md rounded-2xl transition-opacity duration-300 z-20",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Every source failed: say so instead of leaving a black box. */}
          {failoverExhausted && (
            <p className="mb-2 text-center text-xs font-semibold text-red-400">
              Every source for this link failed. The video could not be loaded.
            </p>
          )}

          {/* Row 1: time labels flanking thin seekbar */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white text-sm tabular-nums">{formatTime(currentTime)}</span>
            <div className="flex-1">
              <ThinBar
                value={duration ? (currentTime / duration) * 100 : 0}
                onChange={(pct) => {
                  const video = videoRef.current;
                  if (!video || !duration) return;
                  const newTime = (pct / 100) * duration;
                  video.currentTime = newTime;
                  setCurrentTime(newTime);
                }}
              />
            </div>
            <span className="text-white text-sm tabular-nums">{formatTime(duration)}</span>
          </div>

          {/* Row 2: play + volume left, speeds + fullscreen right */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div tabIndex={0}>
                <button
                  onClick={handlePlayPause}
                  className="inline-flex items-center justify-center rounded-md h-10 w-10 text-white hover:bg-[#111111d1] hover:text-white transition-colors"
                  title={isPlaying ? "Pause (space)" : "Play (space)"}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex items-center gap-x-1">
                <div tabIndex={0}>
                  <button
                    onClick={toggleMute}
                    className="inline-flex items-center justify-center rounded-md h-10 w-10 text-white hover:bg-[#111111d1] hover:text-white transition-colors"
                    title="Mute (m)"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
                <div className="w-24 max-sm:w-16">
                  <ThinBar
                    value={(isMuted ? 0 : volume) * 100}
                    onChange={(pct) => handleVolumeChange([pct / 100])}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <PlayerMenu
                items={SPEED_OPTIONS.map((s) => ({ value: String(s), label: `${s}x` }))}
                value={String(playbackSpeed)}
                onSelect={(v) => handleSpeedChange(parseFloat(v))}
                trigger={`${playbackSpeed}x`}
                title="Playback speed"
                isModified={playbackSpeed !== 1}
              />

              {distinctQualities.length > 1 && (
                <PlayerMenu
                  items={distinctQualities.map((q, i) => ({ value: String(i), label: q.label }))}
                  value={String(activeQualityIndex)}
                  onSelect={(v) => handleQualityChange(parseInt(v, 10))}
                  trigger={distinctQualities[activeQualityIndex]?.label ?? "Auto"}
                  title="Video quality"
                  isModified={activeQualityIndex !== 0}
                />
              )}

              <div tabIndex={0} className="hidden sm:block">
                <button
                  onClick={toggleFullscreen}
                  className="inline-flex items-center justify-center rounded-md h-10 w-10 text-white hover:bg-[#111111d1] hover:text-white transition-colors"
                  title="Fullscreen (f)"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

