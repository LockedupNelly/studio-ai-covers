import { toast } from "sonner";

/**
 * Check if the device is mobile (iOS or Android)
 */
export const isMobileDevice = (): boolean => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

/**
 * Check if Web Share API is available with file sharing support
 */
export const canShareFiles = (): boolean => {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
};

export interface OverlayConfig {
  imageUrl: string;
  blendMode?: string; // Will be converted to GlobalCompositeOperation internally
  opacity?: number;
  rotation?: number;
}

export interface ParentalAdvisoryConfig {
  imageUrl: string;
  position: "bottom-right" | "bottom-left" | "bottom-center";
  inverted?: boolean;
  /** Size as percentage of canvas width (default: 22) */
  sizePercent?: number;
}

export interface DownloadOptions {
  width?: number;
  height?: number;
  quality?: number;
  showMobileHint?: boolean;
  /** Texture/lighting overlays to composite */
  overlays?: OverlayConfig[];
  /** Parental advisory logo to add */
  parentalAdvisory?: ParentalAdvisoryConfig;
  /** Color overlay (main color) */
  colorOverlay?: { hex: string; opacity?: number };
  /** Accent color overlay */
  accentOverlay?: { hex: string; opacity?: number };
}

/**
 * Load an image from URL
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
 * Map CSS blend mode names to canvas GlobalCompositeOperation
 */
const getCssToCanvasBlendMode = (blendMode?: string): GlobalCompositeOperation => {
  const modeMap: Record<string, GlobalCompositeOperation> = {
    'overlay': 'overlay',
    'multiply': 'multiply',
    'screen': 'screen',
    'soft-light': 'soft-light',
    'hard-light': 'hard-light',
    'lighter': 'lighter',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'darken': 'darken',
    'lighten': 'lighten',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity',
  };
  return modeMap[blendMode || 'overlay'] || 'source-over';
};

/**
 * Download an image with mobile-optimized handling and overlay compositing
 * On mobile: Uses Web Share API to allow saving to Photos
 * On desktop: Uses traditional download
 */
