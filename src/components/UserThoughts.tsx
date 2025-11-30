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

          return {
            id: thought.id,
            user: {
              id: thought.profiles.id,
              handle: thought.profiles.handle,
              avatar_url: thought.profiles.avatar_url,
            },
            content: thought.body,
            is_spoiler: thought.is_spoiler,
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
