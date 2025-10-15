import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X } from "lucide-react";
import { tvdbFetch } from "@/lib/tvdb";
import { normalizeSeries, ShowCard } from "@/lib/shows";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("browse");
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  
  const [searchResults, setSearchResults] = useState<ShowCard[]>([]);
  const [trendingShows, setTrendingShows] = useState<ShowCard[]>([]);
  const [newShows, setNewShows] = useState<ShowCard[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingPage, setTrendingPage] = useState(0);
  const [newPage, setNewPage] = useState(0);
  const [searchPage, setSearchPage] = useState(0);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);
  const [hasMoreNew, setHasMoreNew] = useState(true);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);
  
  const trendingObserver = useRef<HTMLDivElement>(null);
  const newObserver = useRef<HTMLDivElement>(null);
  const searchObserver = useRef<HTMLDivElement>(null);
  
  // Load trending & new shows on mount
  useEffect(() => {
    if (activeTab === "browse") {
      loadTrendingShows();
      loadNewShows();
    }
  }, [activeTab]);

  // Horizontal scroll observers for rails
  useEffect(() => {
    const trendingObs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreTrending && !loading) {
          setTrendingPage((prev) => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    const newObs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreNew && !loading) {
          setNewPage((prev) => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (trendingObserver.current) trendingObs.observe(trendingObserver.current);
    if (newObserver.current) newObs.observe(newObserver.current);

    return () => {
      trendingObs.disconnect();
      newObs.disconnect();
    };
  }, [hasMoreTrending, hasMoreNew, loading]);

  // Search overlay scroll observer
  useEffect(() => {
    if (!showSearchOverlay) return;

    const searchObs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreSearch && !loading && searchQuery.trim()) {
          setSearchPage((prev) => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (searchObserver.current) searchObs.observe(searchObserver.current);

    return () => searchObs.disconnect();
  }, [showSearchOverlay, hasMoreSearch, loading, searchQuery]);

  // Load more when pages change
  useEffect(() => {
    if (trendingPage > 0) loadTrendingShows();
  }, [trendingPage]);

  useEffect(() => {
    if (newPage > 0) loadNewShows();
  }, [newPage]);

  useEffect(() => {
    if (searchPage > 0 && searchQuery.trim()) searchShowsOverlay();
  }, [searchPage]);

  // Debounced search in overlay
  useEffect(() => {
    if (!showSearchOverlay) return;
    
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setSearchPage(0);
        setSearchResults([]);
        searchShowsOverlay();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, showSearchOverlay]);

  // Search users when query changes and on Users tab
  useEffect(() => {
    if (activeTab === "users" && searchQuery.trim()) {
      searchUsers();
    } else if (activeTab === "users") {
      setUsers([]);
    }
  }, [searchQuery, activeTab]);

  async function loadTrendingShows() {
    if (loading) return;
    
    setLoading(true);
    try {
      const results = await tvdbFetch(`/series/filter?page=${trendingPage}&sort=score&sortType=desc`);
      const showsData = Array.isArray(results) ? results : [];
      const normalized = showsData.map(normalizeSeries);
      
      setTrendingShows((prev) => {
        const combined = [...prev, ...normalized];
        const seen = new Set();
        return combined.filter((show: any) => {
          if (seen.has(show.id)) return false;
          seen.add(show.id);
          return true;
        });
      });
      
      if (normalized.length < 20) setHasMoreTrending(false);
    } catch (error) {
      console.error("Error loading trending shows:", error);
      toast.error("Failed to load shows");
    } finally {
      setLoading(false);
    }
  }

  async function loadNewShows() {
    if (loading) return;
    
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const results = await tvdbFetch(`/search?query=${currentYear}&type=series&limit=20&page=${newPage}`);
      const showsData = Array.isArray(results) ? results : [];
      const normalized = showsData.map(normalizeSeries);
      
      setNewShows((prev) => {
        const combined = [...prev, ...normalized];
        const seen = new Set();
        return combined.filter((show: any) => {
          if (seen.has(show.id)) return false;
          seen.add(show.id);
          return true;
        });
      });
      
      if (normalized.length < 20) setHasMoreNew(false);
    } catch (error) {
      console.error("Error loading new shows:", error);
      toast.error("Failed to load shows");
    } finally {
      setLoading(false);
    }
  }

  async function searchShowsOverlay() {
    if (loading) return;
    
    setLoading(true);
    try {
      const results = await tvdbFetch(`/search?query=${encodeURIComponent(searchQuery)}&type=series&limit=20&page=${searchPage}`);
      const showsData = Array.isArray(results) ? results : [];
      const normalized = showsData.map(normalizeSeries);
      
      if (searchPage === 0) {
        setSearchResults(normalized);
      } else {
        setSearchResults((prev) => {
          const combined = [...prev, ...normalized];
          const seen = new Set();
          return combined.filter((show: any) => {
            if (seen.has(show.id)) return false;
            seen.add(show.id);
            return true;
          });
        });
      }
      
      if (normalized.length < 20) setHasMoreSearch(false);
    } catch (error) {
      console.error("Error searching shows:", error);
      toast.error("Failed to search shows");
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, handle, avatar_url, bio")
        .ilike("handle", `%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="container mx-auto px-4 py-6 max-w-7xl pb-20">
        <h1 className="text-3xl font-bold mb-6">Discover</h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === "browse" ? "Search shows..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => activeTab === "browse" && setShowSearchOverlay(true)}
            className="pl-10"
          />
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Saturday Morning Wavy Background */}
        <div className="sat-am-waves" aria-hidden="true" />
        
        <TabsList className="mb-6">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          {/* Trending Shows Rail */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Trending Shows</h2>
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {trendingShows.map((show) => (
                  <div key={show.id} className="flex-shrink-0 w-32 sm:w-40">
                    <ShowCardComponent show={show} onClick={() => navigate(`/show/${show.id}`)} />
                  </div>
                ))}
                <div ref={trendingObserver} className="flex-shrink-0 w-4" />
                {loading && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="flex-shrink-0 w-32 sm:w-40 aspect-[2/3]" />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* New Shows Rail */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">New Shows</h2>
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {newShows.map((show) => (
                  <div key={show.id} className="flex-shrink-0 w-32 sm:w-40">
                    <ShowCardComponent show={show} onClick={() => navigate(`/show/${show.id}`)} />
                  </div>
                ))}
                <div ref={newObserver} className="flex-shrink-0 w-4" />
                {loading && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="flex-shrink-0 w-32 sm:w-40 aspect-[2/3]" />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users">
          {!searchQuery.trim() && (
            <div className="text-center py-12 text-muted-foreground">
              Search for users to get started
            </div>
          )}
          
          {searchQuery.trim() && !loading && users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          )}

          {users.length > 0 && (
            <div className="space-y-4">
              {users.map((user) => (
                <Card
                  key={user.id}
                  className="p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/user/${user.handle}`)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.handle[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">@{user.handle}</p>
                      {user.bio && <p className="text-sm text-muted-foreground line-clamp-1">{user.bio}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          {loading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>

    {/* Search Overlay */}
    {showSearchOverlay && (
      <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => {
              setShowSearchOverlay(false);
              setSearchQuery("");
              setSearchResults([]);
            }}>
              <X className="h-6 w-6" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {!searchQuery.trim() && (
            <div className="text-center py-12 text-muted-foreground">
              Start typing to search...
            </div>
          )}

          {searchQuery.trim() && !loading && searchResults.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No shows found
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchResults.map((show) => (
                <ShowCardComponent 
                  key={show.id} 
                  show={show} 
                  onClick={() => {
                    setShowSearchOverlay(false);
                    navigate(`/show/${show.id}`);
                  }} 
                />
              ))}
            </div>
          )}

          <div ref={searchObserver} className="h-4 mt-4" />

          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3]" />
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}

function ShowCardComponent({ show, onClick }: { show: ShowCard; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer overflow-hidden group hover:ring-2 hover:ring-primary transition-all"
      onClick={onClick}
    >
      <div className="aspect-[2/3] relative">
        <img
          src={show.posterUrl || "/placeholder.svg"}
          alt={show.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-semibold text-white text-sm line-clamp-2">{show.title}</h3>
            {show.year && <p className="text-xs text-white/80">{show.year}</p>}
          </div>
        </div>
      </div>
    </Card>
  );
}
