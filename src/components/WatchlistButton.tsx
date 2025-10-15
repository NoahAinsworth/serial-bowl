import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WatchlistButtonProps {
  contentId: string;
  showTitle: string;
}

export function WatchlistButton({ contentId, showTitle }: WatchlistButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWatchlist();
  }, [contentId, user]);

  const checkWatchlist = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .single();

    setIsInWatchlist(!!data);
  };

  const toggleWatchlist = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to manage your watchlist",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (isInWatchlist) {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('content_id', contentId);

      if (!error) {
        setIsInWatchlist(false);
        toast({
          title: "Removed from watchlist",
          description: `${showTitle} removed from your watchlist`,
        });
      }
    } else {
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          content_id: contentId,
        });

      if (!error) {
        setIsInWatchlist(true);
        toast({
          title: "Added to watchlist",
          description: `${showTitle} added to your watchlist`,
        });
      }
    }

    setLoading(false);
  };

  return (
    <Button
      variant={isInWatchlist ? "default" : "outline"}
      onClick={toggleWatchlist}
      disabled={loading}
    >
      {isInWatchlist ? (
        <>
          <BookmarkCheck className="h-4 w-4 mr-2" />
          In Watchlist
        </>
      ) : (
        <>
          <BookmarkPlus className="h-4 w-4 mr-2" />
          Add to Watchlist
        </>
      )}
    </Button>
  );
}