import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FEATURE_WATCH_AND_BADGES } from '@/lib/featureFlags';

interface EpisodeCheckboxProps {
  episodeId: string;
  showId: string;
  seasonNumber: number;
  episodeNumber: number;
  runtimeMinutes?: number;
}

export function EpisodeCheckbox({ episodeId, showId, seasonNumber, episodeNumber, runtimeMinutes = 45 }: EpisodeCheckboxProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [watched, setWatched] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!FEATURE_WATCH_AND_BADGES) return null;

  useEffect(() => {
    checkWatched();
  }, [episodeId, user]);

  const checkWatched = async () => {
    if (!user) return;

    try {
      const tvdbId = `${showId}:${seasonNumber}:${episodeNumber}`;
      const { data, error } = await supabase
        .from('watched_episodes')
        .select('id')
        .eq('user_id', user.id)
        .eq('show_id', parseInt(showId))
        .eq('season_number', seasonNumber)
        .eq('episode_number', episodeNumber)
        .maybeSingle();

      if (error) {
        console.error('Error checking watched status:', error);
        return;
      }

      setWatched(!!data);
    } catch (error) {
      console.error('Error in checkWatched:', error);
    }
  };

  const toggleWatched = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to track episodes",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const previousWatched = watched;
    setWatched(!watched); // Optimistic UI

    try {
      const tvdbId = `${showId}:${seasonNumber}:${episodeNumber}`;
      const action = previousWatched ? 'unwatch' : 'watch';
      
      console.log('Calling watch-episodes function:', {
        action,
        showId: parseInt(showId),
        seasonNumber,
        episodeNumber,
        tvdbId,
        runtimeMinutes
      });

      const { data, error } = await supabase.functions.invoke('watch-episodes', {
        body: {
          action,
          showId: parseInt(showId),
          seasonNumber,
          episodeNumber,
          tvdbId,
          runtimeMinutes,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Edge function response:', data);

      toast({
        title: previousWatched ? "Unmarked as watched" : "Marked as watched",
        description: previousWatched ? "Episode removed from watched list" : "Episode added to watched list",
      });
    } catch (error) {
      console.error('Error toggling watch status:', error);
      setWatched(previousWatched); // Revert on error
      toast({
        title: "Error",
        description: "Failed to update watch status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleWatched}
      disabled={loading}
      className="p-1 h-8 w-8"
    >
      {watched ? (
        <CheckCircle2 className="h-5 w-5 text-primary" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground" />
      )}
    </Button>
  );
}