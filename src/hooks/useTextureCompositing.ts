import { useState } from "react";

type BlendMode = "overlay" | "multiply" | "screen" | "soft-light" | "hard-light" | "lighter";

interface CompositeOptions {
  blendMode: BlendMode;
  opacity: number;
}

export const useTextureCompositing = () => {
  const [isCompositing, setIsCompositing] = useState(false);

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

      // Draw texture overlay
      ctx.drawImage(textureImg, 0, 0, size, size);

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

  return {
    applyTextureOverlay,
    applyMultipleOverlays,
    isCompositing,
  };
};
