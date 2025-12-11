import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Trash2, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Generation {
  id: string;
  prompt: string;
  genre: string;
  style: string;
  mood: string;
  image_url: string;
  created_at: string;
}

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [user]);

  const fetchGenerations = async () => {
    try {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGenerations(data || []);
    } catch (error) {
      console.error("Error fetching generations:", error);
      toast({
        title: "Error loading history",
        description: "Could not load your generation history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("generations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setGenerations((prev) => prev.filter((g) => g.id !== id));
      toast({
        title: "Deleted",
        description: "Cover art removed from history",
      });
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: "Delete failed",
        description: "Could not delete this generation",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (imageUrl: string, prompt: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `cover-art-${prompt.slice(0, 20).replace(/\s+/g, "-")}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="font-display text-3xl tracking-wide">
                  MY CREATIONS
                </h1>
                <p className="text-muted-foreground">
                  {generations.length} cover{generations.length !== 1 ? "s" : ""} generated
                </p>
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : generations.length === 0 ? (
              <div className="text-center py-20">
                <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No creations yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start generating your first album cover art
                </p>
                <Button onClick={() => navigate("/")}>
                  Create Cover Art
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {generations.map((gen) => (
                  <div
                    key={gen.id}
                    className="bg-card rounded-xl border border-border overflow-hidden group"
                  >
                    <div className="aspect-square relative">
                      <img
                        src={gen.image_url}
                        alt={gen.prompt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleDownload(gen.image_url, gen.prompt)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(gen.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm line-clamp-2 mb-2">{gen.prompt}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                          {gen.genre}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                          {gen.style}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(gen.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
