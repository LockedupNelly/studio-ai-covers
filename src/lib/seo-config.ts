// Centralized SEO configurations for all pages

export const SITE_CONFIG = {
  name: "Cover Art Maker",
  url: "https://coverartmaker.com",
  description: "Create stunning AI-generated album cover art in seconds. Spotify-ready 3000x3000px resolution. 100% unique designs for music artists.",
  twitter: "@coverartmaker",
  locale: "en_US",
  ogImage: "https://coverartmaker.com/og-image.png",
};

export interface PageSEO {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  noIndex?: boolean;
}

export const PAGE_SEO: Record<string, PageSEO> = {
  home: {
    title: "Cover Art Maker | AI Album Cover Generator - Create Stunning Music Artwork",
    description: "Create stunning AI-generated album cover art in seconds. Spotify-ready 3000x3000px resolution. 50+ text styles, 30+ art styles. Start free today!",
    keywords: [
      "album cover art",
      "AI cover generator",
      "Spotify cover art",
      "music artwork maker",
      "album artwork creator",
      "cover art AI",
      "single cover art",
      "EP cover design",
      "music cover generator",
      "streaming cover art"
    ],
    canonical: "https://coverartmaker.com/",
    ogTitle: "Cover Art Maker | AI Album Cover Generator",
    ogDescription: "Create stunning AI-generated album cover art in seconds. Spotify-ready, high resolution designs for music artists."
  },
  designStudio: {
    title: "Design Studio - Create AI Cover Art | Cover Art Maker",
    description: "Design unique album covers with AI. Choose from 50+ text styles and 30+ art styles. Generate professional Spotify-ready cover art in seconds.",
    keywords: [
      "design album cover",
      "AI art generator",
      "music cover design",
      "create album artwork",
      "cover art studio"
    ],
    canonical: "https://coverartmaker.com/design-studio"
  },
  editStudio: {
    title: "Edit Studio - Refine Your Cover Art | Cover Art Maker",
    description: "Add textures, lighting effects, and parental advisory badges to your cover art. Fine-tune colors, add overlays, and perfect your album artwork.",
    keywords: [
      "edit album cover",
      "cover art editor",
      "add parental advisory",
      "album cover effects",
      "cover art textures"
    ],
    canonical: "https://coverartmaker.com/edit-studio"
  },
  faq: {
    title: "FAQ - Cover Art Maker Help Center | Common Questions Answered",
    description: "Find answers to common questions about AI cover art generation, pricing, licensing, delivery times, and commercial use rights.",
    keywords: [
      "cover art maker FAQ",
      "album cover questions",
      "AI art licensing",
      "music cover help"
    ],
    canonical: "https://coverartmaker.com/faq"
  },
  purchaseCredits: {
    title: "Pricing - Buy Credits for AI Cover Art | Cover Art Maker",
    description: "Purchase credits for AI cover art generation. Flexible pricing starting at $5 for 10 credits. Create unlimited unique album covers.",
    keywords: [
      "cover art pricing",
      "buy album cover credits",
      "AI art credits",
      "cover art cost"
    ],
    canonical: "https://coverartmaker.com/purchase-credits"
  },
  contact: {
    title: "Contact Us - Cover Art Maker Support",
    description: "Get help with your cover art or send us feedback. Our support team is ready to assist with any questions about Cover Art Maker.",
    keywords: [
      "cover art maker contact",
      "album cover support",
      "cover art help"
    ],
    canonical: "https://coverartmaker.com/contact"
  },
  auth: {
    title: "Sign In - Cover Art Maker",
    description: "Sign in or create an account to start generating AI album cover art. Get 3 free credits when you sign up.",
    keywords: [
      "cover art maker login",
      "sign up cover art"
    ],
    canonical: "https://coverartmaker.com/auth",
    noIndex: true
  },
  profile: {
    title: "Your Profile - Cover Art Maker",
    description: "Manage your Cover Art Maker account, view your credits, and access your generated covers.",
    keywords: [],
    canonical: "https://coverartmaker.com/profile",
    noIndex: true
  },
  terms: {
    title: "Terms of Service - Cover Art Maker",
    description: "Read the Terms of Service for Cover Art Maker. Understand your rights and responsibilities when using our AI cover art generator.",
    keywords: ["cover art terms of service"],
    canonical: "https://coverartmaker.com/terms"
  },
  privacy: {
    title: "Privacy Policy - Cover Art Maker",
    description: "Learn how Cover Art Maker protects your privacy and handles your data. Our commitment to data security and user privacy.",
    keywords: ["cover art privacy policy"],
    canonical: "https://coverartmaker.com/privacy"
  },
  refundPolicy: {
    title: "Refund Policy - Cover Art Maker",
    description: "Understand Cover Art Maker's refund policy for credit purchases and subscriptions.",
    keywords: ["cover art refund policy"],
    canonical: "https://coverartmaker.com/refund-policy"
  }
};

// FAQ data exported for structured data
export const FAQ_ITEMS = [
  {
    question: "What is Cover Art Maker?",
    answer: "Cover Art Maker is a platform that allows users to create custom cover art ready for music streaming using artificial generative intelligence (AGI) and our own software."
  },
  {
    question: "What format is the cover art delivered?",
    answer: "The cover art is downloadable in JPG non-watermarked file 3000 x 3000 px ready for streaming."
  },
  {
    question: "How are the images generated?",
    answer: "We partner with AGI provider(s) to help produce cover art, as well as our own software."
  },
  {
    question: "How much does it cost?",
    answer: "We offer flexible pricing: purchase credit packs starting at $5 for 10 credits (1 credit = 1 cover generation), or subscribe to a monthly plan for even better value. Check our pricing page for current packages and subscription tiers."
  },
  {
    question: "Can I use the artwork for other things other than album cover art?",
    answer: "Yes, the cover artwork you create and purchase can be used for anything including podcast covers, posters, merch, greeting cards, etc."
  },
  {
    question: "What is the delivery time for add-ons?",
    answer: "Add-ons such as Spotify Canvas, Motion Cover, and other motion upgrades are delivered via email in 2-5 days. Real Designer Edits are delivered within 24 hours via email."
  },
  {
    question: "Is it legal to use the cover art for music streaming and other commercial uses?",
    answer: "Yes, you are legally permitted to utilize the cover art for music streaming and other commercial uses. However, it is expressly prohibited to engage in the resale of the cover art. Alterations are allowed to the cover art."
  },
  {
    question: "Do I own the copyright to the cover art?",
    answer: "For the United States, at this time the US Copyright Office has taken the position that AI-generated art cannot receive copyright protection. So theoretically, anyone can find and use your cover art without legal consequences. Copyrights vary by country and is fluid so check with your country's copyright office."
  },
  {
    question: "How do I create album cover art with Cover Art Maker?",
    answer: "Simply sign up for a free account, go to the Design Studio, enter your song title and artist name, choose a genre, mood, and style, then click generate. Your AI cover art will be ready in seconds."
  },
  {
    question: "What are the Spotify cover art dimensions?",
    answer: "Spotify requires cover art to be 3000 x 3000 pixels in JPG or PNG format. All Cover Art Maker designs are automatically generated at this resolution."
  }
];

// Credit packages for Product schema
export const CREDIT_PACKAGES_SEO = [
  {
    name: "Starter Pack",
    credits: 10,
    price: 5,
    currency: "USD"
  },
  {
    name: "Creator Pack",
    credits: 25,
    price: 10,
    currency: "USD"
  },
  {
    name: "Pro Pack",
    credits: 60,
    price: 20,
    currency: "USD"
  }
];
