import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTVDB } from '@/hooks/useTVDB';
import { Compass, TrendingUp, Loader2, ChevronRight, Star, Flame } from 'lucide-react';
import { BingeBotAI } from '@/components/BingeBotAI';

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
  const [browseShows, setBrowseShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [bingeBotPrompt, setBingeBotPrompt] = useState<string>("");
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (page > 0) {
      loadMoreShows();
    }
  }, [page]);

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

    // Load initial browse shows
    await loadInitialBrowseShows();

    setLoading(false);
  };

  const loadInitialBrowseShows = async () => {
    try {
      const queries = [
        'Breaking Bad', 'Game of Thrones', 'Succession', 'Ted Lasso', 
        'Severance', 'The Bear', 'The Last of Us', 'Fallout', 
        'Shōgun', 'The Penguin', 'Baby Reindeer', '3 Body Problem',
        'True Detective', 'Fargo', 'The Wire', 'The Sopranos',
        'Better Call Saul', 'Stranger Things', 'The Boys', 'The Mandalorian'
      ];
      
      const promises = queries.map(q => search(q));
      const resultsArrays = await Promise.all(promises);
      
      const results = resultsArrays
        .map(results => results[0])
        .filter(Boolean);
      
      setBrowseShows(results.sort(() => Math.random() - 0.5));
    } catch (error) {
      console.error('Error loading browse shows:', error);
    }
  };

  const loadMoreShows = async () => {
    setLoadingMore(true);
    try {
      const moreQueries = [
        'House of the Dragon', 'Loki', 'Wednesday', 'The Witcher',
        'Westworld', 'Ozark', 'The Crown', 'Peaky Blinders',
        'Dark', 'Chernobyl', 'Band of Brothers', 'The Office',
        'Parks and Recreation', 'Community', 'Atlanta', 'Barry',
        'Euphoria', 'The White Lotus', 'Only Murders in the Building', 'Poker Face'
      ];
      
      const startIndex = page * 10;
      const endIndex = startIndex + 10;
      const queriesForPage = moreQueries.slice(startIndex, endIndex);
      
      if (queriesForPage.length > 0) {
        const promises = queriesForPage.map(q => search(q));
        const resultsArrays = await Promise.all(promises);
        
        const results = resultsArrays
          .map(results => results[0])
          .filter(Boolean);
        
        setBrowseShows(prev => [...prev, ...results]);
      }
    } catch (error) {
      console.error('Error loading more shows:', error);
    }
    setLoadingMore(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollPosition = target.scrollTop + target.clientHeight;
    const scrollHeight = target.scrollHeight;
    
    // Load more when scrolled to 80% of the content
    if (scrollPosition >= scrollHeight * 0.8 && !loadingMore && page < 5) {
      setPage(prev => prev + 1);
    }
  };

  const handleAskBingeBot = (showName: string, tvdbId: string) => {
    setBingeBotPrompt(`Tell me about ${showName} (TVDB:${tvdbId}).`);
    setChatOpen(true);
  };

  const ShowPoster = ({ show, onClick, onAskBot }: { show: any, onClick: () => void, onAskBot?: () => void }) => (
    <div className="cursor-pointer hover-scale transition-transform flex-shrink-0 w-[140px] relative group">
      <div onClick={onClick}>
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
      {onAskBot && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAskBot();
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium hover:bg-primary/90"
        >
          Ask Bot
        </button>
      )}
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
                          onAskBot={() => handleAskBingeBot(show.title, show.external_id)}
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
                          onAskBot={() => handleAskBingeBot(show.title, show.external_id)}
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
            <div 
              className="px-4 max-h-[calc(100vh-250px)] overflow-y-auto"
              onScroll={handleScroll}
            >
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 pb-4">
                {browseShows.map((show, index) => (
                  <div
                    key={`${show.id}-${index}`}
                    className="cursor-pointer hover-scale transition-transform relative group"
                  >
                    <div onClick={() => navigate(`/show/${show.id || show.external_id}`)}>
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAskBingeBot(show.title || show.name, show.id || show.external_id);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium hover:bg-primary/90"
                    >
                      Ask Bot
                    </button>
                  </div>
                ))}
              </div>
              {loadingMore && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Floating Binge Bot Button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-20 right-6 rounded-full h-14 w-14 bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform z-50 flex items-center justify-center"
        title="Ask about a show"
      >
        <Compass className="h-6 w-6" />
      </button>

      {/* Binge Bot Modal */}
      <BingeBotAI 
        open={chatOpen} 
        onOpenChange={setChatOpen} 
        initialPrompt={bingeBotPrompt} 
      />
    </div>
  );
}