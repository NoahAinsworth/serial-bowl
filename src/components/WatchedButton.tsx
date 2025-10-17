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

        // For seasons: delete individual episode watches
        if (content?.kind === 'season') {
          // Get episode content IDs to delete
          const { data: episodeContent } = await supabase
            .from('content')
            .select('id')
            .eq('kind', 'episode')
            .like('external_id', `${content.external_id}:%`);
          
          if (episodeContent && episodeContent.length > 0) {
            const episodeIds = episodeContent.map(c => c.id);
            await supabase
              .from('watched')
              .delete()
              .eq('user_id', user.id)
              .in('content_id', episodeIds);
          }
        }
        
        // For shows: delete individual episode AND season watches
        if (content?.kind === 'show') {
          // Get episode and season content IDs to delete
          const { data: childContent } = await supabase
            .from('content')
            .select('id')
            .or(`and(kind.eq.episode,external_id.like.${content.external_id}:%),and(kind.eq.season,external_id.like.${content.external_id}:%)`);
          
          if (childContent && childContent.length > 0) {
            const childIds = childContent.map(c => c.id);
            await supabase
              .from('watched')
              .delete()
              .eq('user_id', user.id)
              .in('content_id', childIds);
          }
        }

        // Insert the season/show/episode watch entry itself
        const { error } = await supabase
          .from('watched')
          .insert({
            user_id: user.id,
            content_id: contentId,
            watched_at: new Date().toISOString(),
          });

        if (!error) {
          setIsWatched(true);
          
          // DEBUG: Log content object
          console.log('🔵 [WATCHED] Content object:', content);
          console.log('🔵 [WATCHED] Content kind:', content?.kind);
          console.log('🔵 [WATCHED] Content external_id:', content?.external_id);
          
          // Populate counts for shows and seasons before calculating points
          const shouldPopulateCounts = content?.kind === 'show' || content?.kind === 'season';
          console.log('🔵 [WATCHED] Should populate counts?', shouldPopulateCounts);
          
          if (shouldPopulateCounts) {
            console.log(`🟢 [WATCHED] Populating counts for ${content.kind}: ${content.external_id}`);
            
            try {
              const { data: edgeFnData, error: countError } = await supabase.functions.invoke('populate-content-counts', {
                body: {
                  external_id: content.external_id,
                  kind: content.kind
                }
              });
              
              if (countError) {
                console.error('🔴 [WATCHED] Error populating counts:', countError);
                toast({
                  title: "Warning",
                  description: `Could not fetch episode counts: ${countError.message}`,
                  variant: "destructive"
                });
              } else {
                console.log('🟢 [WATCHED] Edge function SUCCESS:', edgeFnData);
              }
            } catch (edgeFnError) {
              console.error('🔴 [WATCHED] Edge function exception:', edgeFnError);
            }
          } else {
            console.log('⚪ [WATCHED] Skipping count population - not a show or season');
          }
          
          // Manually trigger points recalculation
          await supabase.rpc('update_user_binge_points', {
            p_user_id: user.id
          });
          
          // Fetch updated points for display
          const { data: pointsResult } = await supabase.rpc('calculate_binge_points', {
            p_user_id: user.id
          });
          
          const pointsData = pointsResult?.[0];
          
          // Show appropriate toast based on what was marked
          if (flags.BINGE_POINTS && pointsData && content) {
            if (content.kind === 'season') {
              // Get season episode count
              const { data: seasonCount } = await supabase
                .from('season_episode_counts')
                .select('episode_count')
                .eq('external_id', content.external_id)
                .single();
              
              const episodePoints = seasonCount?.episode_count || 0;
              const seasonBonus = episodePoints >= 14 ? 15 : episodePoints >= 7 ? 10 : 5;
              const totalEarned = episodePoints + seasonBonus;
              
              toast({
                title: "Season complete!",
                description: `${episodePoints} episodes + ${seasonBonus} bonus = ${totalEarned} Binge Points! 🎉`,
              });
            } else if (content.kind === 'show') {
              // Get show episode count
              const { data: showCount } = await supabase
                .from('show_season_counts')
                .select('total_episode_count, season_count')
                .eq('external_id', content.external_id)
                .single();
              
              const episodePoints = showCount?.total_episode_count || 0;
              const seasonCount = showCount?.season_count || 0;
              // Estimate season bonuses (assume average 10 points per season)
              const seasonBonuses = seasonCount * 10;
              const showBonus = 100;
              const totalEarned = episodePoints + seasonBonuses + showBonus;
              
              toast({
                title: "Show complete!",
                description: `${episodePoints} episodes + ${seasonBonuses} season bonuses + ${showBonus} show bonus = ${totalEarned} Binge Points! 🏆`,
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
