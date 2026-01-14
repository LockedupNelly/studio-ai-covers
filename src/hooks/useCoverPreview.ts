import { useState, useEffect, useRef, useCallback } from "react";
import {
  applyMainColorToImageData,
  applyAccentColorToImageData,
} from "@/lib/color-blend-math";

type BlendMode = "overlay" | "multiply" | "screen" | "soft-light" | "hard-light" | "lighter" | "color-dodge";

interface OverlayLayer {
  imageUrl: string;
  blendMode: BlendMode;
  opacity: number;
  rotation?: number;
}

interface PreviewConfig {
  lightings: OverlayLayer[];
  textures: OverlayLayer[];
  mainColor?: { hex: string; opacity: number };
  accentColor?: { hex: string; opacity: number };
  parentalAdvisory?: {
    imageUrl: string;
    position: "bottom-right" | "bottom-left" | "bottom-center";
    inverted: boolean;
  };
}

// Image cache to avoid re-loading the same images
const imageCache = new Map<string, HTMLImageElement>();

const loadImage = (src: string): Promise<HTMLImageElement> => {
  // Check cache first
  const cached = imageCache.get(src);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

const getCanvasBlendMode = (blendMode: BlendMode): GlobalCompositeOperation => {
  if (blendMode === "lighter") return "screen";
  return blendMode as GlobalCompositeOperation;
};

/**
 * Renders a preview image using the SAME canvas pipeline as Apply/Download.
 * This guarantees WYSIWYG - what you see is exactly what you get.
 */
const renderPreview = async (
  baseImageUrl: string,
  config: PreviewConfig,
  // Render at full export resolution so preview == Apply/Download pixel-for-pixel
  size: number = 3000
): Promise<string> => {
  // Collect all image URLs to load in parallel
  const imagesToLoad: string[] = [baseImageUrl];
  
  config.lightings.forEach(l => imagesToLoad.push(l.imageUrl));
  config.textures.forEach(t => imagesToLoad.push(t.imageUrl));
  if (config.parentalAdvisory?.imageUrl) {
    imagesToLoad.push(config.parentalAdvisory.imageUrl);
  }

  // Load ALL images in parallel
  const loadedImages = await Promise.all(imagesToLoad.map(loadImage));
  
  const baseImg = loadedImages[0];
  let imgIndex = 1;
  
  const lightingImages = config.lightings.map(() => loadedImages[imgIndex++]);
  const textureImages = config.textures.map(() => loadedImages[imgIndex++]);
  const paImg = config.parentalAdvisory?.imageUrl ? loadedImages[imgIndex] : null;

  // Create canvas at preview size
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");

  canvas.width = size;
  canvas.height = size;
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw base image
  ctx.drawImage(baseImg, 0, 0, size, size);

  // Helper to draw overlay with rotation
  const drawOverlay = (
    img: HTMLImageElement,
    blendMode: BlendMode,
    opacity: number,
    rotation?: number
  ) => {
    ctx.save();
    ctx.globalCompositeOperation = getCanvasBlendMode(blendMode);
    ctx.globalAlpha = opacity;

    if (rotation && rotation !== 0) {
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      ctx.drawImage(img, 0, 0, size, size);
    }

    ctx.restore();
  };

  // Apply lighting overlays (same order as final output)
  config.lightings.forEach((lighting, i) => {
    drawOverlay(lightingImages[i], lighting.blendMode, lighting.opacity, lighting.rotation);
  });

  // Apply texture overlays
  config.textures.forEach((texture, i) => {
    drawOverlay(textureImages[i], texture.blendMode, texture.opacity, texture.rotation);
  });

  // Apply main color using PIXEL-ACCURATE blend math
  if (config.mainColor?.hex) {
    const imageData = ctx.getImageData(0, 0, size, size);
    applyMainColorToImageData(imageData, {
      hex: config.mainColor.hex,
      opacity: config.mainColor.opacity,
    });
    ctx.putImageData(imageData, 0, 0);
  }

  // Apply accent color using PIXEL-ACCURATE blend math with gradients
  if (config.accentColor?.hex) {
    const imageData = ctx.getImageData(0, 0, size, size);
    applyAccentColorToImageData(imageData, {
      hex: config.accentColor.hex,
      opacity: config.accentColor.opacity,
    });
    ctx.putImageData(imageData, 0, 0);
  }

  // Apply parental advisory (always on top, normal blend mode)
  if (paImg && config.parentalAdvisory) {
    const paWidth = size * 0.22;
    const paHeight = (paImg.height / paImg.width) * paWidth;
    const padding = size * 0.03;

    let x: number;
    const y = size - paHeight - padding;

    switch (config.parentalAdvisory.position) {
      case "bottom-left":
        x = padding;
        break;
      case "bottom-center":
        x = (size - paWidth) / 2;
        break;
      case "bottom-right":
      default:
        x = size - paWidth - padding;
        break;
    }

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    if (config.parentalAdvisory.inverted) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = paImg.width;
      tempCanvas.height = paImg.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.filter = "invert(1)";
        tempCtx.drawImage(paImg, 0, 0);
        ctx.drawImage(tempCanvas, x, y, paWidth, paHeight);
      }
    } else {
      ctx.drawImage(paImg, x, y, paWidth, paHeight);
    }

    ctx.restore();
  }

  // Return as JPEG (match export quality)
  return canvas.toDataURL("image/jpeg", 0.95);
};

export interface UseCoverPreviewProps {
  baseImageUrl: string;
  config: PreviewConfig;
  enabled?: boolean;
  debounceMs?: number;
}

export const useCoverPreview = ({
  baseImageUrl,
  config,
  enabled = true,
  debounceMs = 150,
}: UseCoverPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const renderIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if we need to render (have any overlays)
  const hasOverlays = 
    config.lightings.length > 0 ||
    config.textures.length > 0 ||
    !!config.mainColor?.hex ||
    !!config.accentColor?.hex ||
    !!config.parentalAdvisory?.imageUrl;

  const doRender = useCallback(async () => {
    if (!baseImageUrl || !enabled || !hasOverlays) {
      setPreviewUrl(null);
      return;
    }

    const currentRenderId = ++renderIdRef.current;
    setIsRendering(true);

    try {
      const result = await renderPreview(baseImageUrl, config, 3000);
      
      // Only update if this is still the latest render
      if (currentRenderId === renderIdRef.current) {
        setPreviewUrl(result);
      }
    } catch (error) {
      console.error("Preview render failed:", error);
      // On error, fall back to no preview (will show CSS overlays)
      if (currentRenderId === renderIdRef.current) {
        setPreviewUrl(null);
      }
    } finally {
      if (currentRenderId === renderIdRef.current) {
        setIsRendering(false);
      }
    }
  }, [baseImageUrl, config, enabled, hasOverlays]);

  // Debounced render effect
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!hasOverlays) {
      setPreviewUrl(null);
      return;
    }

    timeoutRef.current = setTimeout(doRender, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [doRender, debounceMs, hasOverlays]);

  return {
    previewUrl,
    isRendering,
    hasOverlays,
  };
};
