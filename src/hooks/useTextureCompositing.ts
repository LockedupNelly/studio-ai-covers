import { useState } from "react";

type BlendMode = "overlay" | "multiply" | "screen" | "soft-light" | "hard-light" | "lighter" | "color-dodge";

interface CompositeOptions {
  blendMode: BlendMode;
  opacity: number;
  rotation?: number; // Rotation in degrees (0, 90, 180, 270)
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
    applyTextureOverlay,
    applyMultipleOverlays,
    applyColorOverlay,
    applyParentalAdvisory,
    isCompositing,
  };
};
