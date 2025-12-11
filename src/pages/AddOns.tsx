import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AddOn {
  id: string;
  title: string;
  price: number;
  description: string;
  image: string;
  isSelected?: boolean;
}

const addOns: AddOn[] = [
  {
    id: "motion-upgrade",
    title: "Motion Upgrade",
    price: 45.00,
    description: "Animated version of your cover art for social media.",
    image: "/addons/motion-cover.gif",
  },
  {
    id: "apple-music-motion",
    title: "Apple Music Motion Cover",
    price: 40.00,
    description: "Animated artwork for Apple Music.",
    image: "/addons/apple-music-motion.gif",
  },
  {
    id: "song-promo-video",
    title: "Song Promo Video",
    price: 29.99,
    description: "15-second teaser video with audio visualizer.",
    image: "/addons/song-promo-video.gif",
  },
  {
    id: "motion-promo-ad",
    title: "Motion Promo Ad",
    price: 14.99,
    description: "High-energy promotional motion ad.",
    image: "/addons/motion-promo-ad.gif",
  },
  {
    id: "motion-promo-billboard",
    title: "Motion Promo Billboard",
    price: 14.99,
    description: "Digital billboard style animation.",
    image: "/addons/motion-promo-billboard.gif",
  },
  {
    id: "promo-ads-phone",
    title: "Promo Ads Phone",
    price: 10.99,
    description: "Social media phone mockup promotion.",
    image: "/addons/promo-ads-phone.jpg",
  },
  {
    id: "spotify-banner",
    title: "Spotify Banner",
    price: 12.99,
    description: "Professional header for your Spotify profile.",
    image: "/addons/spotify-banner.jpg",
  },
  {
    id: "youtube-screen",
    title: "YouTube Screen",
    price: 12.99,
    description: "Branded screen overlay for YouTube videos.",
    image: "/addons/youtube-screen.jpg",
  },
  {
    id: "tracklist-design",
    title: "Tracklist Design",
    price: 19.99,
    description: "Matching back cover with your song list.",
    image: "/addons/tracklist-design.jpg",
  },
  {
    id: "lyric-video",
    title: "Lyric Video",
    price: 45.00,
    description: "Full animated lyric video for your track.",
    image: "/addons/lyric-video.jpg",
  },
];

const AddOns = () => {
  const { toast } = useToast();

  const handleAddToCart = (addOn: AddOn) => {
    toast({
      title: "Added to cart",
      description: `${addOn.title} - $${addOn.price.toFixed(2)}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
              PREMIUM <span className="text-primary">ADD-ONS</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Elevate your release with professional branding assets.
            </p>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {addOns.map((addOn) => (
              <div
                key={addOn.id}
                className="bg-card rounded-xl border border-border overflow-hidden group hover:border-primary/50 transition-colors"
              >
                {/* Image Container */}
                <div className="relative aspect-[4/3] bg-secondary">
                  <img
                    src={addOn.image}
                    alt={addOn.title}
                    className="w-full h-full object-cover"
                  />
                  <Badge 
                    variant="secondary" 
                    className="absolute top-3 right-3 bg-background/90 text-foreground text-xs font-semibold"
                  >
                    PREVIEW
                  </Badge>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{addOn.title}</h3>
                  <p className="text-primary font-bold mb-3">
                    ${addOn.price.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {addOn.description}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full uppercase text-xs tracking-wider font-semibold"
                    onClick={() => handleAddToCart(addOn)}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddOns;
