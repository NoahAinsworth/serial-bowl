import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FEATURE_WATCH_AND_BADGES } from '@/lib/featureFlags';

interface EpisodeWatchToggleProps {
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
  tvdbId: string;
  runtimeMinutes: number;
  isWatched: boolean;
  onToggle?: () => void;
}

export function EpisodeWatchToggle({
  showId,
  seasonNumber,
  episodeNumber,
  tvdbId,
  runtimeMinutes,
  isWatched,
  onToggle,
}: EpisodeWatchToggleProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [watched, setWatched] = useState(isWatched);

  if (!FEATURE_WATCH_AND_BADGES) return null;

  const handleToggle = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to track watched episodes",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setWatched(!watched); // Optimistic UI

    try {
      const action = watched ? 'unwatch' : 'watch';
      const response = await supabase.functions.invoke('watch-episodes', {
        body: {
          action,
          showId,
          seasonNumber,
          episodeNumber,
          tvdbId,
          runtimeMinutes,
        },
      });

      if (response.error) throw response.error;
      
      onToggle?.();
    } catch (error) {
      console.error('Error toggling episode watch status:', error);
      setWatched(watched); // Revert on error
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
      variant={watched ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="min-w-24"
      aria-label={watched ? "Mark as unwatched" : "Mark as watched"}
    >
      {watched && <Check className="h-3 w-3 mr-1" />}
      {watched ? "Watched" : "Unwatched"}
    </Button>
  );
}
