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

  useEffect(() => {
    loadRatings();
  }, [userId, contentKind]);

  const loadRatings = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const allRatings = await getUserRatings(userId);
    console.log('All ratings:', allRatings);
    
    // Filter by content kind
    const filtered = allRatings.filter(r => r.item_type === contentKind);
    console.log('Filtered ratings:', filtered);
    
    // Fetch content titles from content table
    const enrichedRatings = await Promise.all(
      filtered.map(async (rating) => {
        console.log('Fetching content for:', rating.item_id, rating.item_type);
        
        const { data: content, error } = await supabase
          .from('content')
          .select('title, poster_url')
          .eq('external_id', rating.item_id)
          .eq('kind', rating.item_type as 'show' | 'season' | 'episode')
          .maybeSingle();
        
        console.log('Content result:', { rating: rating.item_id, content, error });
        
        return {
          ...rating,
          title: content?.title || `${rating.item_type} ${rating.item_id}`,
          poster_url: content?.poster_url,
        };
      })
    );
    
    console.log('Enriched ratings:', enrichedRatings);
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
      
      toast.success('Rating deleted');
    } catch (error) {
      console.error('Failed to delete rating:', error);
      toast.error('Failed to delete rating');
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {ratings.map((rating) => (
        <Card
          key={`${rating.item_type}-${rating.item_id}`}
          className="overflow-hidden cursor-pointer hover:border-primary transition-colors relative group"
          onClick={() => handleClick(rating)}
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
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              onClick={(e) => handleDelete(e, rating)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold line-clamp-2 mb-1">{rating.title}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(rating.updated_at).toLocaleDateString()}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
