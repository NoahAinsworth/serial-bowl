import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { tvdbClient } from '@/services/tvdb';
import { Loader2, TrendingUp, Compass } from 'lucide-react';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trendingShows, setTrendingShows] = useState<any[]>([]);
  const [popularShows, setPopularShows] = useState<any[]>([]);
  const [newShows, setNewShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    // Load trending shows based on database ratings
    const { data: topRatedContent } = await supabase
      .from('aggregates')
      .select('content_id, rating_count, avg_rating, content!inner(id, title, poster_url, external_id, kind)')
      .eq('content.kind', 'show')
      .order('rating_count', { ascending: false })
      .limit(20);

    if (topRatedContent) {
      setTrendingShows(topRatedContent.map((item: any) => ({
        ...item.content,
        rating_count: item.rating_count,
        avg_rating: item.avg_rating,
      })));
    }

    // Load popular and new shows from TVDB
    try {
      // Search for popular shows
      const popularResults = await tvdbClient.searchShows('the');
      setPopularShows(popularResults.slice(0, 20));

      // Search for new shows (2024 releases)
      const newResults = await tvdbClient.searchShows('2024');
      setNewShows(newResults.slice(0, 20));
    } catch (error) {
      console.error('Error loading TVDB shows:', error);
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

  const ShowCarousel = ({ shows, title }: { shows: any[], title: string }) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 px-4">{title}</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 px-4 pb-4">
          {shows.map((show) => (
            <Card
              key={show.id}
              className="cursor-pointer hover:scale-105 transition-transform overflow-hidden flex-shrink-0 w-[140px]"
              onClick={() => navigate(`/show/${show.id || show.external_id}`)}
            >
              <div className="aspect-[2/3] bg-muted">
                {(show.poster_url || show.image) ? (
                  <img 
                    src={show.poster_url || show.image} 
                    alt={show.title || show.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2">
                    No Image
                  </div>
                )}
              </div>
              <div className="p-2">
                <h3 className="font-semibold text-xs truncate">{show.title || show.name}</h3>
                {show.avg_rating && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <span>⭐ {Number(show.avg_rating).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );

  return (
    <div className="container max-w-6xl mx-auto py-6">
      <Tabs defaultValue="discover" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-6 mx-4">
          <TabsTrigger value="discover">
            <Compass className="h-4 w-4 mr-2" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {popularShows.length > 0 && (
                <ShowCarousel shows={popularShows} title="Popular Shows" />
              )}
              {newShows.length > 0 && (
                <ShowCarousel shows={newShows} title="New Releases" />
              )}
              {popularShows.length === 0 && newShows.length === 0 && (
                <Card className="p-12 text-center mx-4">
                  <p className="text-muted-foreground">No shows available</p>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : trendingShows.length === 0 ? (
            <Card className="p-12 text-center mx-4">
              <p className="text-muted-foreground">No trending shows yet. Be the first to rate!</p>
            </Card>
          ) : (
            <ShowCarousel shows={trendingShows} title="Trending on Serialcereal" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
