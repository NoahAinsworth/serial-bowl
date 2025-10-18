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

    try {
      const { data, error } = await supabase
        .from('watched')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .maybeSingle();

      if (error) {
        console.error('Error checking watched status:', error);
        return;
      }

      setIsWatched(!!data);
    } catch (e) {
      console.error('Exception checking watched status:', e);
    }
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

        if (error) {
          console.error('Error removing from watched:', error);
          toast({
            title: "Error",
            description: "Failed to remove from watched",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setIsWatched(false);
        toast({
          title: "Removed from watched",
          description: `${showTitle} marked as unwatched`,
        });
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

        if (error) {
          console.error('Error adding to watched:', error);
          toast({
            title: "Error",
            description: "Failed to add to watched",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setIsWatched(true);
        
        // Populate counts for shows and seasons via edge function with retry logic
        if (content?.kind === 'show' || content?.kind === 'season') {
          console.log('🚀 Starting count population...');
          console.log('📊 Content:', { kind: content.kind, external_id: content.external_id });
          
          let retries = 2;
          let lastError = null;
          
          for (let i = 0; i < retries; i++) {
            try {
              console.log(`📡 Invoking edge function (attempt ${i + 1}/${retries})...`);
              
              const { data, error: countError } = await supabase.functions.invoke('populate-content-counts', {
                body: {
                  external_id: content.external_id,
                  kind: content.kind
                }
              });
              
              console.log('📥 Edge function response:', { data, error: countError });
              
              if (!countError) {
                console.log('🎉 Counts populated successfully!');
                break; // Success, exit retry loop
              }
              
              lastError = countError;
              console.warn(`⚠️ Attempt ${i + 1} failed:`, countError);
            } catch (e) {
              lastError = e;
              console.error(`💥 Attempt ${i + 1} exception:`, e);
            }
            
            if (i < retries - 1) {
              console.log('🔄 Retrying in 1 second...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (lastError) {
            console.error('❌ All attempts failed:', lastError);
            toast({
              title: "Warning",
              description: "Could not fetch episode counts. Your points may be inaccurate.",
              variant: "destructive"
            });
          }
        }
        
        // Recalculate binge points
        console.log('🔄 Updating binge points...');
        await supabase.rpc('update_user_binge_points', {
          p_user_id: user.id
        });
        console.log('✅ Binge points updated');
        
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
              .maybeSingle();
            
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
              .maybeSingle();
            
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
