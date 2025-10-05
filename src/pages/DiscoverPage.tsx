import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTVDB } from '@/hooks/useTVDB';
import { Compass, TrendingUp, Loader2, ChevronRight } from 'lucide-react';

interface TrendingShow {
  content_id: string;
  title: string;
  poster_url?: string;
  external_id: string;
  rating_count: number;
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useTVDB();
  const [trendingShows, setTrendingShows] = useState<TrendingShow[]>([]);
  const [popularShows, setPopularShows] = useState<any[]>([]);
  const [newShows, setNewShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);

    // Load trending shows based on user data (last 7 days activity)
    if (user) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('ratings')
        .select(`
          content_id,
          content (
            id,
            title,
            poster_url,
            external_id,
            kind
          )
        `)
        .eq('content.kind', 'show')
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(100);

      if (data) {
        const showMap = new Map<string, TrendingShow>();
        
        data.forEach((rating: any) => {
          if (!rating.content) return;
          
          const show = showMap.get(rating.content_id) || {
            content_id: rating.content_id,
            title: rating.content.title,
            poster_url: rating.content.poster_url,
            external_id: rating.content.external_id,
            rating_count: 0,
          };

          show.rating_count++;
          showMap.set(rating.content_id, show);
        });

        const trending = Array.from(showMap.values())
          .sort((a, b) => b.rating_count - a.rating_count)
          .slice(0, 10);

        setTrendingShows(trending);
      }
    }

    // Load popular and new shows from TVDB
    try {
      const popularQueries = ['Succession', 'Ted Lasso', 'Severance', 'The Bear', 'Breaking Bad', 'Game of Thrones'];
      const popularPromises = popularQueries.map(q => search(q));
      const popularResultsArrays = await Promise.all(popularPromises);
      
      const popularResults = popularResultsArrays
        .map(results => results[0])
        .filter(Boolean);
      
      setPopularShows(popularResults);

      const newQueries = ['The Last of Us', 'Fallout', 'Shōgun', 'The Penguin', 'Baby Reindeer', '3 Body Problem'];
      const newPromises = newQueries.map(q => search(q));
      const newResultsArrays = await Promise.all(newPromises);
      
      const newResults = newResultsArrays
        .map(results => results[0])
        .filter(Boolean);
      
      setNewShows(newResults);
    } catch (error) {
      console.error('Error loading from TVDB:', error);
    }

    setLoading(false);
  };

  const mixedShows = [...popularShows, ...newShows].sort(() => Math.random() - 0.5);

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 px-4">
        <Compass className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold neon-glow">Discover</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Trending Section - Horizontal Scroll */}
          {user && trendingShows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 px-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold neon-glow">Trending</h2>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 px-4 pb-4">
                  {trendingShows.map((show) => (
                    <div
                      key={show.content_id}
                      className="cursor-pointer hover:scale-105 transition-transform flex-shrink-0 w-[140px]"
                      onClick={() => navigate(`/show/${show.external_id}`)}
                    >
                      <div className="aspect-[2/3] bg-muted rounded-md overflow-hidden border border-border">
                        {show.poster_url ? (
                          <img 
                            src={show.poster_url} 
                            alt={show.title} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                            {show.title}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {/* Mixed Popular & New Shows - Vertical Grid */}
          <div className="px-4">
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {mixedShows.map((show, index) => (
                <div
                  key={show.id || index}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => navigate(`/show/${show.id || show.external_id}`)}
                >
                  <div className="aspect-[2/3] bg-muted rounded-md overflow-hidden border border-border">
                    {(show.poster_url || show.image) ? (
                      <img 
                        src={show.poster_url || show.image} 
                        alt={show.title || show.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                        {show.title || show.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}