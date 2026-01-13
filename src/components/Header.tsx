import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Coins, Menu, ChevronDown, LogOut, User, Wand2, Palette, Sparkles, LucideIcon } from "lucide-react";
import logoWhite from "@/assets/logo-white.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// NavLink component for active state styling - defined after all imports
const NavLink = ({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <button 
      onClick={() => navigate(to)}
      className={`transition-colors flex items-center gap-1.5 ${
        isActive 
          ? "text-white font-semibold text-sm" 
          : "text-foreground/60 hover:text-foreground text-sm"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};

export const Header = () => {
  const { user, signOut } = useAuth();
  const { credits, hasUnlimitedGenerations, subscriptionUsage, subscriptionLimit } = useCredits();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url || "";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img 
              src={logoWhite} 
              alt="Cover Art Maker" 
              className="h-8 md:h-10 w-auto"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <NavLink to="/" icon={Home} label="Home" />
            <NavLink to="/design-studio" icon={Wand2} label="Design Studio" />
            <NavLink to="/edit-studio" icon={Palette} label="Edit Studio" />
            <NavLink to="/purchase-credits" icon={Coins} label="Purchase Credits" />
          </nav>

          {/* Auth & Credits */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Credit Balance Badge */}
            {user && (
              <button
                onClick={() => navigate("/purchase-credits")}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                  hasUnlimitedGenerations 
                    ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20" 
                    : "bg-primary/10 border-primary/30 hover:bg-primary/20"
                }`}
              >
                {hasUnlimitedGenerations ? (
                  <>
                    <Sparkles className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">
                      {subscriptionUsage !== null && subscriptionLimit !== null 
                        ? `${subscriptionUsage}/${subscriptionLimit}` 
                        : "Pro"}
                    </span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">{credits ?? "—"}</span>
                  </>
                )}
              </button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-secondary text-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium text-foreground">{displayName}</span>
                    <ChevronDown className="w-4 h-4 text-foreground/60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <div className="px-2 py-1.5 text-xs text-foreground/60 flex items-center gap-2">
                    {hasUnlimitedGenerations ? (
                      <>
                        <Sparkles className="w-3 h-3 text-green-500" />
                        <span className="text-green-500 font-medium">
                          {subscriptionUsage ?? 0}/{subscriptionLimit ?? "∞"} this month
                        </span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-3 h-3" />
                        {credits ?? "—"} credits available
                      </>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    My Creations
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/purchase-credits")} className="cursor-pointer">
                    <Coins className="w-4 h-4 mr-2" />
                    Purchase Credits
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={() => navigate("/auth")} 
                className="hidden sm:flex bg-white text-zinc-900 hover:bg-white/90"
              >
                Sign in
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-foreground/70 hover:text-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="bg-card border-border w-72">
          <SheetHeader>
            <SheetTitle className="font-display text-lg flex items-center gap-2">
              <Menu className="w-5 h-5" />
              Menu
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-0 mt-6">
            <button 
              onClick={() => { navigate("/"); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors border-b border-border/50"
            >
              <Home className="w-5 h-5" />
              Home
            </button>
            <button 
              onClick={() => { navigate("/design-studio"); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors border-b border-border/50"
            >
              <Wand2 className="w-5 h-5" />
              Design Studio
            </button>
            <button 
              onClick={() => { navigate("/edit-studio"); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors border-b border-border/50"
            >
              <Palette className="w-5 h-5" />
              Edit Studio
            </button>
            {user && (
              <button 
                onClick={() => { navigate("/profile"); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 text-left text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors border-b border-border/50"
              >
                <User className="w-5 h-5" />
                My Creations
              </button>
            )}
            <button 
              onClick={() => { navigate("/purchase-credits"); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors border-b border-border/50"
            >
              <Coins className="w-5 h-5" />
              Purchase Credits
            </button>
            
            {!user && (
              <Button 
                variant="secondary" 
                className="mt-4 mx-4"
                onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
              >
                Sign in
              </Button>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
};
