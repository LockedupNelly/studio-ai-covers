export const Footer = () => {
  return (
    <footer className="border-t border-border py-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-display text-lg tracking-wide">
              COVER ART <span className="text-primary">MAKER</span>
            </span>
            <p className="text-xs text-foreground/60 mt-1">DESIGN DIVISION</p>
          </div>
          <nav className="flex items-center gap-6 text-sm text-foreground/70">
            <a href="/terms" className="hover:text-primary transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Licensing</a>
          </nav>
        </div>
      </div>
    </footer>
  );
};
