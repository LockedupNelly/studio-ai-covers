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
}

const row1: AddOn[] = [
  {
    id: "motion-upgrade",
    title: "Motion Upgrade",
    price: 45.00,
    description: "Animated version of your cover art for social media.",
    image: "/addons/motion-cover.gif",
  },
  {
    id: "spotify-canvas",
    title: "Spotify Canvas",
    price: 25.00,
    description: "8-second loop video for Spotify backgrounds.",
    image: "/addons/song-promo-video.gif",
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
];

const row2: AddOn[] = [
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
    id: "promo-ads-texture",
    title: "Promo Ads Texture",
    price: 10.99,
    description: "Textured promotional graphic assets.",
    image: "/addons/promo-ads-texture.jpg",
  },
  {
    id: "promo-ads-phone",
    title: "Promo Ads Phone",
    price: 10.99,
    description: "Social media phone mockup promotion.",
    image: "/addons/promo-ads-phone.jpg",
  },
];

const row3: AddOn[] = [
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

const AddOnCard = ({ addOn, onAddToCart }: { addOn: AddOn; onAddToCart: (addOn: AddOn) => void }) => (
  <div
    className="bg-card rounded-xl border border-border overflow-hidden group hover:border-primary transition-colors"
  >
    {/* Square Image Container */}
    <div className="relative aspect-square bg-secondary overflow-hidden">
      <img
        src={addOn.image}
        alt={addOn.title}
        className="w-full h-full object-cover"
      />
      <Badge 
        variant="secondary" 
        className="absolute top-2 right-2 bg-background/90 text-foreground text-[10px] font-semibold"
      >
        PREVIEW
      </Badge>
    </div>

    {/* Content */}
    <div className="p-3">
      <h3 className="font-semibold text-sm mb-0.5">{addOn.title}</h3>
      <p className="text-primary font-bold text-sm mb-2">
        ${addOn.price.toFixed(2)}
      </p>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {addOn.description}
      </p>
      <Button
        variant="outline"
        className="w-full uppercase text-[10px] tracking-wider font-semibold h-8"
        onClick={() => onAddToCart(addOn)}
      >
        Add to Cart
      </Button>
    </div>
  </div>
);

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
        <div className="container mx-auto px-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
              PREMIUM <span className="text-primary">ADD-ONS</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Elevate your release with professional branding assets.
            </p>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {row1.map((addOn) => (
              <AddOnCard key={addOn.id} addOn={addOn} onAddToCart={handleAddToCart} />
            ))}
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {row2.map((addOn) => (
              <AddOnCard key={addOn.id} addOn={addOn} onAddToCart={handleAddToCart} />
            ))}
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {row3.map((addOn) => (
              <AddOnCard key={addOn.id} addOn={addOn} onAddToCart={handleAddToCart} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddOns;
