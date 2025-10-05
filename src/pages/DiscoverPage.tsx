import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Compass, TrendingUp, Sparkles } from 'lucide-react';
import { TrendingShows } from '@/components/TrendingShows';

interface RecommendedShow {
  id: string;
  title: string;
  poster_url?: string;
  external_id: string;
  avg_rating: number;
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommended, setRecommended] = useState<RecommendedShow[]>([]);
  const [topRated, setTopRated] = useState<RecommendedShow[]>([]);

  useEffect(() => {
    loadTopRated();
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  const loadTopRated = async () => {
    const { data } = await supabase
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
      .limit(100);

    if (data) {
      const showMap = new Map<string, RecommendedShow & { count: number }>();
      
      data.forEach((rating: any) => {
        if (!rating.content) return;
        
        const show = showMap.get(rating.content_id) || {
          id: rating.content_id,
          title: rating.content.title,
          poster_url: rating.content.poster_url,
          external_id: rating.content.external_id,
          avg_rating: 0,
          count: 0,
        };

        show.avg_rating = ((show.avg_rating * show.count) + rating.rating) / (show.count + 1);
        show.count++;
        
        showMap.set(rating.content_id, show);
      });

      const sorted = Array.from(showMap.values())
        .filter(show => show.count >= 3)
        .sort((a, b) => b.avg_rating - a.avg_rating)
        .slice(0, 10);

      setTopRated(sorted);
    }
  };

  const loadRecommendations = async () => {
    if (!user) return;

    // Get user's top-rated shows
    const { data: userRatings } = await supabase
      .from('ratings')
      .select('content_id, rating')
      .eq('user_id', user.id)
      .gte('rating', 4)
      .limit(10);

    if (userRatings && userRatings.length > 0) {
      // Find shows rated by similar users
      const contentIds = userRatings.map(r => r.content_id);
      
      const { data: similarRatings } = await supabase
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
        .in('user_id', await getSimilarUsers(contentIds))
        .eq('content.kind', 'show')
        .gte('rating', 4)
        .not('content_id', 'in', `(${contentIds.join(',')})`)
        .limit(50);

      if (similarRatings) {
        const showMap = new Map<string, RecommendedShow & { count: number }>();
        
        similarRatings.forEach((rating: any) => {
          if (!rating.content) return;
          
          const show = showMap.get(rating.content_id) || {
            id: rating.content_id,
            title: rating.content.title,
            poster_url: rating.content.poster_url,
            external_id: rating.content.external_id,
            avg_rating: 0,
            count: 0,
          };

          show.avg_rating = ((show.avg_rating * show.count) + rating.rating) / (show.count + 1);
          show.count++;
          
          showMap.set(rating.content_id, show);
        });

        const sorted = Array.from(showMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setRecommended(sorted);
      }
    }
  };

  const getSimilarUsers = async (contentIds: string[]) => {
    const { data } = await supabase
      .from('ratings')
      .select('user_id')
      .in('content_id', contentIds)
      .gte('rating', 4);

    const userCounts = new Map<string, number>();
    data?.forEach(r => {
      userCounts.set(r.user_id, (userCounts.get(r.user_id) || 0) + 1);
    });

    return Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId]) => userId);
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Compass className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold neon-glow">Discover</h1>
      </div>

      <Tabs defaultValue="trending" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="top">
            <Sparkles className="h-4 w-4 mr-2" />
            Top Rated
          </TabsTrigger>
          {user && (
            <TabsTrigger value="foryou">For You</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="trending" className="mt-6">
          <TrendingShows />
        </TabsContent>

        <TabsContent value="top" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {topRated.map((show) => (
              <Card
                key={show.id}
                className="cursor-pointer hover:border-primary/50 transition-all hover-scale overflow-hidden"
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
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {user && (
          <TabsContent value="foryou" className="mt-6">
            {recommended.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  Rate some shows to get personalized recommendations!
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {recommended.map((show) => (
                  <Card
                    key={show.id}
                    className="cursor-pointer hover:border-primary/50 transition-all hover-scale overflow-hidden"
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
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}