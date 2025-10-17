import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WatchedButtonProps {
  contentId: string; // UUID from content table
  showTitle: string;
  showId?: string; // TVDB show ID for tracking episodes
}

export function WatchedButton({ contentId, showTitle, showId }: WatchedButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingEpisodes, setProcessingEpisodes] = useState(false);

  useEffect(() => {
    checkWatched();
  }, [contentId, user]);

  const checkWatched = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('watched')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .single();

    setIsWatched(!!data);
  };

  const toggleWatched = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to track watched shows",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (isWatched) {
      const { error } = await supabase
        .from('watched')
        .delete()
        .eq('user_id', user.id)
        .eq('content_id', contentId);

      if (!error) {
        setIsWatched(false);
        toast({
          title: "Removed from watched",
          description: `${showTitle} marked as unwatched`,
        });
      }
    } else {
      const { error } = await supabase
        .from('watched')
        .insert({
          user_id: user.id,
          content_id: contentId,
          watched_at: new Date().toISOString(),
        });

      if (!error) {
        setIsWatched(true);
        
        // If showId is provided, mark all episodes as watched
        if (showId) {
          setProcessingEpisodes(true);
          try {
            const { data, error: episodeError } = await supabase.functions.invoke('mark-show-watched', {
              body: { showId },
            });

            if (episodeError) throw episodeError;

            toast({
              title: "Show marked as watched!",
              description: `${showTitle} and all ${data.episodesMarked} episodes marked as watched. Total watch time: ${Math.floor(data.totalMinutes / 60)}h ${data.totalMinutes % 60}m`,
            });
          } catch (err) {
            console.error('Error marking episodes:', err);
            toast({
              title: "Marked as watched",
              description: `${showTitle} added to watched list (episode tracking failed)`,
            });
          } finally {
            setProcessingEpisodes(false);
          }
        } else {
          toast({
            title: "Marked as watched",
            description: `${showTitle} added to watched list`,
          });
        }
      }
    }

    setLoading(false);
  };

  return (
    <Button
      variant={isWatched ? "default" : "outline"}
      onClick={toggleWatched}
      disabled={loading || processingEpisodes}
      size="sm"
      className="flex-1 text-xs sm:text-sm"
    >
      {processingEpisodes ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
          <span className="hidden xs:inline">Processing...</span>
          <span className="xs:hidden">...</span>
        </>
      ) : isWatched ? (
        <>
          <Eye className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Watched</span>
          <span className="xs:hidden">Seen</span>
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Mark as Watched</span>
          <span className="xs:hidden">Watch</span>
        </>
      )}
    </Button>
  );
}