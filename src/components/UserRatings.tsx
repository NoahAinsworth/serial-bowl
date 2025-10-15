import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRatings } from '@/api/ratings';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { RatingBadge } from '@/components/PercentRating';

interface UserRatingsProps {
  userId?: string;
  contentKind: 'show' | 'season' | 'episode';
}

interface RatingWithMetadata {
  item_type: string;
  item_id: string;
  score: number;
  updated_at: string;
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
    // Filter by content kind
    const filtered = allRatings.filter(r => r.item_type === contentKind);
    setRatings(filtered);
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {ratings.map((rating) => (
        <Card
          key={`${rating.item_type}-${rating.item_id}`}
          className="overflow-hidden cursor-pointer hover:border-primary transition-colors"
          onClick={() => handleClick(rating)}
        >
          <div className="aspect-[2/3] bg-muted relative flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-sm font-semibold line-clamp-3">{rating.item_id}</p>
            </div>
            <div className="absolute top-2 right-2">
              <RatingBadge rating={rating.score} size="sm" />
            </div>
          </div>
          <div className="p-3">
            <p className="text-xs text-muted-foreground">
              {contentKind} • {new Date(rating.updated_at).toLocaleDateString()}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
