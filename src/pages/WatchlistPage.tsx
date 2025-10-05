import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Bookmark, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WatchlistItem {
  id: string;
  content: {
    id: string;
    title: string;
    poster_url?: string;
    external_id: string;
    overview?: string;
  };
  added_at: string;
}

export default function WatchlistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWatchlist();
    }
  }, [user]);

  const loadWatchlist = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('watchlist')
      .select(`
        id,
        added_at,
        content (
          id,
          title,
          poster_url,
          external_id,
          overview
        )
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (!error && data) {
      setItems(data as any);
    }

    setLoading(false);
  };

  const removeFromWatchlist = async (id: string, title: string) => {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', id);

    if (!error) {
      setItems(items.filter(item => item.id !== id));
      toast({
        title: "Removed from watchlist",
        description: `${title} has been removed`,
      });
    }
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
        <h1 className="text-3xl font-bold neon-glow">My Watchlist</h1>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">Your watchlist is empty</p>
          <Button onClick={() => navigate('/search')} className="btn-glow">
            Find Shows to Watch
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
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2 flex-1">
                    {item.content.overview || 'No description available'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      Added {new Date(item.added_at).toLocaleDateString()}
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
    </div>
  );
}