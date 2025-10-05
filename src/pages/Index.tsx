import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTVDB } from '@/hooks/useTVDB';
import { Loader2, ChevronRight } from 'lucide-react';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useTVDB();
  const [userTrendingShows, setUserTrendingShows] = useState<any[]>([]);
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
    
    // Load user's trending shows (based on their activity)
    if (user) {
      const { data: userActivity } = await supabase
        .from('ratings')
        .select('content_id, content!inner(id, title, poster_url, external_id, kind)')
        .eq('user_id', user.id)
        .eq('content.kind', 'show')
        .order('created_at', { ascending: false })
        .limit(20);

      if (userActivity && userActivity.length > 0) {
        setUserTrendingShows(userActivity.map((item: any) => item.content));
      }
    }

    // Load from TVDB - mix of classic and recent popular shows
    try {
      // Popular shows - varied selection
      const popularQueries = ['Succession', 'Ted Lasso', 'Severance', 'The Bear', 'True Detective', 'Fargo'];
      const popularPromises = popularQueries.map(q => search(q));
      const popularResultsArrays = await Promise.all(popularPromises);
      
      const popularResults = popularResultsArrays
        .map(results => results[0])
        .filter(Boolean);
      
      if (popularResults.length > 0) {
        setPopularShows(popularResults);
      } else {
        setPopularShows(samplePopularShows);
      }

      // New/Recent shows - 2023-2024 hits
      const newQueries = ['The Last of Us', 'Fallout', 'Shōgun', 'The Penguin', 'Baby Reindeer', '3 Body Problem'];
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
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <ChevronRight className="h-6 w-6 text-muted-foreground" />
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-4 pb-4">
          {shows.map((show, index) => (
            <div
              key={show.id || index}
              className="cursor-pointer hover:scale-105 transition-transform flex-shrink-0 w-[140px]"
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
                    No Image
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );

  return (
    <div className="container max-w-6xl mx-auto py-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue={userTrendingShows.length > 0 ? "trending" : "popular"} className="w-full">
          <TabsList className="w-full justify-start mb-6">
            {userTrendingShows.length > 0 && <TabsTrigger value="trending">Trending</TabsTrigger>}
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="new">New Releases</TabsTrigger>
          </TabsList>

          {userTrendingShows.length > 0 && (
            <TabsContent value="trending" className="space-y-6">
              <ShowCarousel shows={userTrendingShows} title="Your trending shows" />
            </TabsContent>
          )}

          <TabsContent value="popular" className="space-y-6">
            {popularShows.length > 0 && (
              <ShowCarousel shows={popularShows} title="Popular shows" />
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-6">
            {newShows.length > 0 && (
              <ShowCarousel shows={newShows} title="New releases" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
