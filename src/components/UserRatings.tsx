import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { RatingBadge } from '@/components/PercentRating';

interface UserRatingsProps {
  userId?: string;
  contentKind: 'show' | 'season' | 'episode';
}

export function UserRatings({ userId, contentKind }: UserRatingsProps) {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatings();
  }, [userId, contentKind]);

  const loadRatings = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('ratings')
      .select(`
        rating,
        created_at,
        content:content_id (
          id,
          external_id,
          title,
          poster_url,
          kind
        )
      `)
      .eq('user_id', userId)
      .eq('content.kind', contentKind)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRatings(data);
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

  if (ratings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {contentKind}s rated yet
      </div>
    );
  }

  const handleClick = (content: any) => {
    if (!content) return;
    
    if (contentKind === 'show') {
      navigate(`/show/${content.external_id}`);
    } else if (contentKind === 'season') {
      navigate(`/season/${content.external_id}`);
    } else if (contentKind === 'episode') {
      navigate(`/episode/${content.external_id}`);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {ratings.map((rating: any) => {
        const content = rating.content;
        if (!content) return null;

        return (
          <Card
            key={content.id}
            className="overflow-hidden cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleClick(content)}
          >
            <div className="aspect-[2/3] bg-muted relative">
              {content.poster_url ? (
                <img
                  src={content.poster_url}
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">No poster</span>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <RatingBadge rating={Math.round(rating.rating)} size="sm" />
              </div>
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm line-clamp-2">{content.title}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
