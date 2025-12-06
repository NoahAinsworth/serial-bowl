import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WatchedButtonProps {
  contentId: string; // UUID from content table
  showTitle: string;
}

export function WatchedButton({ contentId, showTitle }: WatchedButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
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
        // Get content details first for binge point reversal
        const { data: content } = await supabase
          .from('content')
          .select('kind, external_id')
          .eq('id', contentId)
          .single();
        
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

        // Reverse binge points for this show
        if (content?.external_id) {
          const showId = content.external_id.split(':')[0];
          await supabase.rpc('reverse_binge_points_for_show', {
            p_user_id: user.id,
            p_show_id: showId
          });
          // Recalculate show_score after removal
          await supabase.rpc('recalculate_user_show_score', { p_user_id: user.id });
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
          .select('kind, external_id, external_src')
          .eq('id', contentId)
          .single();

        // For seasons: delete individual episode watches
        if (content?.kind === 'season') {
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
        
        // Populate counts for shows and seasons via edge function (for Show Score calculation)
        if (content?.kind === 'show' || content?.kind === 'season') {
          try {
            const { error: countError } = await supabase.functions.invoke('populate-content-counts', {
              body: {
                external_id: content.external_id,
                kind: content.kind
              }
            });
            
            // Recalculate show_score after counts are populated
            if (!countError) {
              await supabase.rpc('recalculate_user_show_score', { p_user_id: user.id });
            }
          } catch (e) {
            console.error('Error populating counts:', e);
          }
        }
        
        toast({
          title: "Marked as watched",
          description: `${showTitle} added to watched list`,
        });
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
      className="w-full h-auto py-1 sm:py-1.5 flex items-center justify-center gap-1 text-xs rounded-full border-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
          <span className="hidden sm:inline font-semibold">{isWatched ? 'Unwatching...' : 'Marking...'}</span>
        </>
      ) : isWatched ? (
        <>
          <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline font-semibold">Seen</span>
        </>
      ) : (
        <>
          <EyeOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline font-semibold">Seen</span>
        </>
      )}
    </Button>
  );
}
