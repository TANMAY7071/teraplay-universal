import { useEffect, useState } from "react";

/**
 * Measures the visible (non-transparent) pixel bounding box of an image
 * using an offscreen canvas. Returns a CSS transform scale factor so that
 * the visible artwork fills approximately `targetFill` fraction of the
 * container height, regardless of how much transparent padding surrounds it.
 *
 * Falls back to 1.0 if the image cannot be analysed (CORS, decode error, etc.)
 */
export function useLogoScale(
  src: string | null,
  containerHeight: number,    // px — the rendered logo container height
  targetFill = 0.9            // 0–1 — how much of the container the visible art should occupy
): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!src || containerHeight <= 0) {
      setScale(1);
      return;
    }

    let cancelled = false;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) { setScale(1); return; }

        ctx.drawImage(img, 0, 0);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let minY = canvas.height;
        let maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > 10) {           // ignore near-transparent pixels
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        const visibleHeightPx = maxY - minY + 1;
        if (visibleHeightPx <= 0) { setScale(1); return; }

        // What fraction of the full canvas height is actually visible?
        const visibleFraction = visibleHeightPx / canvas.height;

        // The image is rendered at max-height: 100% of the container,
        // so its rendered height ≈ containerHeight.
        // The visible art occupies `visibleFraction` of that.
        // We want the visible art to occupy `targetFill` of the container.
        const needed = targetFill / visibleFraction;

        // Cap so the logo never overflows the container
        const clampedScale = Math.min(needed, 1 / visibleFraction);
        setScale(clampedScale);
      } catch {
        setScale(1); // CORS or tainted canvas — just show normally
      }
    };

    img.onerror = () => { if (!cancelled) setScale(1); };

    img.src = src;

    return () => { cancelled = true; };
  }, [src, containerHeight, targetFill]);

  return scale;
}
