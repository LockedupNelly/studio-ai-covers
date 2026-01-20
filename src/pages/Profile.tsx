import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Trash2, ArrowLeft, Image as ImageIcon, Search, Filter, UserPlus, Copy, Check, Gift, Pencil, RotateCw, Layers } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { downloadImage } from "@/lib/download-utils";
import { VersionViewer, GenerationVersion } from "@/components/VersionViewer";

interface Generation {
  id: string;
  prompt: string;
  genre: string;
  style: string;
  mood: string;
  image_url: string;
  created_at: string;
  song_title?: string | null;
  artist_name?: string | null;
  cover_analysis?: {
    dominantColors: string[];
    subjectPosition: string;
    safeTextZones: string[];
    avoidZones: string[];
    mood: string;
  } | null;
  parent_id?: string | null;
  version?: number;
  edit_instructions?: string | null;
}

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGenre, setFilterGenre] = useState<string>("all");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [versionViewerOpen, setVersionViewerOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<GenerationVersion[]>([]);

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
      // Fetch all referrals for this user using secure function (excludes email)
      const { data: allReferrals, error: fetchError } = await supabase
        .rpc('get_user_referrals', { p_user_id: user.id });

      if (fetchError) {
        console.error("Error fetching referrals:", fetchError);
        return;
      }

      if (allReferrals && allReferrals.length > 0) {
        // Find an unused referral code
        const unusedReferral = allReferrals.find((r: any) => !r.referred_user_id);
        if (unusedReferral) {
          setReferralCode(unusedReferral.referral_code);
        } else {
          // All codes are used, create a new one
          const code = Math.random().toString(36).substring(2, 10).toUpperCase();
          const { data: newReferral, error: insertError } = await supabase
            .from("referrals")
            .insert({ referrer_id: user.id, referral_code: code })
            .select("id, referral_code, referrer_id, referred_user_id, credits_awarded, created_at, converted_at, status")
            .single();

          if (insertError) {
            console.error("Error creating referral:", insertError);
          } else if (newReferral) {
            setReferralCode(newReferral.referral_code);
          }
        }
        setReferrals(allReferrals);
      } else {
        // No referrals exist, create first one
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { data: newReferral, error: insertError } = await supabase
          .from("referrals")
          .insert({ referrer_id: user.id, referral_code: code })
          .select("id, referral_code, referrer_id, referred_user_id, credits_awarded, created_at, converted_at, status")
          .single();

        if (insertError) {
          console.error("Error creating referral:", insertError);
        } else if (newReferral) {
          setReferralCode(newReferral.referral_code);
          setReferrals([newReferral]);
        }
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

      const { data, error } = await supabase.functions.invoke("list-generations", {
        body: { limit: 50, offset: 0 },
      });

      if (error) {
        console.error("[Profile] Functions error:", error);
        throw error;
      }

      if (data?.error) {
        console.error("[Profile] list-generations error:", data);
        throw new Error(data.details || data.error);
      }

      const rows = (data?.generations ?? []) as Generation[];
      console.log("[Profile] Generations fetched:", rows.length);
      setGenerations(rows);
    } catch (error) {
      console.error("Error fetching generations:", error);
      toast.error("Error loading history", {
        description: error instanceof Error ? error.message : "Could not load your generation history",
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
      toast.success("Deleted", {
        description: "Cover art removed from history",
      });
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Delete failed", {
        description: "Could not delete this generation",
      });
    }
  };

  const handleDownload = async (imageUrl: string, prompt: string) => {
    const filename = `cover-art-${prompt.slice(0, 20)}`;
    await downloadImage(imageUrl, filename);
  };

  // Group generations by root parent for version tracking
  const { rootGenerations, versionsByRoot } = useMemo(() => {
    const versionMap = new Map<string, Generation[]>();
    const roots: Generation[] = [];
    
    // First pass: identify all generations and their relationships
    for (const gen of generations) {
      if (!gen.parent_id) {
        // This is a root generation (original)
        if (!versionMap.has(gen.id)) {
          versionMap.set(gen.id, []);
        }
        // Add itself as v1
        versionMap.get(gen.id)!.push(gen);
      } else {
        // This is a child version
        const rootId = gen.parent_id;
        if (!versionMap.has(rootId)) {
          versionMap.set(rootId, []);
        }
        versionMap.get(rootId)!.push(gen);
      }
    }
    
    // Second pass: collect root generations and include orphaned versions
    for (const gen of generations) {
      if (!gen.parent_id) {
        roots.push(gen);
      }
    }
    
    // Sort versions within each group by version number
    versionMap.forEach((versions) => {
      versions.sort((a, b) => (a.version || 1) - (b.version || 1));
    });
    
    return { rootGenerations: roots, versionsByRoot: versionMap };
  }, [generations]);

  // Filter root generations based on search and genre
  const filteredGenerations = rootGenerations.filter((gen) => {
    const matchesSearch = searchQuery === "" || 
      gen.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gen.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gen.style.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = filterGenre === "all" || gen.genre === filterGenre;
    
    return matchesSearch && matchesGenre;
  });

  const getVersionCount = (rootId: string) => {
    return versionsByRoot.get(rootId)?.length || 1;
  };

  const openVersionViewer = (rootId: string) => {
    const versions = versionsByRoot.get(rootId) || [];
    setSelectedVersions(versions.map(v => ({
      id: v.id,
      image_url: v.image_url,
      version: v.version || 1,
      edit_instructions: v.edit_instructions || null,
      created_at: v.created_at,
      prompt: v.prompt,
      genre: v.genre,
      style: v.style,
      mood: v.mood,
      song_title: v.song_title,
      artist_name: v.artist_name,
      cover_analysis: v.cover_analysis,
    })));
    setVersionViewerOpen(true);
  };

  const handleEditFromViewer = (generation: GenerationVersion) => {
    setVersionViewerOpen(false);
    navigate("/edit-studio", { 
      state: { 
        imageUrl: generation.image_url, 
        genre: generation.genre, 
        style: generation.style, 
        mood: generation.mood,
        prompt: generation.prompt,
        songTitle: generation.song_title,
        artistName: generation.artist_name,
        coverAnalysis: generation.cover_analysis,
        generationId: generation.id,
      } 
    });
  };

  const handleRerunFromViewer = (generation: GenerationVersion) => {
    setVersionViewerOpen(false);
    navigate("/design-studio", { 
      state: { 
        returnedImage: generation.image_url,
        genre: generation.genre,
        style: generation.style,
        mood: generation.mood,
        songTitle: generation.song_title,
        artistName: generation.artist_name,
      } 
    });
  };

  const copyReferralLink = () => {
    if (referralCode) {
      const link = `${window.location.origin}/?ref=${referralCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied!", {
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
                  {filteredGenerations.length} of {rootGenerations.length} cover{rootGenerations.length !== 1 ? "s" : ""}
                  {generations.length !== rootGenerations.length && (
                    <span className="text-xs ml-1">
                      ({generations.length} total including edits)
                    </span>
                  )}
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
                  {rootGenerations.length === 0 ? "No creations yet" : "No matching results"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {rootGenerations.length === 0 
                    ? "Start generating your first album cover art"
                    : "Try adjusting your search or filter"}
                </p>
                {rootGenerations.length === 0 ? (
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
                {filteredGenerations.map((gen) => {
                  const versionCount = getVersionCount(gen.id);
                  
                  return (
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
                        
                        {/* Version badge - always visible, highlighted if multiple versions */}
                        <button
                          onClick={() => openVersionViewer(gen.id)}
                          className="absolute top-2 right-2 z-10"
                        >
                          <Badge 
                            variant="secondary" 
                            className={`border cursor-pointer transition-all flex items-center gap-1 ${
                              versionCount > 1 
                                ? "bg-primary/90 text-primary-foreground hover:bg-primary border-primary" 
                                : "bg-background/90 hover:bg-background border-border"
                            }`}
                          >
                            <Layers className="w-3 h-3" />
                            {versionCount > 1 ? `${versionCount} versions` : "v1"}
                          </Badge>
                        </button>
                        
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                          <div className="grid grid-cols-2 gap-2 md:gap-3">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => navigate("/edit-studio", { 
                                state: { 
                                  imageUrl: gen.image_url, 
                                  genre: gen.genre, 
                                  style: gen.style, 
                                  mood: gen.mood,
                                  prompt: gen.prompt,
                                  songTitle: gen.song_title,
                                  artistName: gen.artist_name,
                                  coverAnalysis: gen.cover_analysis,
                                  generationId: gen.id,
                                } 
                              })}
                              title="Edit in Studio"
                              className="h-10 w-10 md:h-11 md:w-11 p-0"
                            >
                              <Pencil className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openVersionViewer(gen.id)}
                              title="View Version History"
                              className="h-10 w-10 md:h-11 md:w-11 p-0"
                            >
                              <Layers className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(gen.image_url, gen.prompt)}
                              title="Download"
                              className="h-10 w-10 md:h-11 md:w-11 p-0"
                            >
                              <Download className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(gen.id)}
                              title="Delete"
                              className="h-10 w-10 md:h-11 md:w-11 p-0"
                            >
                              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                          </div>
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Version Viewer Dialog */}
      <VersionViewer
        open={versionViewerOpen}
        onOpenChange={setVersionViewerOpen}
        versions={selectedVersions}
        onDownload={handleDownload}
        onDelete={(id) => {
          handleDelete(id);
          // Close viewer if we deleted the last version
          if (selectedVersions.length <= 1) {
            setVersionViewerOpen(false);
          } else {
            // Update the versions list
            setSelectedVersions(prev => prev.filter(v => v.id !== id));
          }
        }}
        onEdit={handleEditFromViewer}
        onRerun={handleRerunFromViewer}
      />
    </div>
  );
};

export default Profile;