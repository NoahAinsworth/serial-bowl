import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { BookmarkPlus, Eye, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SmartWatchButtonProps {
  contentId: string;
  showTitle: string;
}

export function SmartWatchButton({ contentId, showTitle }: SmartWatchButtonProps) {
  const { user } = useAuth();
  const [isWatched, setIsWatched] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [contentId, user]);

  const checkStatus = async () => {
    if (!user) return;

    const [watchedRes, watchlistRes] = await Promise.all([
      supabase
        .from('watched')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .maybeSingle(),
      supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .maybeSingle()
    ]);

    setIsWatched(!!watchedRes.data);
    setIsInWatchlist(!!watchlistRes.data);
  };

  const handleClick = async () => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    setLoading(true);

    if (isWatched) {
      // Remove from watched
      await supabase
        .from('watched')
        .delete()
        .eq('user_id', user.id)
        .eq('content_id', contentId);
      
      setIsWatched(false);
      toast.success('Unmarked as watched');
    } else if (isInWatchlist) {
      // Move from watchlist to watched
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('content_id', contentId);

      await supabase
        .from('watched')
        .insert({
          user_id: user.id,
          content_id: contentId,
        });

      setIsInWatchlist(false);
      setIsWatched(true);
      
      // Increment Show Score by 1 (NO BINGE POINTS from here)
      await supabase.rpc('increment_show_score', {
        p_user_id: user.id,
        p_count: 1
      });
      
      toast.success('✅ Marked as watched!');
    } else {
      // Add to watchlist
      await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          content_id: contentId,
        });

      setIsInWatchlist(true);
      toast.success('Added to list');
    }

    setLoading(false);
  };

  if (!user) return null;

  return (
    <Button
      variant={isWatched ? "default" : isInWatchlist ? "secondary" : "outline"}
      onClick={handleClick}
      disabled={loading}
      size="sm"
      className="min-w-[44px] min-h-[44px]"
      style={{ touchAction: 'manipulation' }}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isWatched ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          Seen
        </>
      ) : isInWatchlist ? (
        <>
          <Eye className="h-4 w-4 mr-1" />
          List
        </>
      ) : (
        <>
          <BookmarkPlus className="h-4 w-4 mr-1" />
          + Add to List
        </>
      )}
    </Button>
  );
}
