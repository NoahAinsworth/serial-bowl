import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Star, Loader2 } from 'lucide-react';

interface UserReviewsProps {
  userId?: string;
}

export function UserReviews({ userId }: UserReviewsProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      loadReviews();
    }
  }, [userId]);

  const loadReviews = async () => {
    if (!userId) return;

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        review_text,
        created_at,
        content!inner (
          id,
          kind,
          title,
          poster_url,
          external_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get ratings for each review
    if (reviewsData) {
      const reviewsWithRatings = await Promise.all(
        reviewsData.map(async (review: any) => {
          const { data: rating } = await supabase
            .from('ratings')
            .select('rating')
            .eq('user_id', userId)
            .eq('content_id', review.content.id)
            .maybeSingle();

          return {
            ...review,
            rating: rating?.rating || 0,
          };
        })
      );

      setReviews(reviewsWithRatings);
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

  if (reviews.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No reviews yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card
          key={review.id}
          className="p-4 cursor-pointer hover:border-primary/50 transition-all"
          onClick={() => {
            if (review.content.kind === 'show') {
              navigate(`/show/${review.content.external_id}`);
            }
          }}
        >
          <div className="flex gap-4">
            {review.content.poster_url && (
              <img
                src={review.content.poster_url}
                alt={review.content.title}
                className="w-20 h-28 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{review.content.title}</h3>
              <div className="flex items-center gap-1 mb-2">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-bold text-primary">
                  {review.rating * 10}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {review.review_text}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
