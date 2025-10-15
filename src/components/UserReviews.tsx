import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { RatingBadge } from '@/components/PercentRating';

interface UserReviewsProps {
  userId?: string;
}

export function UserReviews({ userId }: UserReviewsProps) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [userId]);

  const loadReviews = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Get reviews from posts table
    const { data: reviewsData, error } = await supabase
      .from('posts')
      .select('id, body, rating_percent, created_at, item_type, item_id')
      .eq('author_id', userId)
      .eq('kind', 'review')
      .not('body', 'is', null)
      .order('created_at', { ascending: false });

    // Convert to expected format - reviews are now in posts
    // This is a placeholder - we need show/season/episode data
    const reviewsFormatted = reviewsData || [];

    if (!error && reviewsData) {
      setReviews(reviewsData);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No reviews yet
      </div>
    );
  }

  const handleClick = (content: any) => {
    if (!content) return;
    
    const kind = content.kind;
    if (kind === 'show') {
      navigate(`/show/${content.external_id}`);
    } else if (kind === 'season') {
      navigate(`/season/${content.external_id}`);
    } else if (kind === 'episode') {
      navigate(`/episode/${content.external_id}`);
    }
  };

  return (
    <div className="space-y-4">
      {reviews.map((review: any) => {
        const content = review.content;
        if (!content) return null;

        return (
          <Card
            key={review.id}
            className="p-4 cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleClick(content)}
          >
            <div className="flex gap-4">
              {content.poster_url && (
                <img
                  src={content.poster_url}
                  alt={content.title}
                  className="w-20 h-28 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-lg truncate">{content.title}</h3>
                  {review.rating && (
                    <RatingBadge rating={review.rating} size="sm" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {review.review_text}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
