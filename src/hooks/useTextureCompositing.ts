import { useState } from "react";
import {
  applyMainColorToImageData,
  applyAccentColorToImageData,
} from "@/lib/color-blend-math";

type BlendMode = "overlay" | "multiply" | "screen" | "soft-light" | "hard-light" | "lighter" | "color-dodge";

interface CompositeOptions {
  blendMode: BlendMode;
  opacity: number;
  rotation?: number;
}

interface OverlayLayer {
  imageUrl: string;
  blendMode: BlendMode;
  opacity: number;
  rotation?: number;
}

interface CompositeAllLayersConfig {
  lightings: OverlayLayer[];
  textures: OverlayLayer[];
  mainColor?: { hex: string; opacity: number; blendMode?: BlendMode };
  accentColor?: { hex: string; opacity: number; blendMode?: BlendMode };
  parentalAdvisory?: {
    imageUrl: string;
    position: "bottom-right" | "bottom-left" | "bottom-center" | "top-right" | "top-left" | "top-center";
    size: "small" | "medium" | "large";
    inverted: boolean;
  };
}

export const useTextureCompositing = () => {
  const [isCompositing, setIsCompositing] = useState(false);

  /**
   * Map blend modes to canvas-compatible values that match CSS preview behavior
   */
  const getCanvasBlendMode = (blendMode: BlendMode): GlobalCompositeOperation => {
    if (blendMode === "lighter") return "screen";
    return blendMode as GlobalCompositeOperation;
  };

  /**
   * Load an image from URL and return a promise that resolves when loaded
   */
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  };

  /**
   * SINGLE-PASS compositing: Apply ALL overlays in one canvas render
   * Uses pixel-accurate blend math for colors to match CSS preview exactly
   */
  const compositeAllLayers = async (
    baseImageUrl: string,
    config: CompositeAllLayersConfig
  ): Promise<string> => {
    setIsCompositing(true);

    try {
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

      // Create canvas at high resolution for quality output
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");

      const size = 3000; // High quality 3000x3000 output
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

      // Apply lighting overlays (same order as preview)
      config.lightings.forEach((lighting, i) => {
        drawOverlay(lightingImages[i], lighting.blendMode, lighting.opacity, lighting.rotation);
      });

      // Apply texture overlays
      config.textures.forEach((texture, i) => {
        drawOverlay(textureImages[i], texture.blendMode, texture.opacity, texture.rotation);
      });

      // Apply main color using PIXEL-ACCURATE blend math (matches CSS exactly)
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
        // Size multiplier based on size setting
        const sizeMultiplier = config.parentalAdvisory.size === "small" ? 0.15 : 
                               config.parentalAdvisory.size === "large" ? 0.28 : 0.22;
        const paWidth = size * sizeMultiplier;
        const paHeight = (paImg.height / paImg.width) * paWidth;
        const padding = size * 0.03;

        // Horizontal position
        let x: number;
        const position = config.parentalAdvisory.position;
        if (position.includes("left")) {
          x = padding;
        } else if (position.includes("center")) {
          x = (size - paWidth) / 2;
        } else {
          x = size - paWidth - padding;
        }

        // Vertical position
        let y: number;
        if (position.startsWith("top")) {
          y = padding;
        } else {
          y = size - paHeight - padding;
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

      // Return as JPEG for smaller file size and wider compatibility
      return canvas.toDataURL("image/jpeg", 0.95);
    } finally {
      setIsCompositing(false);
    }
  };

  /**
   * Apply a texture overlay to a base image using canvas compositing
   */
  const applyTextureOverlay = async (
    baseImageUrl: string,
    textureImageUrl: string,
    options: CompositeOptions
  ): Promise<string> => {
    setIsCompositing(true);

    try {
      const [baseImg, textureImg] = await Promise.all([
        loadImage(baseImageUrl),
        loadImage(textureImageUrl),
      ]);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not create canvas context");
      }

      // Use base image dimensions or standard 1024x1024
      const size = 1024;
      canvas.width = size;
      canvas.height = size;

      // Draw base image
      ctx.drawImage(baseImg, 0, 0, size, size);

      // Set blend mode (canvas uses different naming)
      const canvasBlendMode = options.blendMode === "soft-light" 
        ? "soft-light" 
        : options.blendMode === "hard-light"
        ? "hard-light"
        : options.blendMode;
      
      ctx.globalCompositeOperation = canvasBlendMode as GlobalCompositeOperation;
      ctx.globalAlpha = options.opacity;

      // Draw texture overlay with rotation if specified
      if (options.rotation && options.rotation !== 0) {
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate((options.rotation * Math.PI) / 180);
        ctx.drawImage(textureImg, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.drawImage(textureImg, 0, 0, size, size);
      }

      // Reset composite operation
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      return canvas.toDataURL("image/png", 1.0);
    } finally {
      setIsCompositing(false);
    }
  };

  /**
   * Apply multiple overlays (texture + lighting) in sequence
   */
  const applyMultipleOverlays = async (
    baseImageUrl: string,
    overlays: Array<{ imageUrl: string; options: CompositeOptions }>
  ): Promise<string> => {
    setIsCompositing(true);

    try {
      let currentImageUrl = baseImageUrl;

      for (const overlay of overlays) {
        currentImageUrl = await applyTextureOverlay(
          currentImageUrl,
          overlay.imageUrl,
          overlay.options
        );
      }

      return currentImageUrl;
    } finally {
      setIsCompositing(false);
    }
  };

  /**
   * Apply a solid color overlay with specified blend mode
   */
  const applyColorOverlay = async (
    baseImageUrl: string,
    hexColor: string,
    opacity: number,
    blendMode: BlendMode = 'overlay'
  ): Promise<string> => {
    setIsCompositing(true);

    try {
      const baseImg = await loadImage(baseImageUrl);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not create canvas context");
      }

      const size = 1024;
      canvas.width = size;
      canvas.height = size;

      // Draw base image
      ctx.drawImage(baseImg, 0, 0, size, size);

      // Apply color overlay
      ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = hexColor;
      ctx.fillRect(0, 0, size, size);

      // Reset
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      return canvas.toDataURL("image/png", 1.0);
    } finally {
      setIsCompositing(false);
    }
  };

  /**
   * Apply parental advisory sticker to the image
   */
  const applyParentalAdvisory = async (
    baseImageUrl: string,
    paImageUrl: string,
    position: "bottom-right" | "bottom-left" | "bottom-center",
    inverted: boolean = false
  ): Promise<string> => {
    setIsCompositing(true);

    try {
      const [baseImg, paImg] = await Promise.all([
        loadImage(baseImageUrl),
        loadImage(paImageUrl),
      ]);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not create canvas context");
      }

      const size = 1024;
      canvas.width = size;
      canvas.height = size;

      // Draw base image
      ctx.drawImage(baseImg, 0, 0, size, size);

      // Calculate PA size and position (22% of canvas width)
      const paWidth = size * 0.22;
      const paHeight = (paImg.height / paImg.width) * paWidth;
      const padding = size * 0.03; // 3% padding from edge

      let x: number;
      const y = size - paHeight - padding;

      switch (position) {
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

      // If inverted, we need to draw on a temp canvas first
      if (inverted) {
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

      return canvas.toDataURL("image/png", 1.0);
    } finally {
      setIsCompositing(false);
    }
  };

  return {
    compositeAllLayers,
    applyTextureOverlay,
    applyMultipleOverlays,
    applyColorOverlay,
    applyParentalAdvisory,
    isCompositing,
  };
};
