import { Button } from "@/components/ui/button";
import { Disc3, Sparkles, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url || "";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/")}
        >
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
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-secondary text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium">{displayName}</span>
              </button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button variant="google" onClick={signInWithGoogle}>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
