import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WatchlistButtonProps {
  contentId: string; // UUID from content table
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

    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .maybeSingle();

      if (error) {
        console.error('Error checking watchlist status:', error);
        return;
      }

      setIsInWatchlist(!!data);
    } catch (e) {
      console.error('Exception checking watchlist status:', e);
    }
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

      if (error) {
        console.error('Error removing from watchlist:', error);
        toast({
          title: "Error",
          description: "Failed to remove from watchlist",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setIsInWatchlist(false);
      toast({
        title: "Removed from watchlist",
        description: `${showTitle} removed from your watchlist`,
      });
    } else {
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          content_id: contentId,
        });

      if (error) {
        console.error('Error adding to watchlist:', error);
        toast({
          title: "Error",
          description: "Failed to add to watchlist",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setIsInWatchlist(true);
      toast({
        title: "Added to watchlist",
        description: `${showTitle} added to your watchlist`,
      });
    }

    setLoading(false);
  };

  return (
    <Button
      variant={isInWatchlist ? "default" : "outline"}
      onClick={toggleWatchlist}
      disabled={loading}
      className="w-full h-auto py-3 flex items-center justify-center gap-2 text-sm rounded-full border-2"
    >
      {isInWatchlist ? (
        <>
          <BookmarkCheck className="h-4 w-4" />
          <span className="font-semibold">List</span>
        </>
      ) : (
        <>
          <BookmarkPlus className="h-4 w-4" />
          <span className="font-semibold">List</span>
        </>
      )}
    </Button>
  );
}