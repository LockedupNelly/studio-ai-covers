import { SITE_CONFIG, FAQ_ITEMS, CREDIT_PACKAGES_SEO } from "@/lib/seo-config";

// Organization schema for brand recognition
export const OrganizationSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/favicon.png`,
    sameAs: [
      "https://twitter.com/coverartmaker"
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: `${SITE_CONFIG.url}/contact`
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

// WebApplication schema for software apps
export const WebApplicationSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description: SITE_CONFIG.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free credits to start"
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "2847",
      bestRating: "5",
      worstRating: "1"
    },
    featureList: [
      "AI-powered album cover generation",
      "3000x3000px Spotify-ready resolution",
      "50+ text styles",
      "30+ art styles",
      "Texture and lighting effects",
      "Parental advisory badges"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

// FAQPage schema for FAQ rich results
export const FAQPageSchema = ({ items = FAQ_ITEMS }: { items?: typeof FAQ_ITEMS }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

// HowTo schema for step-by-step instructions
export const HowToSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Create Album Cover Art with AI",
    description: "Create professional album cover art in 3 simple steps using Cover Art Maker's AI-powered design studio.",
    totalTime: "PT2M",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: "0"
    },
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Enter Your Details",
        text: "Enter your song title, artist name, and choose a genre and mood that matches your music.",
        url: `${SITE_CONFIG.url}/design-studio`
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Choose Your Style",
        text: "Select from 50+ text styles and 30+ art styles to create the perfect aesthetic for your cover.",
        url: `${SITE_CONFIG.url}/design-studio`
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Generate and Download",
        text: "Click generate to create your AI cover art, then download the Spotify-ready 3000x3000px file.",
        url: `${SITE_CONFIG.url}/design-studio`
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

// BreadcrumbList schema for navigation
interface BreadcrumbItem {
  name: string;
  url: string;
}

export const BreadcrumbSchema = ({ items }: { items: BreadcrumbItem[] }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

// Product schema for pricing pages
export const ProductSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Cover Art Maker Credits",
    description: "Credits for AI-powered album cover art generation. Each credit generates one unique cover.",
    brand: {
      "@type": "Brand",
      name: SITE_CONFIG.name
    },
    offers: CREDIT_PACKAGES_SEO.map(pkg => ({
      "@type": "Offer",
      name: pkg.name,
      price: pkg.price,
      priceCurrency: pkg.currency,
      description: `${pkg.credits} credits for AI cover art generation`,
      availability: "https://schema.org/InStock"
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

// Review schema for testimonials
interface Review {
  author: string;
  reviewBody: string;
  ratingValue: number;
}

export const ReviewSchema = ({ reviews }: { reviews: Review[] }) => {
  const schema = reviews.map(review => ({
    "@context": "https://schema.org",
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.author
    },
    reviewBody: review.reviewBody,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.ratingValue,
      bestRating: 5,
      worstRating: 1
    },
    itemReviewed: {
      "@type": "WebApplication",
      name: SITE_CONFIG.name
    }
  }));

  return (
    <>
      {schema.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </>
  );
};

// Speakable schema for voice search
export const SpeakableSchema = ({ selectors }: { selectors: string[] }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: selectors
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

// Combined homepage structured data
export const HomepageStructuredData = () => {
  return (
    <>
      <OrganizationSchema />
      <WebApplicationSchema />
      <HowToSchema />
      <FAQPageSchema items={FAQ_ITEMS.slice(0, 5)} />
    </>
  );
};
