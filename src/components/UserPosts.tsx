import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserPostsProps {
  userId?: string;
}

export function UserPosts({ userId }: UserPostsProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadPosts();
    }
  }, [userId]);

  const loadPosts = async () => {
    if (!userId) return;

    // Fetch thoughts
    const { data: thoughtsData } = await supabase
      .from('thoughts')
      .select(`
        id,
        user_id,
        text_content,
        content_id,
        created_at,
        is_spoiler,
        profiles!thoughts_user_id_fkey (
          id,
          handle,
          avatar_url
        ),
        content (
          id,
          title,
          kind,
          external_id,
          metadata,
          poster_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        user_id,
        review_text,
        rating,
        created_at,
        is_spoiler,
        content_id,
        profiles!reviews_user_id_fkey (
          id,
          handle,
          avatar_url
        ),
        content (
          id,
          title,
          kind,
          external_id,
          metadata,
          poster_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Process thoughts
    const thoughtsWithCounts = await Promise.all(
      (thoughtsData || []).map(async (thought: any) => {
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
          .eq('user_id', user?.id || '')
          .maybeSingle();

        const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
        const dislikes = reactions?.filter(r => r.reaction_type === 'dislike').length || 0;
        const rethinks = reactions?.filter(r => r.reaction_type === 'rethink').length || 0;

        return {
          id: thought.id,
          type: 'thought' as const,
          user: thought.profiles,
          text: thought.text_content,
          content: thought.content,
          is_spoiler: thought.is_spoiler,
          likes,
          dislikes,
          comments: comments?.length || 0,
          rethinks,
          userReaction: userReaction?.reaction_type,
          created_at: thought.created_at,
        };
      })
    );

    // Process reviews
    const reviewsWithCounts = await Promise.all(
      (reviewsData || []).map(async (review: any) => {
        const { count: likesCount } = await supabase
          .from('review_likes')
          .select('id', { count: 'exact', head: true })
          .eq('review_id', review.id);

        const { count: dislikesCount } = await supabase
          .from('review_dislikes')
          .select('id', { count: 'exact', head: true })
          .eq('review_id', review.id);

        const { data: userLike } = await supabase
          .from('review_likes')
          .select('id')
          .eq('review_id', review.id)
          .eq('user_id', user?.id || '')
          .maybeSingle();

        const { data: userDislike } = await supabase
          .from('review_dislikes')
          .select('id')
          .eq('review_id', review.id)
          .eq('user_id', user?.id || '')
          .maybeSingle();

        return {
          id: review.id,
          type: 'review' as const,
          user: review.profiles,
          text: review.review_text,
          content: review.content,
          is_spoiler: review.is_spoiler,
          rating: review.rating,
          likes: likesCount || 0,
          dislikes: dislikesCount || 0,
          comments: 0,
          rethinks: 0,
          userReaction: userLike ? 'like' : userDislike ? 'dislike' : undefined,
          created_at: review.created_at,
        };
      })
    );

    // Combine and sort by date
    const allPosts = [...thoughtsWithCounts, ...reviewsWithCounts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setPosts(allPosts);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No posts yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) =>
        post.type === 'thought' ? (
          <ThoughtCard
            key={post.id}
            thought={post}
            onReactionChange={loadPosts}
            onDelete={loadPosts}
          />
        ) : (
          <ReviewCard
            key={post.id}
            review={post}
            onDelete={loadPosts}
          />
        )
      )}
    </div>
  );
}
