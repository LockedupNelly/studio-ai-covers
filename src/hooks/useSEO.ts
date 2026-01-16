import { useEffect } from "react";
import { PAGE_SEO, SITE_CONFIG, type PageSEO } from "@/lib/seo-config";

interface UseSEOOptions {
  pageKey?: keyof typeof PAGE_SEO;
  customSEO?: Partial<PageSEO>;
}

export const useSEO = ({ pageKey, customSEO }: UseSEOOptions = {}) => {
  useEffect(() => {
    const seo = pageKey ? PAGE_SEO[pageKey] : null;
    const finalSEO = { ...seo, ...customSEO };

    // Update document title
    if (finalSEO.title) {
      document.title = finalSEO.title;
    }

    // Update or create meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute("content", content);
    };

    // Update description
    if (finalSEO.description) {
      updateMeta("description", finalSEO.description);
      updateMeta("og:description", finalSEO.ogDescription || finalSEO.description, true);
      updateMeta("twitter:description", finalSEO.ogDescription || finalSEO.description);
    }

    // Update title in OG
    if (finalSEO.title) {
      updateMeta("og:title", finalSEO.ogTitle || finalSEO.title, true);
      updateMeta("twitter:title", finalSEO.ogTitle || finalSEO.title);
    }

    // Update keywords
    if (finalSEO.keywords && finalSEO.keywords.length > 0) {
      updateMeta("keywords", finalSEO.keywords.join(", "));
    }

    // Update canonical link
    if (finalSEO.canonical) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      
      canonical.setAttribute("href", finalSEO.canonical);
      updateMeta("og:url", finalSEO.canonical, true);
    }

    // Update robots meta
    if (finalSEO.noIndex) {
      updateMeta("robots", "noindex, nofollow");
    } else {
      updateMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1");
    }

    // Cleanup function to reset to defaults if needed
    return () => {
      // Optional: Reset to default on unmount if needed
    };
  }, [pageKey, customSEO]);
};

// Helper hook for dynamic page titles
export const usePageTitle = (title: string) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
};
