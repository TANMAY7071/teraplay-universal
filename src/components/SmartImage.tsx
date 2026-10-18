import React, { useState, useEffect } from "react";
import { getSmartCropStyles } from "@/lib/smartCropHelper";

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  targetWidth?: number;
  targetHeight?: number;
  fallbackClass?: string;
}

/**
 * SmartImage component wraps the HTML Image element.
 * Loads, calculates best content focus frame utilizing smartcrop.js,
 * caches calculations locally, and falls back cleanly on CORS or loading failures.
 */
export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  targetWidth = 300,
  targetHeight = 400,
  className,
  fallbackClass = "object-cover",
  ...props
}) => {
  const [cropStyle, setCropStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    let active = true;

    async function applyCrop() {
      // Calculate crop frame dynamically
      const style = await getSmartCropStyles(src, targetWidth, targetHeight);
      if (active && style) {
        setCropStyle(style);
      }
    }

    applyCrop();

    return () => {
      active = false;
    };
  }, [src, targetWidth, targetHeight]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={cropStyle || undefined}
      {...props}
    />
  );
};
