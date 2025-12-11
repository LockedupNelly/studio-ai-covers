import { Button } from "@/components/ui/button";
import { Disc3, Sparkles, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  user: { name: string; photo: string } | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Header = ({ user, onSignIn, onSignOut }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
              <Disc3 className="w-5 h-5 text-foreground" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl tracking-wide">
              COVER ART <span className="text-primary">MAKER</span>
            </span>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
              AI Studio
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            PREMADE
          </a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ADD-ONS
          </a>
          <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Sparkles className="w-3 h-3" />
            PRO ACCESS
          </Button>
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.photo} alt={user.name} />
                <AvatarFallback className="bg-secondary text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium">{user.name}</span>
              <Button variant="ghost" size="icon" onClick={onSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button variant="google" onClick={onSignIn}>
              Sign in with Google
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
