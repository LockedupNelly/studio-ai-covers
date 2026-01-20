import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Users, Image, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Generation {
  id: string;
  user_id: string;
  user_email: string;
  prompt: string;
  genre: string;
  style: string;
  mood: string;
  song_title: string | null;
  artist_name: string | null;
  image_url: string;
  created_at: string;
}

interface Stats {
  totalGenerations: number;
  uniqueUsers: number;
}

const GENRES = ["Hip-Hop", "R&B", "Pop", "Rock", "Electronic", "Jazz", "Country", "Latin", "Gospel", "Classical"];

export default function AdminGenerations() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 24;

  const fetchGenerations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-all-generations", {
        body: {
          limit,
          offset: page * limit,
          search,
          genre: genre === "all" ? "" : genre,
        },
      });

      if (error) throw error;

      setGenerations(data.generations || []);
      setTotal(data.total || 0);
      setStats(data.stats || null);
    } catch (error: any) {
      console.error("Error fetching generations:", error);
      toast.error(error.message || "Failed to fetch generations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [user, page, genre]);

  const handleSearch = () => {
    setPage(0);
    fetchGenerations();
  };

  const totalPages = Math.ceil(total / limit);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-6">Please sign in to access this page.</p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">All Generations</h1>
              <p className="text-sm text-muted-foreground">Admin view of all user creations</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin/export")}>
            Export Users
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Image className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalGenerations}</p>
                  <p className="text-sm text-muted-foreground">Total Generations</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.uniqueUsers}</p>
                  <p className="text-sm text-muted-foreground">Unique Users</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by prompt, song title, or artist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Select value={genre} onValueChange={(v) => { setGenre(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {generations.length} of {total} generations
        </p>

        {/* Generations Grid */}
        {loading && generations.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : generations.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No generations found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {generations.map((gen) => (
              <div
                key={gen.id}
                className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
              >
                <div className="aspect-square relative">
                  <img
                    src={gen.image_url}
                    alt={gen.song_title || "Cover"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                    <p className="text-xs text-white/90 line-clamp-2">{gen.prompt}</p>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground truncate">
                    {gen.song_title || "Untitled"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {gen.artist_name || "Unknown Artist"}
                  </p>
                  <p className="text-xs text-muted-foreground/70 truncate mt-1">
                    {gen.user_email}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{gen.genre}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1 || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
