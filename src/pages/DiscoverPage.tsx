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

type FilterType = 'popular' | 'new' | 'trending';

export default function DiscoverPage() {
  const navigate = useNavigate();
  
  // Main tab state
  const [activeTab, setActiveTab] = useState<"browse" | "users">("browse");
  
  // Browse filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>('popular');
  const [shows, setShows] = useState<ShowCard[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Search overlay state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [searchResults, setSearchResults] = useState<ShowCard[]>([]);
  const [searchPage, setSearchPage] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(true);
  
  // Users search state
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Refs for infinite scroll
  const browseObserverRef = useRef<HTMLDivElement>(null);
  const searchObserverRef = useRef<HTMLDivElement>(null);

  // Load initial shows when filter changes
  useEffect(() => {
    if (activeTab === "browse") {
      setPage(0);
      setShows([]);
      setHasMore(true);
      loadShows(activeFilter, 0);
    }
  }, [activeFilter, activeTab]);

  // Load more shows when page increments
  useEffect(() => {
    if (page > 0) {
      loadShows(activeFilter, page);
    }
  }, [page]);

  // Infinite scroll observer for browse
  useEffect(() => {
    if (activeTab !== "browse" || showSearchOverlay) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.5, rootMargin: '200px' }
    );

    if (browseObserverRef.current) {
      observer.observe(browseObserverRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, activeTab, showSearchOverlay]);

  // Infinite scroll observer for search overlay
  useEffect(() => {
    if (!showSearchOverlay) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && searchHasMore && !searchLoading && searchQuery.trim()) {
          setSearchPage((prev) => prev + 1);
        }
      },
      { threshold: 0.5, rootMargin: '200px' }
    );

    if (searchObserverRef.current) {
      observer.observe(searchObserverRef.current);
    }

    return () => observer.disconnect();
  }, [showSearchOverlay, searchHasMore, searchLoading, searchQuery]);

  // Debounced search
  useEffect(() => {
    if (!showSearchOverlay || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setSearchPage(0);
      setSearchResults([]);
      setSearchHasMore(true);
      performSearch(searchQuery, 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, showSearchOverlay]);

  // Load more search results when page increments
  useEffect(() => {
    if (searchPage > 0 && searchQuery.trim()) {
      performSearch(searchQuery, searchPage);
    }
  }, [searchPage]);

  // Search users when on Users tab
  useEffect(() => {
    if (activeTab === "users" && searchQuery.trim()) {
      searchUsers();
    } else if (activeTab === "users") {
      setUsers([]);
    }
  }, [searchQuery, activeTab]);

  async function loadShows(filter: FilterType, pageNum: number) {
    if (loading) return;
    
    setLoading(true);
    try {
      let results = [];

      if (filter === 'popular') {
        results = await tvdbFetch(`/series/filter?page=${pageNum}&sort=score&sortType=desc`);
      } else if (filter === 'new') {
        const currentYear = new Date().getFullYear();
        results = await tvdbFetch(`/search?query=${currentYear}&type=series&limit=20&page=${pageNum}`);
      } else if (filter === 'trending') {
        results = await tvdbFetch(`/series/filter?page=${pageNum}&sort=lastUpdated&sortType=desc`);
      }

      const showsData = Array.isArray(results) ? results : [];
      const normalized = showsData.map(normalizeSeries);

      if (pageNum === 0) {
        setShows(normalized);
      } else {
        setShows((prev) => {
          const combined = [...prev, ...normalized];
          // Deduplicate by ID
          const seen = new Set();
          return combined.filter((show) => {
            if (seen.has(show.id)) return false;
            seen.add(show.id);
            return true;
          });
        });
      }

      setHasMore(normalized.length >= 20);
    } catch (error) {
      console.error('Error loading shows:', error);
      toast.error('Failed to load shows');
    } finally {
      setLoading(false);
    }
  }

  async function performSearch(query: string, pageNum: number) {
    if (searchLoading) return;
    
    setSearchLoading(true);
    try {
      const results = await tvdbFetch(`/search?query=${encodeURIComponent(query)}&type=series&limit=20&page=${pageNum}`);
      const showsData = Array.isArray(results) ? results : [];
      const normalized = showsData.map(normalizeSeries);

      if (pageNum === 0) {
        setSearchResults(normalized);
      } else {
        setSearchResults((prev) => {
          const combined = [...prev, ...normalized];
          const seen = new Set();
          return combined.filter((show) => {
            if (seen.has(show.id)) return false;
            seen.add(show.id);
            return true;
          });
        });
      }

      setSearchHasMore(normalized.length >= 20);
    } catch (error) {
      console.error('Error searching shows:', error);
      toast.error('Failed to search shows');
    } finally {
      setSearchLoading(false);
    }
  }

  async function searchUsers() {
    setUsersLoading(true);
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
      setUsersLoading(false);
    }
  }

  function closeSearchOverlay() {
    setShowSearchOverlay(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchPage(0);
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "browse" | "users")} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            {/* Filter Tabs */}
            <div className="mb-6">
              <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)} className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="popular">Popular</TabsTrigger>
                  <TabsTrigger value="new">New</TabsTrigger>
                  <TabsTrigger value="trending">Trending</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Vertical Grid of Shows */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {shows.map((show) => (
                <ShowCardComponent 
                  key={show.id} 
                  show={show} 
                  onClick={() => navigate(`/show/${show.id}`)} 
                />
              ))}
            </div>

            {/* Loading Skeleton */}
            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3]" />
                ))}
              </div>
            )}

            {/* Infinite Scroll Trigger */}
            <div ref={browseObserverRef} className="h-4 mt-8" />

            {/* No More Results */}
            {!hasMore && shows.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No more shows to load
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            {!searchQuery.trim() && (
              <div className="text-center py-12 text-muted-foreground">
                Search for users to get started
              </div>
            )}

            {searchQuery.trim() && !usersLoading && users.length === 0 && (
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
                        <p className="font-semibold">{user.handle}</p>
                        {user.bio && <p className="text-sm text-muted-foreground line-clamp-1">{user.bio}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {usersLoading && (
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
            {/* Header with Close Button */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={closeSearchOverlay}>
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

            {/* Empty State */}
            {!searchQuery.trim() && (
              <div className="text-center py-12 text-muted-foreground">
                Start typing to search for shows...
              </div>
            )}

            {/* No Results */}
            {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No shows found for "{searchQuery}"
              </div>
            )}

            {/* Search Results Grid */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.map((show) => (
                  <ShowCardComponent 
                    key={show.id} 
                    show={show} 
                    onClick={() => {
                      closeSearchOverlay();
                      navigate(`/show/${show.id}`);
                    }} 
                  />
                ))}
              </div>
            )}

            {/* Search Loading Skeleton */}
            {searchLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3]" />
                ))}
              </div>
            )}

            {/* Infinite Scroll Trigger */}
            <div ref={searchObserverRef} className="h-4 mt-8" />
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
