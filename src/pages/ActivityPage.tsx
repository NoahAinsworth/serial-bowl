import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ThoughtCard } from '@/components/ThoughtCard';
import { Loader2 } from 'lucide-react';

export default function ActivityPage() {
  const { user } = useAuth();
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, [user]);

  const loadActivity = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Get users that the current user follows
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = following?.map(f => f.following_id) || [];

    // Get thoughts from followed users
    const { data: thoughtsData, error } = await supabase
      .from('thoughts')
      .select(`
        id,
        user_id,
        text_content,
        content_id,
        created_at,
        profiles!thoughts_user_id_fkey (
          id,
          handle,
          avatar_url
        ),
        content (
          title
        )
      `)
      .in('user_id', followingIds.length > 0 ? followingIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && thoughtsData) {
      // Get reaction counts for each thought
      const thoughtsWithCounts = await Promise.all(
        thoughtsData.map(async (thought: any) => {
          const { data: reactions } = await supabase
            .from('reactions')
            .select('reaction_type')
            .eq('thought_id', thought.id);

          const { data: comments } = await supabase
            .from('comments')
            .select('id')
            .eq('thought_id', thought.id);

          const { data: userReaction } = await supabase
            .from('reactions')
            .select('reaction_type')
            .eq('thought_id', thought.id)
            .eq('user_id', user.id)
            .single();

          const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
          const dislikes = reactions?.filter(r => r.reaction_type === 'dislike').length || 0;
          const rethinks = reactions?.filter(r => r.reaction_type === 'rethink').length || 0;

          return {
            id: thought.id,
            user: {
              id: thought.profiles.id,
              handle: thought.profiles.handle,
              avatar_url: thought.profiles.avatar_url,
            },
            content: thought.text_content,
            show: thought.content ? { title: thought.content.title } : undefined,
            likes,
            dislikes,
            comments: comments?.length || 0,
            rethinks,
            userReaction: userReaction?.reaction_type,
          };
        })
      );

      setThoughts(thoughtsWithCounts);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Activity</h1>
      
      {!user ? (
        <p className="text-center text-muted-foreground">
          Sign in to see activity from people you follow
        </p>
      ) : thoughts.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No activity yet. Follow some users to see their thoughts here!
        </p>
      ) : (
        <div className="space-y-4">
          {thoughts.map((thought) => (
            <ThoughtCard
              key={thought.id}
              thought={thought}
              onReactionChange={loadActivity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
