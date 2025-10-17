import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from './ui/skeleton';
import { getUserRatings, deleteRating } from '@/api/ratings';
import { Button } from './ui/button';
import { ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UnifiedRatingsProps {
  userId: string;
}

type FilterType = 'all' | 'show' | 'season' | 'episode';
type SortType = 'recent' | 'highest' | 'lowest' | 'az';

export function UnifiedRatings({ userId }: UnifiedRatingsProps) {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('recent');
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    loadRatings();
  }, [userId]);

  async function loadRatings() {
    setLoading(true);
    
    const allRatings = await getUserRatings(userId);
    
    // Enrich ratings with content titles
    const enrichedRatings = await Promise.all(
      allRatings.map(async (rating) => {
        const { data: content } = await supabase
          .from('content')
          .select('title, poster_url')
          .eq('external_id', rating.item_id)
          .eq('kind', rating.item_type as 'show' | 'season' | 'episode')
          .maybeSingle();
        
        return {
          ...rating,
          title: content?.title || rating.item_id,
          poster_url: content?.poster_url,
        };
      })
    );
    
    setRatings(enrichedRatings);
    setLoading(false);
  }

  const handleDelete = async (e: React.MouseEvent, rating: any) => {
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
      console.error('Failed to delete rating:', error);
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

  // Filter
  const filteredRatings = ratings.filter(r => {
    if (filter === 'all') return true;
    return r.item_type === filter;
  });

  // Sort
  const sortedRatings = [...filteredRatings].sort((a, b) => {
    if (sort === 'recent') {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
    if (sort === 'highest') {
      return b.score - a.score;
    }
    if (sort === 'lowest') {
      return a.score - b.score;
    }
    if (sort === 'az') {
      const aTitle = a.item_id.split(':')[0];
      const bTitle = b.item_id.split(':')[0];
      return aTitle.localeCompare(bTitle);
    }
    return 0;
  });

  // Group by show > season > episode
  const grouped: any = {};
  
  sortedRatings.forEach(rating => {
    const parts = rating.item_id.split(':');
    const showId = parts[0];
    
    if (!grouped[showId]) {
      grouped[showId] = {
        showRating: null,
        seasons: {}
      };
    }
    
    if (rating.item_type === 'show') {
      grouped[showId].showRating = rating;
    } else if (rating.item_type === 'season') {
      const seasonNum = parts[1];
      if (!grouped[showId].seasons[seasonNum]) {
        grouped[showId].seasons[seasonNum] = {
          seasonRating: null,
          episodes: []
        };
      }
      grouped[showId].seasons[seasonNum].seasonRating = rating;
    } else if (rating.item_type === 'episode') {
      const seasonNum = parts[1];
      if (!grouped[showId].seasons[seasonNum]) {
        grouped[showId].seasons[seasonNum] = {
          seasonRating: null,
          episodes: []
        };
      }
      grouped[showId].seasons[seasonNum].episodes.push(rating);
    }
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Dropdown */}
      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="px-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="show">Shows</option>
            <option value="season">Seasons</option>
            <option value="episode">Episodes</option>
          </select>
          
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="recent">Recent</option>
            <option value="highest">Highest</option>
            <option value="lowest">Lowest</option>
            <option value="az">A-Z</option>
          </select>
        </div>
      </div>

      {/* Ratings List */}
      {sortedRatings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No ratings yet
        </div>
      ) : (
        <div className="space-y-2">
          {sortedRatings.map((rating) => (
            <div
              key={`${rating.item_type}-${rating.item_id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer group"
              onClick={() => {
                const parts = rating.item_id.split(':');
                if (rating.item_type === 'show') {
                  navigate(`/show/${parts[0]}`);
                } else if (rating.item_type === 'season') {
                  navigate(`/show/${parts[0]}/season/${parts[1]}`);
                } else if (rating.item_type === 'episode') {
                  navigate(`/show/${parts[0]}/season/${parts[1]}/episode/${parts[2]}`);
                }
              }}
            >
              <div className="flex-1">
                <div className="font-medium">
                  {(rating as any).title || rating.item_id}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {rating.item_type}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => handleDelete(e, rating)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div className="text-lg font-bold text-primary">
                  {rating.score}%
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
