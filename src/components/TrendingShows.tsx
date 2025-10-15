import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { TrendingUp } from 'lucide-react';

interface TrendingShow {
  content_id: string;
  title: string;
  poster_url?: string;
  external_id: string;
  rating_count: number;
  avg_rating: number;
}

export function TrendingShows() {
  const navigate = useNavigate();
  const [shows, setShows] = useState<TrendingShow[]>([]);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    // Get shows with most ratings in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Trending shows feature needs to be rebuilt with new data model
    // Temporarily disabled
    return;
  };

  if (shows.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold heading-spotify gradient-text">Trending This Week</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {shows.map((show) => (
          <Card
            key={show.content_id}
            className="cursor-pointer active:border-primary/50 transition-all active:scale-95 overflow-hidden"
            onClick={() => navigate(`/show/${show.external_id}`)}
          >
            {show.poster_url ? (
              <img
                src={show.poster_url}
                alt={show.title}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-white font-bold text-center px-2">{show.title}</span>
              </div>
            )}
            <div className="p-2">
              <p className="font-semibold text-sm truncate">{show.title}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>⭐ {show.avg_rating.toFixed(1)}</span>
                <span>·</span>
                <span>{show.rating_count} ratings</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}