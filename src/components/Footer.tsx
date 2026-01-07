import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t border-border py-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-display text-lg tracking-wide">
              COVER ART <span className="text-primary">MAKER</span>
            </span>
            <p className="text-xs text-foreground/60 mt-1">Toronto, Canada</p>
          </div>
          <nav className="flex items-center gap-6 text-sm text-foreground/70">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/refund-policy" className="hover:text-primary transition-colors">Refunds</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};
