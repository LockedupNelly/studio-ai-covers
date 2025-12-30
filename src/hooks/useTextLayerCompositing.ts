import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompositeResult {
  imageUrl: string;
  success: boolean;
}

export const useTextLayerCompositing = () => {
  const [isCompositing, setIsCompositing] = useState(false);

  /**
   * Composite a transparent text layer over a base artwork image
   * using HTML5 Canvas, then upload the result to Supabase storage
   */
  const compositeAndUpload = async (
    baseArtworkUrl: string,
    textLayerUrl: string,
    userId: string
  ): Promise<CompositeResult> => {
    setIsCompositing(true);
    
    try {
      // Create an offscreen canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Could not create canvas context");
      }

      // Load both images
      const [baseImg, textImg] = await Promise.all([
        loadImage(baseArtworkUrl),
        loadImage(textLayerUrl),
      ]);

      // Set canvas size to match the base artwork (or 1024x1024 standard)
      const size = 1024;
      canvas.width = size;
      canvas.height = size;

      // Draw base artwork first
      ctx.drawImage(baseImg, 0, 0, size, size);

      // Draw transparent text layer on top
      ctx.drawImage(textImg, 0, 0, size, size);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob from canvas"));
        }, "image/png", 1.0);
      });

      // Generate unique filename
      const filename = `${userId}/${Date.now()}-composited.png`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("covers")
        .upload(filename, blob, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("covers")
        .getPublicUrl(filename);

      return {
        imageUrl: urlData.publicUrl,
        success: true,
      };
    } catch (error) {
      console.error("Compositing error:", error);
      throw error;
    } finally {
      setIsCompositing(false);
    }
  };

  return {
    compositeAndUpload,
    isCompositing,
  };
};

/**
 * Load an image from URL and return a promise that resolves when loaded
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Enable CORS for cross-origin images
    
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src}`));
    
    img.src = src;
  });
};
