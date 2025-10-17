import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface WatchedButtonProps {
  contentId: string; // UUID from content table
  showTitle: string;
}

export function WatchedButton({ contentId, showTitle }: WatchedButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const flags = useFeatureFlags();
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastBulkToggle, setLastBulkToggle] = useState(0);

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

    // Check cooldown for bulk operations (10 seconds)
    const now = Date.now();
    if (now - lastBulkToggle < 10000 && lastBulkToggle > 0) {
      toast({
        title: "Please wait",
        description: "Too many requests. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
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
        // Check content type to handle season/show marking
        const { data: content } = await supabase
          .from('content')
          .select('kind, external_id')
          .eq('id', contentId)
          .single();

        let episodesAdded = 0;

        // If marking a season, insert all missing episodes for that season
        if (content?.kind === 'season') {
          setLastBulkToggle(Date.now());
          
          // Extract show ID and season number from external_id (format: showId:seasonNum)
          const parts = content.external_id.split(':');
          const showId = parts[0];
          const seasonNumber = parseInt(parts[1]);
          
          const { data: result } = await supabase.rpc('mark_season_episodes_watched', {
            p_user_id: user.id,
            p_show_id: showId,
            p_season_number: seasonNumber
          });
          
          episodesAdded = result || 0;
        }
        
        // If marking a show, insert all missing episodes for entire show
        if (content?.kind === 'show') {
          setLastBulkToggle(Date.now());
          
          const { data: result } = await supabase.rpc('mark_show_episodes_watched', {
            p_user_id: user.id,
            p_show_id: content.external_id
          });
          
          episodesAdded = result || 0;
        }

        // For individual episodes or after bulk marking, insert/update the watch entry
        const { error } = await supabase
          .from('watched')
          .insert({
            user_id: user.id,
            content_id: contentId,
            watched_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error) {
          setIsWatched(true);
          
          // Show appropriate toast based on what was marked
          if (flags.BINGE_POINTS) {
            if (content?.kind === 'season') {
              const { data: seasonCounts } = await supabase
                .from('season_episode_counts')
                .select('episode_count')
                .eq('external_id', content.external_id)
                .single();
              
              const episodeCount = seasonCounts?.episode_count || 0;
              const bonus = episodeCount >= 14 ? 15 : episodeCount >= 7 ? 10 : 5;
              
              toast({
                title: "Season complete!",
                description: episodesAdded > 0 
                  ? `+${episodesAdded} episodes marked • +${bonus} bonus = ${episodesAdded + bonus} Binge Points! 🎉`
                  : `Season already complete • +${bonus} Binge Points! 🎉`,
              });
            } else if (content?.kind === 'show') {
              toast({
                title: "Show complete!",
                description: episodesAdded > 0
                  ? `+${episodesAdded} episodes marked • +100 bonus = ${episodesAdded + 100} Binge Points! 🏆`
                  : `Show already complete • +100 Binge Points! 🏆`,
              });
            } else {
              toast({
                title: "Marked as watched",
                description: `${showTitle} • +1 Binge Point`,
              });
            }
          } else {
            toast({
              title: "Marked as watched",
              description: `${showTitle} added to watched list`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error toggling watched:', error);
      toast({
        title: "Error",
        description: "Failed to update watched status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isWatched ? "default" : "outline"}
      onClick={toggleWatched}
      disabled={loading}
      size="sm"
      className="flex-1 text-[9px] xs:text-xs px-1.5 xs:px-3 py-1"
    >
      {loading ? (
        <>
          <Loader2 className="h-3 w-3 mr-0.5 xs:mr-1 animate-spin" />
          <span className="hidden xs:inline">{isWatched ? 'Unwatching...' : 'Marking...'}</span>
          <span className="xs:hidden">...</span>
        </>
      ) : isWatched ? (
        <>
          <Eye className="h-3 w-3 mr-0.5 xs:mr-1" />
          <span className="hidden xs:inline">Watched</span>
          <span className="xs:hidden">Seen</span>
        </>
      ) : (
        <>
          <EyeOff className="h-3 w-3 mr-0.5 xs:mr-1" />
          <span className="hidden xs:inline">Watched</span>
          <span className="xs:hidden">Seen</span>
        </>
      )}
    </Button>
  );
}
