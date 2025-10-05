import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Star, Loader2 } from 'lucide-react';

interface UserRatingsProps {
  userId?: string;
  contentKind: 'show' | 'season' | 'episode';
}

export function UserRatings({ userId, contentKind }: UserRatingsProps) {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      loadRatings();
    }
  }, [userId, contentKind]);

  const loadRatings = async () => {
    if (!userId) return;

    const { data: ratingsData } = await supabase
      .from('ratings')
      .select(`
        id,
        rating,
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
      .eq('content.kind', contentKind)
      .order('created_at', { ascending: false })
      .limit(20);

    setRatings(ratingsData || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No {contentKind}s rated yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {ratings.map((rating) => (
        <Card
          key={rating.id}
          className="cursor-pointer hover:border-primary/50 transition-all hover-scale overflow-hidden"
          onClick={() => {
            if (contentKind === 'show') {
              navigate(`/show/${rating.content.external_id}`);
            }
          }}
        >
          {rating.content.poster_url && (
            <img
              src={rating.content.poster_url}
              alt={rating.content.title}
              className="w-full h-48 object-cover"
            />
          )}
          <div className="p-3">
            <h3 className="font-semibold text-sm line-clamp-1">{rating.content.title}</h3>
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="text-sm font-bold text-primary">
                {rating.rating * 10}%
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
