import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { tvdbFetch } from "@/lib/tvdb";
import { normalizeSeries, ShowCard } from "@/lib/shows";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("browse");
  
  const [searchResults, setSearchResults] = useState<ShowCard[]>([]);
  const [popularShows, setPopularShows] = useState<ShowCard[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Popular search terms to rotate through for diverse content
  const popularSearchTerms = [
    'breaking', 'game', 'stranger', 'office', 'friends', 'walking', 
    'house', 'last', 'dragon', 'witcher', 'dark', 'crown', 'boys'
  ];

  // Load popular shows when Browse tab is active and no search
  useEffect(() => {
    if (activeTab === "browse" && !searchQuery.trim()) {
      loadPopularShows();
    }
  }, [activeTab]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !searchQuery.trim() && activeTab === "browse") {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, searchQuery, activeTab]);

  // Load more when page changes
  useEffect(() => {
    if (page > 0 && !searchQuery.trim() && activeTab === "browse") {
      loadPopularShows();
    }
  }, [page]);

  // Search shows when query changes and on Browse tab
  useEffect(() => {
    if (activeTab === "browse" && searchQuery.trim()) {
      searchShows();
    }
  }, [searchQuery, activeTab]);

  // Search users when query changes and on Users tab
  useEffect(() => {
    if (activeTab === "users" && searchQuery.trim()) {
      searchUsers();
    } else if (activeTab === "users") {
      setUsers([]);
    }
  }, [searchQuery, activeTab]);

  async function loadPopularShows() {
    if (loading) return;
    
    setLoading(true);
    try {
      // Use TVDB's filter endpoint to get popular series sorted by score
      const response = await tvdbFetch(`/series/filter?page=${page}&sort=score&sortType=desc`);
      const showsData = Array.isArray(response) ? response : [];
      const normalized = showsData.map(normalizeSeries);
      
      setPopularShows((prev) => {
        const combined = [...prev, ...normalized];
        // Remove duplicates by id
        const seen = new Set();
        return combined.filter((show: any) => {
          if (seen.has(show.id)) return false;
          seen.add(show.id);
          return true;
        });
      });
      
      if (normalized.length < 20) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading popular shows:", error);
      toast.error("Failed to load shows");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  async function searchShows() {
    setLoading(true);
    try {
      const results = await tvdbFetch(`/search?query=${encodeURIComponent(searchQuery)}&type=series&limit=20`);
      const showsData = Array.isArray(results) ? results : [];
      setSearchResults(showsData.map(normalizeSeries));
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
    <div className="container mx-auto px-4 py-6 max-w-7xl pb-20">
      <h1 className="text-3xl font-bold mb-6">Discover</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={activeTab === "browse" ? "Search shows..." : "Search users..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
          {searchQuery.trim() ? (
            // Show search results
            <>
              {!loading && searchResults.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No shows found
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {searchResults.map((show) => (
                    <ShowCardComponent key={show.id} show={show} onClick={() => navigate(`/show/${show.id}`)} />
                  ))}
                </div>
              )}
            </>
          ) : (
            // Show popular shows
            <>
              {popularShows.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {popularShows.map((show) => (
                    <ShowCardComponent key={show.id} show={show} onClick={() => navigate(`/show/${show.id}`)} />
                  ))}
                </div>
              )}
              
              <div ref={observerTarget} className="h-4 mt-4" />
            </>
          )}
          
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3]" />
              ))}
            </div>
          )}
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
