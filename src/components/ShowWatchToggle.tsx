import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FEATURE_WATCH_AND_BADGES } from '@/lib/featureFlags';

interface ShowWatchToggleProps {
  showId: number;
  seasons: Array<{
    number: number;
    episodes: Array<{ number: number; id: number; runtime?: number }>;
  }>;
  allWatched: boolean;
  onToggle?: () => void;
}

export function ShowWatchToggle({
  showId,
  seasons,
  allWatched,
  onToggle,
}: ShowWatchToggleProps) {
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
      const action = allWatched ? 'unwatchShow' : 'watchShow';
      const response = await supabase.functions.invoke('watch-episodes', {
        body: {
          action,
          showId,
          seasons,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: allWatched ? "Show unwatched" : "Show watched",
        description: `All episodes marked as ${allWatched ? 'unwatched' : 'watched'}`,
      });
      
      onToggle?.();
    } catch (error) {
      console.error('Error toggling show watch status:', error);
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
      size="default"
      onClick={handleToggle}
      disabled={loading}
    >
      {allWatched && <Check className="h-4 w-4 mr-2" />}
      {allWatched ? "Unwatch Show" : "Mark Show Watched"}
    </Button>
  );
}
