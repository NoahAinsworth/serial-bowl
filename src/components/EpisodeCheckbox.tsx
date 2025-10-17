import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EpisodeCheckboxProps {
  episodeId: string;
  showId: string;
  seasonNumber: number;
  episodeNumber: number;
}

export function EpisodeCheckbox({ episodeId, showId, seasonNumber, episodeNumber }: EpisodeCheckboxProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [watched, setWatched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWatched();
  }, [episodeId, user]);

  const checkWatched = async () => {
    if (!user) return;

    // First get or create the episode content
    let { data: content } = await supabase
      .from('content')
      .select('id')
      .eq('external_src', 'thetvdb')
      .eq('external_id', episodeId)
      .eq('kind', 'episode')
      .single();

    if (!content) {
      const { data: newContent } = await supabase
        .from('content')
        .insert({
          external_src: 'thetvdb',
          external_id: episodeId,
          kind: 'episode',
          title: `S${seasonNumber}E${episodeNumber}`,
        })
        .select()
        .single();
      
      content = newContent;
    }

    if (content) {
      const { data } = await supabase
        .from('watched')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', content.id)
        .single();

      setWatched(!!data);
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

    // Get or create content
    let { data: content } = await supabase
      .from('content')
      .select('id')
      .eq('external_src', 'thetvdb')
      .eq('external_id', episodeId)
      .eq('kind', 'episode')
      .single();

    if (!content) {
      const { data: newContent } = await supabase
        .from('content')
        .insert({
          external_src: 'thetvdb',
          external_id: episodeId,
          kind: 'episode',
          title: `S${seasonNumber}E${episodeNumber}`,
        })
        .select()
        .single();
      
      content = newContent;
    }

    if (content) {
      if (watched) {
        await supabase
          .from('watched')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', content.id);
        setWatched(false);
      } else {
        await supabase
          .from('watched')
          .insert({
            user_id: user.id,
            content_id: content.id,
            watched_at: new Date().toISOString(),
          });
        setWatched(true);
      }
    }

    setLoading(false);
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