import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTVDB } from '@/hooks/useTVDB';
import { Loader2, TrendingUp, Compass } from 'lucide-react';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useTVDB();
  const [trendingShows, setTrendingShows] = useState<any[]>([]);
  const [popularShows, setPopularShows] = useState<any[]>([]);
  const [newShows, setNewShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sample show data for popular shows
  const samplePopularShows = [
    { id: 121361, name: 'The Last of Us', image: 'https://artworks.thetvdb.com/banners/v4/series/392256/posters/63689372.jpg' },
    { id: 328487, name: 'The Boys', image: 'https://artworks.thetvdb.com/banners/v4/series/355567/posters/62554138.jpg' },
    { id: 82856, name: 'The Mandalorian', image: 'https://artworks.thetvdb.com/banners/v4/series/361753/posters/61892024.jpg' },
    { id: 121361, name: 'Wednesday', image: 'https://artworks.thetvdb.com/banners/v4/series/395985/posters/63374619.jpg' },
    { id: 305074, name: 'The Witcher', image: 'https://artworks.thetvdb.com/banners/v4/series/362696/posters/63414221.jpg' },
    { id: 366524, name: 'House of the Dragon', image: 'https://artworks.thetvdb.com/banners/v4/series/371572/posters/62477381.jpg' },
    { id: 279121, name: 'Loki', image: 'https://artworks.thetvdb.com/banners/v4/series/367557/posters/62068448.jpg' },
    { id: 383121, name: 'Stranger Things', image: 'https://artworks.thetvdb.com/banners/v4/series/305074/posters/62171138.jpg' },
    { id: 328487, name: 'Breaking Bad', image: 'https://artworks.thetvdb.com/banners/posters/81189-22.jpg' },
    { id: 366524, name: 'Game of Thrones', image: 'https://artworks.thetvdb.com/banners/posters/121361-51.jpg' },
  ];

  const sampleNewShows = [
    { id: 419124, name: 'Fallout', image: 'https://artworks.thetvdb.com/banners/v4/series/416477/posters/64235416.jpg' },
    { id: 421453, name: 'Shōgun', image: 'https://artworks.thetvdb.com/banners/v4/series/390777/posters/64161137.jpg' },
    { id: 414906, name: 'The Penguin', image: 'https://artworks.thetvdb.com/banners/v4/series/427173/posters/65128734.jpg' },
    { id: 392256, name: '3 Body Problem', image: 'https://artworks.thetvdb.com/banners/v4/series/392256/posters/63689372.jpg' },
    { id: 410788, name: 'Baby Reindeer', image: 'https://artworks.thetvdb.com/banners/v4/series/437064/posters/64556917.jpg' },
    { id: 403490, name: 'Masters of the Air', image: 'https://artworks.thetvdb.com/banners/v4/series/383121/posters/63882914.jpg' },
    { id: 425480, name: 'A Gentleman in Moscow', image: 'https://artworks.thetvdb.com/banners/v4/series/407386/posters/64212843.jpg' },
    { id: 401371, name: 'Ripley', image: 'https://artworks.thetvdb.com/banners/v4/series/401371/posters/64305064.jpg' },
  ];

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

    if (topRatedContent && topRatedContent.length > 0) {
      setTrendingShows(topRatedContent.map((item: any) => ({
        ...item.content,
        rating_count: item.rating_count,
        avg_rating: item.avg_rating,
      })));
    }

    // Load popular and trending shows from TVDB
    try {
      // Search for various popular shows
      const popularQueries = ['Game of Thrones', 'Breaking Bad', 'The Office', 'Friends', 'The Sopranos'];
      const popularPromises = popularQueries.map(q => search(q));
      const popularResultsArrays = await Promise.all(popularPromises);
      
      // Take first result from each search
      const popularResults = popularResultsArrays
        .map(results => results[0])
        .filter(Boolean);
      
      if (popularResults.length > 0) {
        setPopularShows(popularResults);
      } else {
        setPopularShows(samplePopularShows);
      }

      // Search for new/recent shows
      const newQueries = ['The Last of Us', 'House of the Dragon', 'Wednesday', 'Fallout', 'The Bear'];
      const newPromises = newQueries.map(q => search(q));
      const newResultsArrays = await Promise.all(newPromises);
      
      const newResults = newResultsArrays
        .map(results => results[0])
        .filter(Boolean);
      
      if (newResults.length > 0) {
        setNewShows(newResults);
      } else {
        setNewShows(sampleNewShows);
      }
    } catch (error) {
      console.error('Error loading from TVDB:', error);
      setPopularShows(samplePopularShows);
      setNewShows(sampleNewShows);
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
        <div className="flex gap-3 px-4 pb-4">
          {shows.map((show, index) => (
            <Card
              key={show.id || index}
              className="cursor-pointer hover:scale-105 transition-transform overflow-hidden flex-shrink-0 w-[45%] min-w-[160px]"
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
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                    No Image
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm line-clamp-1">{show.title || show.name}</h3>
                {show.avg_rating && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <span>⭐ {Number(show.avg_rating).toFixed(1)}</span>
                  </div>
                )}
                {show.firstAired && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(show.firstAired).getFullYear()}
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
