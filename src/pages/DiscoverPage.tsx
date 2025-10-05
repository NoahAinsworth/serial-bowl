import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTVDB } from '@/hooks/useTVDB';
import { Compass, TrendingUp, Loader2, ChevronRight, Star, Flame } from 'lucide-react';

interface TrendingShow {
  content_id: string;
  title: string;
  poster_url?: string;
  external_id: string;
  rating_count: number;
  avg_rating?: number;
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useTVDB();
  const [topRatedShows, setTopRatedShows] = useState<TrendingShow[]>([]);
  const [mostRatedShows, setMostRatedShows] = useState<TrendingShow[]>([]);
  const [popularShows, setPopularShows] = useState<any[]>([]);
  const [newShows, setNewShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);

    // Load user-based trending data
    if (user) {
      // Get top rated shows (highest average rating with min 3 ratings)
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select(`
          content_id,
          rating,
          content (
            id,
            title,
            poster_url,
            external_id,
            kind
          )
        `)
        .eq('content.kind', 'show')
        .limit(200);

      if (ratingsData) {
        const showMap = new Map<string, TrendingShow & { total: number }>();
        
        ratingsData.forEach((rating: any) => {
          if (!rating.content) return;
          
          const show = showMap.get(rating.content_id) || {
            content_id: rating.content_id,
            title: rating.content.title,
            poster_url: rating.content.poster_url,
            external_id: rating.content.external_id,
            rating_count: 0,
            avg_rating: 0,
            total: 0,
          };

          show.rating_count++;
          show.total += rating.rating;
          show.avg_rating = show.total / show.rating_count;
          showMap.set(rating.content_id, show);
        });

        // Top rated (highest avg rating with at least 3 ratings)
        const topRated = Array.from(showMap.values())
          .filter(show => show.rating_count >= 3)
          .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
          .slice(0, 10);

        setTopRatedShows(topRated);

        // Most rated (most number of ratings)
        const mostRated = Array.from(showMap.values())
          .sort((a, b) => b.rating_count - a.rating_count)
          .slice(0, 10);

        setMostRatedShows(mostRated);
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

  const ShowPoster = ({ show, onClick }: { show: any, onClick: () => void }) => (
    <div
      className="cursor-pointer hover:scale-105 transition-transform flex-shrink-0 w-[140px]"
      onClick={onClick}
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
  );

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
        <Tabs defaultValue={user ? "trending" : "browse"} className="w-full">
          <TabsList className="w-full justify-start mb-6 px-4">
            {user && <TabsTrigger value="trending">Trending</TabsTrigger>}
            <TabsTrigger value="browse">Browse</TabsTrigger>
          </TabsList>

          {user && (
            <TabsContent value="trending" className="space-y-6 mt-0">
              {/* Top Rated Shows */}
              {topRatedShows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4 px-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-bold neon-glow">Top Rated</h2>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-3 px-4 pb-4">
                      {topRatedShows.map((show) => (
                        <ShowPoster 
                          key={show.content_id}
                          show={show}
                          onClick={() => navigate(`/show/${show.external_id}`)}
                        />
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}

              {/* Most Rated Shows */}
              {mostRatedShows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4 px-4">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-bold neon-glow">Most Rated</h2>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-3 px-4 pb-4">
                      {mostRatedShows.map((show) => (
                        <ShowPoster 
                          key={show.content_id}
                          show={show}
                          onClick={() => navigate(`/show/${show.external_id}`)}
                        />
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="browse" className="mt-0">
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}