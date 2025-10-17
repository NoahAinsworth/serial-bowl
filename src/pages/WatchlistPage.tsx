import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Bookmark, Trash2, Search, Plus, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTVDB } from '@/hooks/useTVDB';
import { tvdbFetch } from '@/lib/tvdb';
import { WatchlistHierarchy } from '@/components/WatchlistHierarchy';

interface WatchlistItem {
  id: string;
  content: {
    id: string;
    title: string;
    poster_url?: string;
    external_id: string;
    metadata?: any;
  };
  created_at: string;
}

interface WatchedItem {
  id: string;
  content: {
    id: string;
    title: string;
    poster_url?: string;
    external_id: string;
    metadata?: any;
  };
  watched_at: string;
}

export default function WatchlistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { search, loading: searchLoading } = useTVDB();
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [watchedItems, setWatchedItems] = useState<WatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'watched' | 'search'>('watchlist');
  const [browseShows, setBrowseShows] = useState<any[]>([]);
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [browsePage, setBrowsePage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'search' && browseShows.length === 0) {
      loadBrowseShows();
    }
  }, [activeTab]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingBrowse && !searchQuery.trim() && activeTab === 'search') {
          setBrowsePage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingBrowse, searchQuery, activeTab]);

  // Load more when page changes
  useEffect(() => {
    if (browsePage > 0 && !searchQuery.trim() && activeTab === 'search') {
      loadBrowseShows();
    }
  }, [browsePage]);

  const loadData = async () => {
    if (!user) return;

    await Promise.all([loadWatchlist(), loadWatched()]);
    setLoading(false);
  };

  const loadBrowseShows = async () => {
    if (loadingBrowse) return;
    
    setLoadingBrowse(true);
    try {
      const response = await tvdbFetch(`/series/filter?page=${browsePage}&sort=score&sortType=desc`);
      const showsData = Array.isArray(response) ? response : [];
      const normalized = showsData.map((s: any) => ({
        id: s.id,
        tvdb_id: s.id,
        name: s.name ?? s.seriesName ?? "Untitled",
        overview: s.overview || '',
        image: s.image ?? s.artwork_64_url ?? s.artwork_32_url ?? null,
        image_url: s.image ?? s.artwork_64_url ?? s.artwork_32_url ?? null,
        firstAired: s.firstAired ?? null,
        year: s.firstAired ? String(s.firstAired).slice(0, 4) : null,
      }));
      
      setBrowseShows((prev) => {
        const combined = [...prev, ...normalized];
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
      console.error('[loadBrowseShows] Error:', error);
      setHasMore(false);
    } finally {
      setLoadingBrowse(false);
    }
  };

  const loadWatchlist = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('watchlist')
      .select(`
        id,
        created_at,
        content (
          id,
          title,
          poster_url,
          external_id,
          metadata
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWatchlistItems(data as any);
    }
  };

  const loadWatched = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('watched')
      .select(`
        id,
        watched_at,
        content (
          id,
          title,
          poster_url,
          external_id,
          metadata
        )
      `)
      .eq('user_id', user.id)
      .order('watched_at', { ascending: false });

    if (!error && data) {
      setWatchedItems(data as any);
    }
  };

  const removeFromWatchlist = async (id: string, title: string) => {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', id);

    if (!error) {
      setWatchlistItems(watchlistItems.filter(item => item.id !== id));
      toast({
        title: "Removed from watchlist",
        description: `${title} has been removed`,
      });
    }
  };

  const removeFromWatched = async (id: string, title: string) => {
    const { error } = await supabase
      .from('watched')
      .delete()
      .eq('id', id);

    if (!error) {
      setWatchedItems(watchedItems.filter(item => item.id !== id));
      toast({
        title: "Removed from watched",
        description: `${title} has been removed`,
      });
    }
  };

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim() && activeTab === 'search') {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, activeTab]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    console.log('[WatchlistPage] Searching for:', searchQuery);
    try {
      const results = await search(searchQuery);
      console.log('[WatchlistPage] Search results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('[WatchlistPage] Search error:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Failed to search shows",
        variant: "destructive",
      });
    }
  };

  const addToWatchlist = async (show: any) => {
    if (!user) return;

    try {
      // First, ensure the content exists in our database
      const { data: existingContent } = await supabase
        .from('content')
        .select('id')
        .eq('external_id', (show.id || show.tvdb_id).toString())
        .eq('kind', 'show')
        .maybeSingle();

      let contentId = existingContent?.id;

      if (!contentId) {
        const { data: newContent, error: contentError } = await supabase
          .from('content')
          .insert({
            external_id: (show.id || show.tvdb_id).toString(),
            kind: 'show',
            title: show.name,
            poster_url: show.image || show.image_url,
            metadata: { overview: show.overview, year: show.year },
          })
          .select('id')
          .single();

        if (contentError) throw contentError;
        contentId = newContent.id;
      }

      // Add to watchlist
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          content_id: contentId,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already in watchlist",
            description: `${show.name} is already in your watchlist`,
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Added to watchlist",
          description: `${show.name} has been added to your watchlist`,
        });
        loadWatchlist();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to watchlist",
        variant: "destructive",
      });
    }
  };

  const addToWatched = async (show: any) => {
    if (!user) return;

    try {
      // First, ensure the content exists in our database
      const { data: existingContent } = await supabase
        .from('content')
        .select('id')
        .eq('external_id', (show.id || show.tvdb_id).toString())
        .eq('kind', 'show')
        .maybeSingle();

      let contentId = existingContent?.id;

      if (!contentId) {
        const { data: newContent, error: contentError } = await supabase
          .from('content')
          .insert({
            external_id: (show.id || show.tvdb_id).toString(),
            kind: 'show',
            title: show.name,
            poster_url: show.image || show.image_url,
            metadata: { overview: show.overview, year: show.year },
          })
          .select('id')
          .single();

        if (contentError) throw contentError;
        contentId = newContent.id;
      }

      // Add to watched
      const { error } = await supabase
        .from('watched')
        .insert({
          user_id: user.id,
          content_id: contentId,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already marked as watched",
            description: `${show.name} is already in your watched list`,
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Marked as watched",
          description: `${show.name} has been added to your watched list`,
        });
        loadWatched();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark as watched",
        variant: "destructive",
      });
    }
  };

  const isInWatchlist = (showId?: number | string) => {
    if (!showId) return false;
    return watchlistItems.some(item => item.content?.external_id === showId.toString());
  };

  const isInWatched = (showId?: number | string) => {
    if (!showId) return false;
    return watchedItems.some(item => item.content?.external_id === showId.toString());
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-muted-foreground">Please sign in to view your watchlist</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Bookmark className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold neon-glow">Watchlist & Watched</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="watched">Watched</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="watchlist" className="mt-6">
          {/* Search Bar for Watchlist */}
          <div className="flex gap-2 mb-6">
            <Input
              type="text"
              placeholder="Search and add shows to watchlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Search Results */}
          {searchLoading && searchQuery.trim() ? (
            <div className="flex items-center justify-center py-8 mb-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : searchResults.length > 0 && searchQuery.trim() ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {searchResults.map((show) => (
                <Card
                  key={show.tvdb_id}
                  className="overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => addToWatchlist(show)}
                >
                  {show.image_url ? (
                    <img
                      src={show.image_url}
                      alt={show.name}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
                      <span className="text-white font-bold text-center text-sm">
                        {show.name}
                      </span>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-2">
                      {show.name}
                    </h3>
                    {show.year && (
                      <p className="text-xs text-muted-foreground mt-1">{show.year}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : null}

          {watchlistItems.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">Your watchlist is empty</p>
              <Button onClick={() => setActiveTab('search')} className="btn-glow">
                Search Shows
              </Button>
            </Card>
          ) : (
            <WatchlistHierarchy
              items={watchlistItems}
              type="watchlist"
              onRemove={removeFromWatchlist}
            />
          )}
        </TabsContent>

        <TabsContent value="watched" className="mt-6">
          {/* Search Bar for Watched */}
          <div className="flex gap-2 mb-6">
            <Input
              type="text"
              placeholder="Search and add shows to watched..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Search Results */}
          {searchLoading && searchQuery.trim() ? (
            <div className="flex items-center justify-center py-8 mb-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : searchResults.length > 0 && searchQuery.trim() ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {searchResults.map((show) => (
                <Card
                  key={show.id || show.tvdb_id}
                  className="overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => addToWatched(show)}
                >
                  {show.image || show.image_url ? (
                    <img
                      src={show.image || show.image_url}
                      alt={show.name}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
                      <span className="text-white font-bold text-center text-sm">
                        {show.name}
                      </span>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-2">
                      {show.name}
                    </h3>
                    {show.year && (
                      <p className="text-xs text-muted-foreground mt-1">{show.year}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : null}

          {watchedItems.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't marked anything as watched yet</p>
              <Button onClick={() => setActiveTab('search')} className="btn-glow">
                Search Shows
              </Button>
            </Card>
          ) : (
            <WatchlistHierarchy
              items={watchedItems}
              type="watched"
              onRemove={removeFromWatched}
            />
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <div className="space-y-6">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search for shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {searchLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.map((show) => (
                  <Card
                    key={show.id || show.tvdb_id}
                    className="overflow-hidden hover:border-primary/50 transition-all"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => navigate(`/show/${show.id || show.tvdb_id}`)}
                    >
                      {show.image || show.image_url ? (
                        <img
                          src={show.image || show.image_url}
                          alt={show.name}
                          className="w-full aspect-[2/3] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
                          <span className="text-white font-bold text-center text-sm">
                            {show.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 
                        className="font-semibold text-sm line-clamp-2 mb-2 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/show/${show.id || show.tvdb_id}`)}
                      >
                        {show.name}
                      </h3>
                      {show.year && (
                        <p className="text-xs text-muted-foreground mb-2">{show.year}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant={isInWatchlist(show.id || show.tvdb_id) ? "secondary" : "outline"}
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToWatchlist(show);
                          }}
                          disabled={isInWatchlist(show.id || show.tvdb_id)}
                        >
                          {isInWatchlist(show.id || show.tvdb_id) ? (
                            <><Check className="h-3 w-3 mr-1" /> Listed</>
                          ) : (
                            <><Plus className="h-3 w-3 mr-1" /> List</>
                          )}
                        </Button>
                        <Button
                          variant={isInWatched(show.id || show.tvdb_id) ? "secondary" : "outline"}
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToWatched(show);
                          }}
                          disabled={isInWatched(show.id || show.tvdb_id)}
                        >
                          {isInWatched(show.id || show.tvdb_id) ? (
                            <><Check className="h-3 w-3 mr-1" /> Watched</>
                          ) : (
                            <><Plus className="h-3 w-3 mr-1" /> Watched</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : searchQuery && !searchLoading ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              </Card>
            ) : loadingBrowse ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold mb-4">Browse Shows</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {browseShows.map((show) => (
                    <Card
                      key={show.id || show.tvdb_id}
                      className="overflow-hidden hover:border-primary/50 transition-all"
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => navigate(`/show/${show.id || show.tvdb_id}`)}
                      >
                        {show.image || show.image_url ? (
                          <img
                            src={show.image || show.image_url}
                            alt={show.name}
                            className="w-full aspect-[2/3] object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
                            <span className="text-white font-bold text-center text-sm">
                              {show.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 
                          className="font-semibold text-sm line-clamp-2 mb-2 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/show/${show.id || show.tvdb_id}`)}
                        >
                          {show.name}
                        </h3>
                        {show.year && (
                          <p className="text-xs text-muted-foreground mb-2">{show.year}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant={isInWatchlist(show.id || show.tvdb_id) ? "secondary" : "outline"}
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToWatchlist(show);
                            }}
                            disabled={isInWatchlist(show.id || show.tvdb_id)}
                          >
                            {isInWatchlist(show.id || show.tvdb_id) ? (
                              <><Check className="h-3 w-3 mr-1" /> Listed</>
                            ) : (
                              <><Plus className="h-3 w-3 mr-1" /> List</>
                            )}
                          </Button>
                          <Button
                            variant={isInWatched(show.id || show.tvdb_id) ? "secondary" : "outline"}
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToWatched(show);
                            }}
                            disabled={isInWatched(show.id || show.tvdb_id)}
                          >
                            {isInWatched(show.id || show.tvdb_id) ? (
                              <><Check className="h-3 w-3 mr-1" /> Watched</>
                            ) : (
                              <><Plus className="h-3 w-3 mr-1" /> Watched</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {hasMore && !searchQuery.trim() && (
                  <div ref={observerTarget} className="py-4 text-center">
                    {loadingBrowse && <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}