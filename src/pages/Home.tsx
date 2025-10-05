import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTVDB } from '@/hooks/useTVDB';
import { supabase } from '@/lib/supabase';
import { Loader2, TrendingUp } from 'lucide-react';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search: searchTVDB } = useTVDB();
  const [discoverShows, setDiscoverShows] = useState<any[]>([]);
  const [trendingShows, setTrendingShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    setLoading(true);
    
    // Load random popular shows from TVDB
    const popularQueries = ['breaking bad', 'the office', 'game of thrones', 'stranger things', 'the mandalorian'];
    const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
    
    try {
      const tvdbResults = await searchTVDB(randomQuery);
      setDiscoverShows(tvdbResults.slice(0, 12));
    } catch (error) {
      console.error('Error loading TVDB shows:', error);
    }

    // Load trending shows from user data
    if (user) {
      const { data: topRatedContent } = await supabase
        .from('aggregates')
        .select('content_id, rating_count, avg_rating, content!inner(id, title, poster_url, external_id, kind)')
        .order('rating_count', { ascending: false })
        .limit(12);

      if (topRatedContent) {
        setTrendingShows(topRatedContent.map((item: any) => ({
          ...item.content,
          rating_count: item.rating_count,
          avg_rating: item.avg_rating,
        })));
      }
    }

    setLoading(false);
  };

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <img src={cerealBowlLogo} alt="Serialcereal Logo" className="w-32 h-32 neon-glow" />
          <p className="text-xl text-muted-foreground">Your TV social network</p>
        </div>
        <p className="text-muted-foreground">
          Rate shows, share thoughts, and connect with fellow TV enthusiasts
        </p>
        <Button onClick={() => navigate('/auth')} size="lg" className="btn-glow">
          Get Started
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Tabs defaultValue="discover" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-aurora bg-clip-text text-transparent">Discover Shows</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {discoverShows.map((show) => (
                <Card
                  key={show.id}
                  className="cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                  onClick={() => navigate(`/show/${show.id}`)}
                >
                  <div className="aspect-[2/3] bg-muted">
                    {show.image ? (
                      <img src={show.image} alt={show.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm truncate">{show.name}</h3>
                    {show.firstAired && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(show.firstAired).getFullYear()}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-aurora bg-clip-text text-transparent">Trending on Serial Bowl</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : trendingShows.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No trending shows yet. Be the first to rate!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {trendingShows.map((show) => (
                <Card
                  key={show.id}
                  className="cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                  onClick={() => navigate(`/show/${show.external_id}`)}
                >
                  <div className="aspect-[2/3] bg-muted">
                    {show.poster_url ? (
                      <img src={show.poster_url} alt={show.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm truncate">{show.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>⭐ {Number(show.avg_rating).toFixed(1)}</span>
                      <span>• {show.rating_count} ratings</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
