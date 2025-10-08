import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Bookmark, Trash2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTVDB } from '@/hooks/useTVDB';

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

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    await Promise.all([loadWatchlist(), loadWatched()]);
    setLoading(false);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const results = await search(searchQuery);
    setSearchResults(results);
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
          {watchlistItems.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">Your watchlist is empty</p>
              <Button onClick={() => setActiveTab('search')} className="btn-glow">
                Search Shows
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watchlistItems.map((item) => (
                <Card
                  key={item.id}
                  className="p-4 hover:border-primary/50 transition-all hover-scale"
                >
                  <div className="flex gap-4">
                    {item.content.poster_url ? (
                      <img
                        src={item.content.poster_url}
                        alt={item.content.title}
                        className="w-24 h-36 object-cover rounded cursor-pointer"
                        onClick={() => navigate(`/show/${item.content.external_id}`)}
                      />
                    ) : (
                      <div 
                        className="w-24 h-36 bg-gradient-to-br from-primary to-secondary flex items-center justify-center rounded cursor-pointer"
                        onClick={() => navigate(`/show/${item.content.external_id}`)}
                      >
                        <span className="text-white font-bold text-center text-xs px-2">
                          {item.content.title}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1 flex flex-col">
                      <h3 
                        className="font-bold mb-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/show/${item.content.external_id}`)}
                      >
                        {item.content.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2 flex-1">
                        {item.content.metadata?.overview || 'No description available'}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          Added {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromWatchlist(item.id, item.content.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="watched" className="mt-6">
          {watchedItems.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't marked anything as watched yet</p>
              <Button onClick={() => setActiveTab('search')} className="btn-glow">
                Search Shows
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watchedItems.map((item) => (
                <Card
                  key={item.id}
                  className="p-4 hover:border-primary/50 transition-all hover-scale"
                >
                  <div className="flex gap-4">
                    {item.content.poster_url ? (
                      <img
                        src={item.content.poster_url}
                        alt={item.content.title}
                        className="w-24 h-36 object-cover rounded cursor-pointer"
                        onClick={() => navigate(`/show/${item.content.external_id}`)}
                      />
                    ) : (
                      <div 
                        className="w-24 h-36 bg-gradient-to-br from-primary to-secondary flex items-center justify-center rounded cursor-pointer"
                        onClick={() => navigate(`/show/${item.content.external_id}`)}
                      >
                        <span className="text-white font-bold text-center text-xs px-2">
                          {item.content.title}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1 flex flex-col">
                      <h3 
                        className="font-bold mb-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/show/${item.content.external_id}`)}
                      >
                        {item.content.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2 flex-1">
                        {item.content.metadata?.overview || 'No description available'}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          Watched {new Date(item.watched_at).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromWatched(item.id, item.content.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
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
                    key={show.tvdb_id}
                    className="overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover-scale"
                    onClick={() => navigate(`/show/${show.tvdb_id}`)}
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
                      <h3 className="font-semibold text-sm line-clamp-2">{show.name}</h3>
                      {show.year && (
                        <p className="text-xs text-muted-foreground mt-1">{show.year}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : searchQuery && !searchLoading ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              </Card>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}