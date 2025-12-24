import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Trash2, ArrowLeft, Image as ImageIcon, Search, Filter, UserPlus, Copy, Check, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGenre, setFilterGenre] = useState<string>("all");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const genres = [
    "all",
    "Hip-Hop / Rap",
    "Pop",
    "EDM",
    "R&B",
    "Rock",
    "Alternative",
    "Indie",
    "Metal",
    "Country",
    "Jazz",
    "Classical"
  ];

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchGenerations();
      fetchOrCreateReferralCode();
    }
  }, [user]);

  const fetchOrCreateReferralCode = async () => {
    if (!user) return;
    
    try {
      // Check if user already has a referral code
      const { data: existing, error: fetchError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .is("referred_user_id", null)
        .limit(1);

      if (fetchError) {
        console.error("Error fetching referral:", fetchError);
        return;
      }

      if (existing && existing.length > 0) {
        setReferralCode(existing[0].referral_code);
      } else {
        // Generate new referral code
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { data: newReferral, error: insertError } = await supabase
          .from("referrals")
          .insert({ referrer_id: user.id, referral_code: code })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating referral:", insertError);
        } else {
          setReferralCode(newReferral.referral_code);
        }
      }

      // Fetch all referrals for stats
      const { data: allReferrals } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id);

      if (allReferrals) {
        setReferrals(allReferrals);
      }
    } catch (error) {
      console.error("Error with referral code:", error);
    }
  };

  const fetchGenerations = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      console.log("[Profile] Fetching generations for user:", user.id);
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Profile] Supabase error:", error);
        throw error;
      }
      console.log("[Profile] Generations fetched:", data?.length ?? 0);
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

  // Filter generations based on search and genre
  const filteredGenerations = generations.filter((gen) => {
    const matchesSearch = searchQuery === "" || 
      gen.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gen.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gen.style.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = filterGenre === "all" || gen.genre === filterGenre;
    
    return matchesSearch && matchesGenre;
  });

  const copyReferralLink = () => {
    if (referralCode) {
      const link = `${window.location.origin}/?ref=${referralCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link with your friends",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const convertedReferrals = referrals.filter(r => r.status === "converted").length;
  const pendingReferrals = referrals.filter(r => r.status === "registered" && !r.credits_awarded).length;

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
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex-1">
                <h1 className="font-display text-3xl tracking-wide">
                  MY CREATIONS
                </h1>
                <p className="text-muted-foreground">
                  {filteredGenerations.length} of {generations.length} cover{generations.length !== 1 ? "s" : ""}
                </p>
              </div>
              
              {/* Invite Friend Button */}
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Invite a Friend
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-primary" />
                      Invite Friends, Earn Credits
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Share your unique link and earn <span className="font-semibold text-primary">5 free credits</span> when your friend makes their first purchase!
                    </p>
                    
                    {referralCode && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input 
                            value={`${window.location.origin}/?ref=${referralCode}`}
                            readOnly
                            className="bg-secondary"
                          />
                          <Button onClick={copyReferralLink} variant="outline" className="shrink-0">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        
                        <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                          <p className="font-medium mb-2">Your Referral Stats</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Converted:</span>
                              <span className="ml-1 font-semibold">{convertedReferrals}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pending:</span>
                              <span className="ml-1 font-semibold">{pendingReferrals}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Credits Earned:</span>
                              <span className="ml-1 font-semibold text-primary">{convertedReferrals * 5}</span>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Credits are awarded after your friend makes their first purchase.
                        </p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by prompt, genre, or style..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary border-border"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterGenre} onValueChange={setFilterGenre}>
                  <SelectTrigger className="w-[180px] bg-secondary border-border">
                    <SelectValue placeholder="Filter by genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {genres.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g === "all" ? "All Genres" : g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredGenerations.length === 0 ? (
              <div className="text-center py-20">
                <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {generations.length === 0 ? "No creations yet" : "No matching results"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {generations.length === 0 
                    ? "Start generating your first album cover art"
                    : "Try adjusting your search or filter"}
                </p>
                {generations.length === 0 ? (
                  <Button onClick={() => navigate("/")}>
                    Create Cover Art
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => { setSearchQuery(""); setFilterGenre("all"); }}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredGenerations.map((gen) => (
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
                    <div className="p-3 md:p-4">
                      <p className="text-xs md:text-sm line-clamp-2 mb-2">{gen.prompt}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                          {gen.genre}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground hidden sm:inline-block">
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
