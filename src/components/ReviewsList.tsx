import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { RatingBadge } from '@/components/PercentRating';

interface Review {
  id: string;
  review_text: string;
  rating: number;
  created_at: string;
  user: {
    id: string;
    handle: string;
    avatar_url?: string;
  };
  likes_count: number;
  user_liked: boolean;
}

interface ReviewsListProps {
  contentId: string;
}

export function ReviewsList({ contentId }: ReviewsListProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [contentId]);

  const loadReviews = async () => {
    setLoading(true);
    
    // Get the content to find associated posts
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('external_id, external_src, kind')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      console.error('ReviewsList - Error loading content:', contentError);
      setLoading(false);
      return;
    }

    const itemType = content.kind as string;
    const itemId = content.external_id;

    // Fetch reviews from posts table
    const { data: reviewsData } = await supabase
      .from('posts')
      .select(`
        id,
        body,
        rating_percent,
        created_at,
        author_id,
        profiles:author_id (
          id,
          handle,
          avatar_url
        )
      `)
      .eq('kind', 'review')
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .is('deleted_at', null)
      .not('body', 'is', null)
      .order('created_at', { ascending: false });

    if (reviewsData && user) {
      // Get likes for these reviews
      const reviewIds = reviewsData.map(r => r.id);
      const { data: likesData } = await supabase
        .from('post_reactions')
        .select('post_id')
        .in('post_id', reviewIds)
        .eq('user_id', user.id)
        .eq('kind', 'like');

      const likedPostIds = new Set(likesData?.map(l => l.post_id) || []);

      // Get like counts
      const { data: likeCountsData } = await supabase
        .from('post_reactions')
        .select('post_id')
        .in('post_id', reviewIds)
        .eq('kind', 'like');

      const likeCounts = likeCountsData?.reduce((acc, like) => {
        acc[like.post_id] = (acc[like.post_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const formattedReviews = reviewsData.map(review => ({
        id: review.id,
        review_text: review.body || '',
        rating: review.rating_percent || 0,
        created_at: review.created_at,
        user: {
          id: review.profiles.id,
          handle: review.profiles.handle,
          avatar_url: review.profiles.avatar_url,
        },
        likes_count: likeCounts[review.id] || 0,
        user_liked: likedPostIds.has(review.id),
      }));

      setReviews(formattedReviews);
    }

    setLoading(false);
  };

  const toggleLike = async (reviewId: string) => {
    if (!user) return;

    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    if (review.user_liked) {
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', reviewId)
        .eq('user_id', user.id)
        .eq('kind', 'like');
    } else {
      await supabase
        .from('post_reactions')
        .insert({
          post_id: reviewId,
          user_id: user.id,
          kind: 'like',
        });
    }

    loadReviews();
  };

  if (loading) return null;
  if (reviews.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">User Reviews</h2>
      {reviews.map((review) => (
        <Card key={review.id} className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={review.user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                {review.user.handle[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{review.user.handle}</span>
                <RatingBadge rating={review.rating} size="sm" />
              </div>
              
              <p className="text-foreground mb-2">{review.review_text}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => toggleLike(review.id)}
                >
                  <Heart
                    className={`h-4 w-4 mr-1 ${review.user_liked ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  {review.likes_count}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}