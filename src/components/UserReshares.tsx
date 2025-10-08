import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ThoughtCard } from './ThoughtCard';
import { ReviewCard } from './ReviewCard';

interface UserResharesProps {
  userId: string;
}

export function UserReshares({ userId }: UserResharesProps) {
  const [loading, setLoading] = useState(true);
  const [reshares, setReshares] = useState<any[]>([]);

  useEffect(() => {
    loadReshares();
  }, [userId]);

  const loadReshares = async () => {
    setLoading(true);

    // Get all reshares by this user
    const { data: reshareData } = await supabase
      .from('reshares')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!reshareData) {
      setLoading(false);
      return;
    }

    // Fetch the actual posts
    const thoughts = reshareData.filter(r => r.post_type === 'thought');
    const reviews = reshareData.filter(r => r.post_type === 'review');

    const [thoughtsData, reviewsData] = await Promise.all([
      thoughts.length > 0
        ? supabase
            .from('thoughts')
            .select(`
              id,
              user_id,
              text_content,
              content_id,
              created_at,
              is_spoiler,
              content (title)
            `)
            .in('id', thoughts.map(t => t.post_id))
        : Promise.resolve({ data: [] }),
      reviews.length > 0
        ? supabase
            .from('reviews')
            .select(`
              id,
              user_id,
              review_text,
              rating,
              content_id,
              created_at,
              is_spoiler,
              content (title)
            `)
            .in('id', reviews.map(r => r.post_id))
        : Promise.resolve({ data: [] }),
    ]);

    // Process thoughts
    const processedThoughts = await Promise.all(
      (thoughtsData.data || []).map(async (thought: any) => {
        const reshareInfo = reshareData.find(r => r.post_id === thought.id && r.post_type === 'thought');
        
        const [reactionsRes, commentsRes, profileRes] = await Promise.all([
          supabase.from('reactions').select('reaction_type, user_id').eq('thought_id', thought.id),
          supabase.from('comments').select('id').eq('thought_id', thought.id),
          supabase.from('profiles').select('handle, avatar_url').eq('id', thought.user_id).single(),
        ]);

        const likes = reactionsRes.data?.filter(r => r.reaction_type === 'like').length || 0;
        const dislikes = reactionsRes.data?.filter(r => r.reaction_type === 'dislike').length || 0;
        const rethinks = reactionsRes.data?.filter(r => r.reaction_type === 'rethink').length || 0;

        return {
          type: 'thought',
          resharedAt: reshareInfo?.created_at,
          id: thought.id,
          user: {
            id: thought.user_id,
            handle: profileRes.data?.handle || 'unknown',
            avatar_url: profileRes.data?.avatar_url,
          },
          content: thought.text_content,
          show: thought.content ? { title: thought.content.title } : undefined,
          likes,
          dislikes,
          comments: commentsRes.data?.length || 0,
          rethinks,
          is_spoiler: thought.is_spoiler,
          created_at: thought.created_at,
        };
      })
    );

    // Process reviews
    const processedReviews = await Promise.all(
      (reviewsData.data || []).map(async (review: any) => {
        const reshareInfo = reshareData.find(r => r.post_id === review.id && r.post_type === 'review');
        
        const [likesRes, dislikesRes, profileRes] = await Promise.all([
          supabase.from('review_likes').select('id').eq('review_id', review.id),
          supabase.from('review_dislikes').select('id').eq('review_id', review.id),
          supabase.from('profiles').select('handle, avatar_url').eq('id', review.user_id).single(),
        ]);

        return {
          type: 'review',
          resharedAt: reshareInfo?.created_at,
          id: review.id,
          user: {
            id: review.user_id,
            handle: profileRes.data?.handle || 'unknown',
            avatar_url: profileRes.data?.avatar_url,
          },
          review_text: review.review_text,
          rating: review.rating,
          show: review.content ? { title: review.content.title } : undefined,
          likes: likesRes.data?.length || 0,
          dislikes: dislikesRes.data?.length || 0,
          is_spoiler: review.is_spoiler,
          created_at: review.created_at,
        };
      })
    );

    // Combine and sort by reshare time
    const combined = [...processedThoughts, ...processedReviews].sort(
      (a, b) => new Date(b.resharedAt).getTime() - new Date(a.resharedAt).getTime()
    );

    setReshares(combined);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (reshares.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No reshares yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reshares.map((item) => (
        <div key={`${item.type}-${item.id}`}>
          {item.type === 'thought' ? (
            <ThoughtCard thought={item} />
          ) : (
            <ReviewCard review={item} />
          )}
        </div>
      ))}
    </div>
  );
}
