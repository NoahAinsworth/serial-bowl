import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Eye, Trash2, Search, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useTVDB } from '@/hooks/useTVDB';

interface WatchedItem {
  id: string;
  content: {
    id: string;
    title: string;
    poster_url?: string;
    external_id: string;
    metadata?: {
      overview?: string;
    };
  };
  watched_at: string;
}

export default function WatchedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { search: searchTVDB } = useTVDB();
  const [items, setItems] = useState<WatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingShows, setSearchingShows] = useState(false);

  useEffect(() => {
    if (user) {
      loadWatched();
    }
  }, [user]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        searchShows(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

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
      setItems(data as any);
    }

    setLoading(false);
  };

  const searchShows = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingShows(true);
    try {
      const results = await searchTVDB(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching shows:', error);
    }
    setSearchingShows(false);
  };

  const addToWatched = async (show: any) => {
    if (!user) return;

    try {
      const { data: existingContent } = await supabase
        .from('content')
        .select('id')
        .eq('external_id', show.id.toString())
        .eq('kind', 'show')
        .maybeSingle();

      let contentId = existingContent?.id;

      if (!contentId) {
        const { data: newContent, error: contentError } = await supabase
          .from('content')
          .insert({
            external_id: show.id.toString(),
            kind: 'show',
            title: show.name,
            poster_url: show.image,
            metadata: { overview: show.overview },
          })
          .select('id')
          .single();

        if (contentError) throw contentError;
        contentId = newContent.id;
      }

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
          description: `${show.name} has been added`,
        });
        loadWatched();
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add show",
        variant: "destructive",
      });
    }
  };

  const removeFromWatched = async (id: string, title: string) => {
    const { error } = await supabase
      .from('watched')
      .delete()
      .eq('id', id);

    if (!error) {
      setItems(items.filter(item => item.id !== id));
      toast({
        title: "Removed from watched",
        description: `${title} has been unmarked`,
      });
    }
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-muted-foreground">Please sign in to view your watched shows</p>
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
        <Eye className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold neon-glow">Watched Shows</h1>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search and add shows to watched..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Search Results */}
      {searchingShows ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {searchResults.map((show) => (
            <Card
              key={show.id}
              className="overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => addToWatched(show)}
            >
              {show.image ? (
                <img
                  src={show.image}
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

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">You haven't marked any shows as watched yet</p>
          <Button onClick={() => navigate('/search')} className="btn-glow">
            Discover Shows
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
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
                  {item.content.metadata?.overview && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2 flex-1">
                      {item.content.metadata.overview}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      Watched {formatDistanceToNow(new Date(item.watched_at), { addSuffix: true })}
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
    </div>
  );
}