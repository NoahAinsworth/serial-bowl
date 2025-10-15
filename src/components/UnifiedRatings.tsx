import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from './ui/skeleton';
import { getUserRatings } from '@/api/ratings';
import { Button } from './ui/button';
import { ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

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
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button 
          size="sm" 
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button 
          size="sm" 
          variant={filter === 'show' ? 'default' : 'outline'}
          onClick={() => setFilter('show')}
        >
          Shows
        </Button>
        <Button 
          size="sm" 
          variant={filter === 'season' ? 'default' : 'outline'}
          onClick={() => setFilter('season')}
        >
          Seasons
        </Button>
        <Button 
          size="sm" 
          variant={filter === 'episode' ? 'default' : 'outline'}
          onClick={() => setFilter('episode')}
        >
          Episodes
        </Button>
      </div>

      {/* Sort */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button 
          size="sm" 
          variant={sort === 'recent' ? 'default' : 'outline'}
          onClick={() => setSort('recent')}
        >
          Recent
        </Button>
        <Button 
          size="sm" 
          variant={sort === 'highest' ? 'default' : 'outline'}
          onClick={() => setSort('highest')}
        >
          Highest
        </Button>
        <Button 
          size="sm" 
          variant={sort === 'lowest' ? 'default' : 'outline'}
          onClick={() => setSort('lowest')}
        >
          Lowest
        </Button>
        <Button 
          size="sm" 
          variant={sort === 'az' ? 'default' : 'outline'}
          onClick={() => setSort('az')}
        >
          A-Z
        </Button>
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
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer"
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
