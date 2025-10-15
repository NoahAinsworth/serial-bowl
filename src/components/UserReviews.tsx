import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/PostCard';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserReviewsProps {
  userId?: string;
}

export function UserReviews({ userId }: UserReviewsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userHideSpoilers, setUserHideSpoilers] = useState(true);

  // Load user's spoiler settings
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.settings) {
            const settings = data.settings as any;
            setUserHideSpoilers(settings?.safety?.hide_spoilers ?? true);
          }
        });
    }
  }, [user]);

  useEffect(() => {
    loadReviews();
  }, [userId]);

  const loadReviews = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Get reviews from posts table with author info
    const { data: reviewsData, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, handle, avatar_url)
      `)
      .eq('author_id', userId)
      .eq('kind', 'review')
      .not('body', 'is', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

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

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <PostCard
          key={review.id}
          post={{
            ...review,
            user: review.author
          }}
          userHideSpoilers={userHideSpoilers}
          strictSafety={false}
        />
      ))}
    </div>
  );
}
