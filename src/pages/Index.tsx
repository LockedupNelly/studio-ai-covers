import { useState } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { GeneratorStudio } from "@/components/GeneratorStudio";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

// Mock user for demo - will be replaced with real auth
type User = { name: string; photo: string } | null;

const Index = () => {
  const [user, setUser] = useState<User>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleSignIn = () => {
    // Mock sign in for demo - will be replaced with real Google auth
    setUser({
      name: "Demo User",
      photo: "",
    });
    toast({
      title: "Signed in successfully",
      description: "Welcome to Cover Art Maker!",
    });
  };

  const handleSignOut = () => {
    setUser(null);
    setGeneratedImage(null);
    toast({
      title: "Signed out",
      description: "Come back soon!",
    });
  };

  const handleGenerate = async (prompt: string, genre: string, style: string, mood: string) => {
    setIsGenerating(true);
    
    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // For demo, we'll use a placeholder image
    // This will be replaced with actual AI generation via Lovable AI
    const demoImages = [
      "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1000&h=1000&fit=crop",
      "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=1000&h=1000&fit=crop",
    ];
    
    const randomImage = demoImages[Math.floor(Math.random() * demoImages.length)];
    setGeneratedImage(randomImage);
    setIsGenerating(false);
    
    toast({
      title: "Cover art generated!",
      description: `${genre} cover with ${style} style is ready.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />
      
      <main className="pt-16">
        <HeroSection />
        
        {user ? (
          <GeneratorStudio 
            onGenerate={handleGenerate}
            generatedImage={generatedImage}
            isGenerating={isGenerating}
          />
        ) : (
          <div className="py-16 text-center">
            <p className="text-muted-foreground mb-4">
              Sign in with Google to start creating your cover art
            </p>
            <button 
              onClick={handleSignIn}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
