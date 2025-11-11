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
    kind: string;
    metadata?: {
      overview?: string;
    };
  };
  watched_at: string;
}

const getContentUrl = (externalId: string, kind: string): string => {
  const parts = externalId.split(':');
  
  if (kind === 'show') {
    return `/show/${parts[0]}`;
  } else if (kind === 'season') {
    return `/show/${parts[0]}/season/${parts[1]}`;
  } else if (kind === 'episode') {
    return `/show/${parts[0]}/season/${parts[1]}/episode/${parts[2]}`;
  }
  
  return `/show/${parts[0]}`;
};

const formatContentTitle = (item: WatchedItem): string => {
  const { title, kind, external_id, metadata } = item.content;
  const parts = external_id.split(':');
  
  // For shows, return title as-is
  if (kind === 'show') {
    return title;
  }
  
  // Check if we already have a properly formatted title
  if (title.includes(' - Season ') || title.includes(' - S')) {
    return title;
  }
  
  // Extract show name from metadata if available
  const showName = (metadata as any)?.show_name;
  
  if (kind === 'season' && parts.length >= 2) {
    // If metadata has show_name, use it
    if (showName) {
      return `${showName} - Season ${parts[1]}`;
    }
    // If title is just "Season X", we can't determine show name without API call
    // Return as-is to avoid "Season X - Season X"
    if (title.startsWith('Season ')) {
      return title;
    }
    // Title is the show name, format it
    return `${title} - Season ${parts[1]}`;
  }
  
  if (kind === 'episode' && parts.length >= 3) {
    if (showName) {
      return `${showName} - S${parts[1]}E${parts[2]}`;
    }
    if (title.startsWith('Season ') || title.startsWith('Episode ')) {
      return title;
    }
    return `${title} - S${parts[1]}E${parts[2]}`;
  }
  
  return title;
};

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
          kind,
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
            external_src: 'thetvdb',
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
        return;
      }

      let retries = 2;
      let lastError = null;
      
      for (let i = 0; i < retries; i++) {
        try {
          const { data, error: countError } = await supabase.functions.invoke('populate-content-counts', {
            body: {
              external_id: show.id.toString(),
              kind: 'show'
            }
          });
          
          if (!countError) {
            break;
          }
          
          lastError = countError;
        } catch (e) {
          lastError = e;
        }
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      await supabase.rpc('update_user_binge_points', {
        p_user_id: user.id
      });
      
      // Fetch updated points for display
      const { data: pointsResult } = await supabase.rpc('calculate_binge_points', {
        p_user_id: user.id
      });
      
      const pointsData = pointsResult?.[0];
      
      // Get show episode count
      const { data: showCount } = await supabase
        .from('show_season_counts')
        .select('total_episode_count, season_count')
        .eq('external_id', show.id.toString())
        .maybeSingle();
      
      const episodePoints = showCount?.total_episode_count || 0;
      const seasonCount = showCount?.season_count || 0;
      const seasonBonuses = seasonCount * 10;
      const showBonus = 100;
      const totalEarned = episodePoints + seasonBonuses + showBonus;
      
      toast({
        title: "Show complete!",
        description: `${episodePoints} episodes + ${seasonBonuses} season bonuses + ${showBonus} show bonus = ${totalEarned} Binge Points! 🏆`,
      });

      loadWatched();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding to watched:', error);
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
                    onClick={() => navigate(getContentUrl(item.content.external_id, item.content.kind))}
                  />
                ) : (
                  <div 
                    className="w-24 h-36 bg-gradient-to-br from-primary to-secondary flex items-center justify-center rounded cursor-pointer"
                    onClick={() => navigate(getContentUrl(item.content.external_id, item.content.kind))}
                  >
                    <span className="text-white font-bold text-center text-xs px-2">
                      {item.content.title}
                    </span>
                  </div>
                )}
                
                <div className="flex-1 flex flex-col">
                  <h3 
                    className="font-bold mb-1 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(getContentUrl(item.content.external_id, item.content.kind))}
                  >
                    {formatContentTitle(item)}
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