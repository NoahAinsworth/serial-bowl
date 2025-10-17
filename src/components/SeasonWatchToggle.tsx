import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FEATURE_WATCH_AND_BADGES } from '@/lib/featureFlags';

interface SeasonWatchToggleProps {
  showId: number;
  seasonNumber: number;
  episodes: Array<{ number: number; id: number; runtime?: number }>;
  allWatched: boolean;
  onToggle?: () => void;
}

export function SeasonWatchToggle({
  showId,
  seasonNumber,
  episodes,
  allWatched,
  onToggle,
}: SeasonWatchToggleProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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

    try {
      const action = allWatched ? 'unwatchSeason' : 'watchSeason';
      const response = await supabase.functions.invoke('watch-episodes', {
        body: {
          action,
          showId,
          seasonNumber,
          episodes,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: allWatched ? "Season unwatched" : "Season watched",
        description: `Season ${seasonNumber} marked as ${allWatched ? 'unwatched' : 'watched'}`,
      });
      
      onToggle?.();
    } catch (error) {
      console.error('Error toggling season watch status:', error);
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
      variant={allWatched ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="min-w-32"
    >
      {allWatched && <Check className="h-3 w-3 mr-1" />}
      {allWatched ? "Unwatch Season" : "Mark Season Watched"}
    </Button>
  );
}
