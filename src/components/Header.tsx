import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Disc3, Sparkles, ShoppingCart, Home, Coins, Menu, X, ChevronDown, LogOut, CreditCard, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useCredits } from "@/hooks/useCredits";
import { useNavigate } from "react-router-dom";
import { CartSheet } from "@/components/CartSheet";
import { Badge } from "@/components/ui/badge";
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

export const Header = () => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { items, setIsOpen } = useCart();
  const { credits } = useCredits();
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
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-foreground/30 flex items-center justify-center">
                <Disc3 className="w-5 h-5 text-foreground" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg md:text-xl tracking-wide">
                COVER ART <span className="text-primary">MAKER</span>
              </span>
              <span className="text-[10px] text-foreground/60 tracking-widest uppercase">
                AI Trained on Cover Art
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <button 
              onClick={() => navigate("/")}
              className="text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <a 
              href="https://coverartmarket.com/cde"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground/70 hover:text-foreground transition-colors"
            >
              Pre-Made Covers
            </a>
            <button 
              onClick={() => navigate("/addons")}
              className="text-sm text-foreground/70 hover:text-foreground transition-colors"
            >
              Add-Ons
            </button>
            <button 
              onClick={() => navigate("/purchase-credits")}
              className="text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Coins className="w-4 h-4" />
              Purchase Credits
            </button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate("/pro-access")}
            >
              <Sparkles className="w-3 h-3" />
              PRO ACCESS
            </Button>
          </nav>

          {/* Auth & Cart */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Credit Balance Badge */}
            {user && credits !== null && (
              <button
                onClick={() => navigate("/purchase-credits")}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors"
              >
                <Coins className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{credits}</span>
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
                    <Coins className="w-3 h-3" />
                    {credits ?? 0} credits available
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/pro-access")} className="cursor-pointer">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Subscription
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
              <Button variant="google" onClick={signInWithGoogle} className="hidden sm:flex">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in
              </Button>
            )}
            
            {/* Cart Icon */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative text-foreground/70 hover:text-foreground"
              onClick={() => setIsOpen(true)}
            >
              <ShoppingCart className="w-5 h-5" />
              {items.length > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                  {items.length}
                </Badge>
              )}
            </Button>

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
              <Disc3 className="w-5 h-5" />
              Menu
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-2 mt-6">
            <button 
              onClick={() => { navigate("/"); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
              Home
            </button>
            <a 
              href="https://coverartmarket.com/cde"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Sparkles className="w-5 h-5" />
              Pre-Made Covers
            </a>
            <button 
              onClick={() => { navigate("/addons"); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Add-Ons
            </button>
            <button 
              onClick={() => { navigate("/purchase-credits"); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Coins className="w-5 h-5" />
              Purchase Credits
            </button>
            <button 
              onClick={() => { navigate("/pro-access"); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-left bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              PRO ACCESS
            </button>
            
            {!user && (
              <Button 
                variant="google" 
                className="mt-4"
                onClick={() => { signInWithGoogle(); setMobileMenuOpen(false); }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </Button>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      <CartSheet />
    </>
  );
};