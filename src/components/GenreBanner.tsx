import { ExternalLink } from "lucide-react";

interface GenreBannerProps {
  genre: string;
}

const genreLinks: Record<string, string> = {
  "Hip-Hop / Rap": "https://www.coverartmarket.com/cde/?filter%5Bgenre%5D%5B%5D=Hip-Hop+%2F+Rap",
  "Pop": "https://www.coverartmarket.com/cde/?filter%5Bgenre%5D%5B%5D=Pop",
  "EDM": "https://www.coverartmarket.com/cde/?filter%5Bgenre%5D%5B%5D=EDM",
  "R&B": "https://www.coverartmarket.com/cde/?filter%5Bgenre%5D%5B%5D=R%26B",
  "Rock": "https://www.coverartmarket.com/cde/?filter%5Bgenre%5D%5B%5D=Rock",
  "Alternative": "https://www.coverartmarket.com/cde/?filter%5Bgenre%5D%5B%5D=Alternative",
  "Indie": "https://www.coverartmarket.com/cde/?filter%5Bgenre%5D%5B%5D=Indie",
  "Metal": "https://www.coverartmarket.com/cde/?filter%5Bgenre%5D%5B%5D=Metal",
  "Country": "https://www.coverartmarket.com/cde/?filter%5BsortBy%5D=random&filter%5Bgenre%5D%5B%5D=Country",
  "Jazz": "https://www.coverartmarket.com/cde/?filter%5BsortBy%5D=random&filter%5Bgenre%5D%5B%5D=Jazz",
  "Classical": "https://www.coverartmarket.com/cde/?filter%5BsortBy%5D=random&filter%5Bgenre%5D%5B%5D=Classical",
};

export const GenreBanner = ({ genre }: GenreBannerProps) => {
  const link = genreLinks[genre] || genreLinks["Hip-Hop / Rap"];

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <div className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-xs text-foreground/60 uppercase tracking-widest mb-0.5">
              Trending in {genre}
            </p>
            <p className="text-sm text-foreground/80">
              View Pre-Made {genre} Covers
            </p>
          </div>
          <div className="flex items-center gap-2 text-primary text-sm font-semibold uppercase tracking-wider">
            View Covers
            <ExternalLink className="w-4 h-4" />
          </div>
        </div>

        {/* Placeholder Banner Area */}
        <div className="h-32 bg-gradient-to-r from-secondary via-secondary/80 to-secondary flex items-center justify-center">
          <div className="text-center">
            <p className="text-foreground/40 text-sm">
              Genre Banner Placeholder
            </p>
            <p className="text-foreground/30 text-xs mt-1">
              Upload {genre} banner image
            </p>
          </div>
        </div>
      </div>
    </a>
  );
};