export const downloadImage = async (
  imageUrl: string,
  filename: string = "cover-art",
  options: DownloadOptions = {}
): Promise<boolean> => {
  const { 
    width = 3000, 
    height = 3000, 
    quality = 0.95,
    showMobileHint = true,
    overlays = [],
    parentalAdvisory,
    colorOverlay,
    accentOverlay,
  } = options;

  try {
    // Load base image
    const img = await loadImage(imageUrl);

    // Create high-quality canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) throw new Error("Canvas context failed");
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    // Draw base image
    ctx.drawImage(img, 0, 0, width, height);

    // Apply overlays (textures, lightings)
    for (const overlay of overlays) {
      try {
        const overlayImg = await loadImage(overlay.imageUrl);
        
        ctx.save();
        ctx.globalCompositeOperation = getCssToCanvasBlendMode(overlay.blendMode as string);
        ctx.globalAlpha = overlay.opacity ?? 1;
        
        if (overlay.rotation && overlay.rotation !== 0) {
          ctx.translate(width / 2, height / 2);
          ctx.rotate((overlay.rotation * Math.PI) / 180);
          ctx.drawImage(overlayImg, -width / 2, -height / 2, width, height);
        } else {
          ctx.drawImage(overlayImg, 0, 0, width, height);
        }
        
        ctx.restore();
      } catch (e) {
        console.warn("Failed to apply overlay:", overlay.imageUrl, e);
      }
    }

    // Apply color overlay
    if (colorOverlay?.hex) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = colorOverlay.opacity ?? 0.45;
      ctx.fillStyle = colorOverlay.hex;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Apply accent overlay as radial gradients
    if (accentOverlay?.hex) {
      ctx.save();
      ctx.globalCompositeOperation = 'color-dodge';
      ctx.globalAlpha = accentOverlay.opacity ?? 0.35;
      
      // Bottom-left radial
      const grad1 = ctx.createRadialGradient(
        width * 0.15, height * 0.85, 0,
        width * 0.15, height * 0.85, width * 0.35
      );
      grad1.addColorStop(0, accentOverlay.hex);
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);
      
      // Top-right radial
      const grad2 = ctx.createRadialGradient(
        width * 0.85, height * 0.15, 0,
        width * 0.85, height * 0.15, width * 0.35
      );
      grad2.addColorStop(0, accentOverlay.hex);
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);
      
      ctx.restore();
    }

    // Apply parental advisory logo
    if (parentalAdvisory?.imageUrl) {
      try {
        const paImg = await loadImage(parentalAdvisory.imageUrl);
        const sizePercent = parentalAdvisory.sizePercent ?? 22;
        const paWidth = (width * sizePercent) / 100;
        const paHeight = (paImg.height / paImg.width) * paWidth;
        const margin = width * 0.02; // 2% margin
        
        let paX: number;
        let paY = height - paHeight - margin;
        
        switch (parentalAdvisory.position) {
          case "bottom-left":
            paX = margin;
            break;
          case "bottom-center":
            paX = (width - paWidth) / 2;
            break;
          case "bottom-right":
          default:
            paX = width - paWidth - margin;
            break;
        }

        ctx.save();
        
        // If inverted, we need to invert the image colors
        if (parentalAdvisory.inverted) {
          // Create a temporary canvas for the PA image
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = paImg.width;
          tempCanvas.height = paImg.height;
          const tempCtx = tempCanvas.getContext("2d");
          
          if (tempCtx) {
            tempCtx.drawImage(paImg, 0, 0);
            tempCtx.globalCompositeOperation = 'difference';
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, paImg.width, paImg.height);
            ctx.drawImage(tempCanvas, paX, paY, paWidth, paHeight);
          }
        } else {
          ctx.drawImage(paImg, paX, paY, paWidth, paHeight);
        }
        
        ctx.restore();
      } catch (e) {
        console.warn("Failed to apply parental advisory:", e);
      }
    }

    // Convert to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob) {
      throw new Error("Failed to create image blob");
    }

    const finalFilename = `${filename.replace(/\s+/g, "-")}-${width}x${height}.jpg`;
    const file = new File([blob], finalFilename, { type: "image/jpeg" });

    // Try Web Share API first on mobile (allows saving to Photos)
    if (isMobileDevice() && canShareFiles()) {
      try {
        // Check if we can share this specific file
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Cover Art",
          });
          toast.success("Shared!", { 
            description: "Choose 'Save Image' to add to Photos" 
          });
          return true;
        }
      } catch (shareError) {
        // User cancelled or share failed - fall through to download
        if ((shareError as Error).name === 'AbortError') {
          // User cancelled, don't show error
          return false;
        }
        console.log("Share failed, falling back to download:", shareError);
      }
    }

    // Fallback: Traditional download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    // Show mobile-specific hint
    if (isMobileDevice() && showMobileHint) {
      toast.success("Downloaded!", { 
        description: "Check your Downloads folder, then save to Photos" 
      });
    } else {
      toast.success("Downloaded!", { 
        description: `${width}x${height} JPEG saved` 
      });
    }

    return true;
  } catch (error) {
    console.error("Download error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Provide specific error feedback
    if (errorMessage.includes("crossOrigin") || errorMessage.includes("CORS")) {
      toast.error("Download failed", {
        description: "Image couldn't be loaded. Please try again.",
      });
    } else if (errorMessage.includes("Canvas") || errorMessage.includes("context")) {
      toast.error("Processing failed", {
        description: "Your browser couldn't process the image. Try a different browser.",
      });
    } else {
      // Final fallback: direct link open
      try {
        window.open(imageUrl, "_blank");
        toast.info("Image opened in new tab", { 
          description: isMobileDevice() 
            ? "Long-press the image to save to Photos" 
            : "Right-click to save the image",
        });
        return true;
      } catch {
        toast.error("Download failed", { 
          description: "Please check your internet connection and try again",
        });
        return false;
      }
    }
    
    return false;
  }
};
