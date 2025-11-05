import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRatings, deleteRating } from '@/api/ratings';
import { Card } from '@/components/ui/card';
import { Loader2, Trash2 } from 'lucide-react';
import { RatingBadge } from '@/components/PercentRating';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface UserRatingsProps {
  userId?: string;
  contentKind: 'show' | 'season' | 'episode';
}

interface RatingWithMetadata {
  item_type: string;
  item_id: string;
  score: number;
  updated_at: string;
  title?: string;
  poster_url?: string;
}

export function UserRatings({ userId, contentKind }: UserRatingsProps) {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<RatingWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    loadRatings();
  }, [userId, contentKind]);

  const loadRatings = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const allRatings = await getUserRatings(userId);
    
    // Filter by content kind
    const filtered = allRatings.filter(r => r.item_type === contentKind);
    
    // Fetch content titles from content table
    const enrichedRatings = await Promise.all(
      filtered.map(async (rating) => {
        const { data: content, error } = await supabase
          .from('content')
          .select('title, poster_url')
          .eq('external_src', 'thetvdb')
          .eq('external_id', rating.item_id)
          .eq('kind', rating.item_type as 'show' | 'season' | 'episode')
          .maybeSingle();
        
        return {
          ...rating,
          title: content?.title || `${rating.item_type} ${rating.item_id}`,
          poster_url: content?.poster_url,
        };
      })
    );
    setRatings(enrichedRatings);
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

  const handleClick = (rating: RatingWithMetadata) => {
    const parts = rating.item_id.split(':');
    
    if (contentKind === 'show') {
      navigate(`/show/${parts[0]}`);
    } else if (contentKind === 'season') {
      navigate(`/show/${parts[0]}/season/${parts[1]}`);
    } else if (contentKind === 'episode') {
      navigate(`/show/${parts[0]}/season/${parts[1]}/episode/${parts[2]}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, rating: RatingWithMetadata) => {
    e.stopPropagation();
    
    try {
      await deleteRating({
        itemType: rating.item_type,
        itemId: rating.item_id
      });
      
      setRatings(ratings.filter(r => 
        !(r.item_type === rating.item_type && r.item_id === rating.item_id)
      ));
      
      setSwipedId(null);
      toast.success('Rating deleted');
    } catch (error) {
      toast.error('Failed to delete rating');
    }
  };

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (ratingId: string) => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    
    if (isLeftSwipe) {
      setSwipedId(ratingId);
    } else {
      setSwipedId(null);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {ratings.map((rating) => {
        const ratingKey = `${rating.item_type}-${rating.item_id}`;
        const isSwiped = swipedId === ratingKey;
        
        return (
          <div key={ratingKey} className="relative overflow-hidden">
            <div 
              className={`absolute inset-0 bg-destructive flex items-center justify-end pr-4 transition-opacity ${
                isSwiped ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleDelete(e, rating)}
                className="text-destructive-foreground"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
            
            <Card
              className={`cursor-pointer hover:border-primary transition-all ${
                isSwiped ? '-translate-x-16' : 'translate-x-0'
              }`}
              onClick={() => handleClick(rating)}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => onTouchEnd(ratingKey)}
            >
              <div className="aspect-[2/3] bg-muted relative flex items-center justify-center">
                {rating.poster_url ? (
                  <img 
                    src={rating.poster_url} 
                    alt={rating.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <p className="text-sm font-semibold line-clamp-3">{rating.title}</p>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <RatingBadge rating={rating.score} size="sm" />
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold line-clamp-2 mb-1">{rating.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(rating.updated_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
