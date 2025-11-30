import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ThoughtCard } from '@/components/ThoughtCard';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserThoughtsProps {
  userId?: string;
}

export function UserThoughts({ userId }: UserThoughtsProps) {
  const { user } = useAuth();
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadThoughts();
    }
  }, [userId]);

  const loadThoughts = async () => {
    if (!userId) return;

    const { data: thoughtsData } = await supabase
      .from('posts')
      .select(`
        id,
        author_id,
        body,
        item_id,
        item_type,
        created_at,
        is_spoiler,
        profiles:author_id (
          id,
          handle,
          avatar_url
        )
      `)
      .eq('author_id', userId)
      .eq('kind', 'thought')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (thoughtsData) {
      const thoughtsWithCounts = await Promise.all(
        thoughtsData.map(async (thought: any) => {
          const { data: reactions } = await supabase
            .from('post_reactions')
            .select('kind')
            .eq('post_id', thought.id);

          const { data: comments } = await supabase
            .from('comments')
            .select('id')
            .eq('post_id', thought.id);

          const { data: userReaction } = await supabase
            .from('post_reactions')
            .select('kind')
            .eq('post_id', thought.id)
            .eq('user_id', user?.id || '')
            .maybeSingle();

          const likes = reactions?.filter(r => r.kind === 'like').length || 0;
          const dislikes = reactions?.filter(r => r.kind === 'dislike').length || 0;

          // Fetch content data if item_id and item_type exist
          let show, season, episode;
          if (thought.item_id && thought.item_type) {
            const parts = thought.item_id.split(':');
            const showId = parts[0];
            
            if (thought.item_type === 'show') {
              const { data: showData } = await supabase
                .from('content')
                .select('title, external_id, poster_url')
                .eq('external_id', showId)
                .eq('kind', 'show')
                .maybeSingle();
              
              if (showData) {
                show = { title: showData.title, external_id: showData.external_id, poster_url: showData.poster_url };
              }
            } else if (thought.item_type === 'season') {
              const seasonId = `${showId}:${parts[1]}`;
              const { data: seasonData } = await supabase
                .from('content')
                .select('title, external_id, poster_url')
                .eq('external_id', seasonId)
                .eq('kind', 'season')
                .maybeSingle();
              
              if (seasonData) {
                season = { 
                  title: seasonData.title, 
                  external_id: parts[1],
                  show_external_id: showId,
                  poster_url: seasonData.poster_url
                };
              }
            } else if (thought.item_type === 'episode') {
              const episodeId = `${showId}:${parts[1]}:${parts[2]}`;
              const { data: episodeData } = await supabase
                .from('content')
                .select('title, external_id, poster_url')
                .eq('external_id', episodeId)
                .eq('kind', 'episode')
                .maybeSingle();
              
              if (episodeData) {
                episode = { 
                  title: episodeData.title, 
                  external_id: parts[2],
                  season_external_id: parts[1],
                  show_external_id: showId,
                  poster_url: episodeData.poster_url
                };
              }
            }
          }

          return {
            id: thought.id,
            user: {
              id: thought.profiles.id,
              handle: thought.profiles.handle,
              avatar_url: thought.profiles.avatar_url,
            },
            content: thought.body,
            is_spoiler: thought.is_spoiler,
            show,
            season,
            episode,
            likes,
            dislikes,
            comments: comments?.length || 0,
            userReaction: userReaction?.kind,
          };
        })
      );

      setThoughts(thoughtsWithCounts);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (thoughts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No thoughts posted yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {thoughts.map((thought) => (
        <ThoughtCard
          key={thought.id}
          thought={thought}
          onReactionChange={loadThoughts}
          onDelete={loadThoughts}
        />
      ))}
    </div>
  );
}
