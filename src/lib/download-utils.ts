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

/**
 * Download an image with mobile-optimized handling
 * On mobile: Uses Web Share API to allow saving to Photos
 * On desktop: Uses traditional download
 */
export const downloadImage = async (
  imageUrl: string,
  filename: string = "cover-art",
  options: {
    width?: number;
    height?: number;
    quality?: number;
    showMobileHint?: boolean;
  } = {}
): Promise<boolean> => {
  const { 
    width = 3000, 
    height = 3000, 
    quality = 0.95,
    showMobileHint = true 
  } = options;

  try {
    // Load and process image
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    // Create high-quality canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) throw new Error("Canvas context failed");
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

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
    
    // Final fallback: direct link open
    try {
      window.open(imageUrl, "_blank");
      toast.info("Image opened", { 
        description: "Long-press the image to save to Photos" 
      });
      return true;
    } catch {
      toast.error("Download failed", { 
        description: "Please try again" 
      });
      return false;
    }
  }
};
