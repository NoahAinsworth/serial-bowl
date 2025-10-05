import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTVDB } from '@/hooks/useTVDB';
import { supabase } from '@/lib/supabase';
import { Loader2, TrendingUp, Users, Sparkles } from 'lucide-react';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';
import { ThoughtCard } from '@/components/ThoughtCard';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search: searchTVDB } = useTVDB();
  const [trendingShows, setTrendingShows] = useState<any[]>([]);
  const [followingThoughts, setFollowingThoughts] = useState<any[]>([]);
  const [forYouThoughts, setForYouThoughts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    // Load trending shows based on user ratings
    const { data: topRatedContent } = await supabase
      .from('aggregates')
      .select('content_id, rating_count, avg_rating, content!inner(id, title, poster_url, external_id, kind)')
      .eq('content.kind', 'show')
      .order('rating_count', { ascending: false })
      .limit(12);

    if (topRatedContent) {
      setTrendingShows(topRatedContent.map((item: any) => ({
        ...item.content,
        rating_count: item.rating_count,
        avg_rating: item.avg_rating,
      })));
    }

    if (user) {
      // Load thoughts from people you follow
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];

      if (followingIds.length > 0) {
        const { data: thoughtsData } = await supabase
          .from('thoughts')
          .select(`
            id,
            text_content,
            created_at,
            user_id,
            content_id,
            profiles!thoughts_user_id_fkey(id, handle, avatar_url),
            content(id, title, poster_url, external_id, kind)
          `)
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(20);

        if (thoughtsData) {
          // Get reaction counts for each thought
          const thoughtIds = thoughtsData.map((t: any) => t.id);
          const { data: reactions } = await supabase
            .from('reactions')
            .select('thought_id, reaction_type, user_id')
            .in('thought_id', thoughtIds);

          const { data: comments } = await supabase
            .from('comments')
            .select('thought_id', { count: 'exact', head: true })
            .in('thought_id', thoughtIds);

          const formattedThoughts = thoughtsData.map((thought: any) => {
            const thoughtReactions = reactions?.filter((r: any) => r.thought_id === thought.id) || [];
            const userReaction = thoughtReactions.find((r: any) => r.user_id === user.id);
            
            return {
              id: thought.id,
              user: {
                id: thought.profiles.id,
                handle: thought.profiles.handle,
                avatar_url: thought.profiles.avatar_url,
              },
              content: thought.text_content,
              show: thought.content?.kind === 'show' ? {
                title: thought.content.title,
                external_id: thought.content.external_id,
              } : undefined,
              likes: thoughtReactions.filter((r: any) => r.reaction_type === 'like').length,
              dislikes: thoughtReactions.filter((r: any) => r.reaction_type === 'dislike').length,
              comments: 0,
              rethinks: thoughtReactions.filter((r: any) => r.reaction_type === 'rethink').length,
              userReaction: userReaction?.reaction_type,
            };
          });

          setFollowingThoughts(formattedThoughts);
        }
      }

      // Load "For You" thoughts (all thoughts)
      const { data: allThoughtsData } = await supabase
        .from('thoughts')
        .select(`
          id,
          text_content,
          created_at,
          user_id,
          content_id,
          profiles!thoughts_user_id_fkey(id, handle, avatar_url),
          content(id, title, poster_url, external_id, kind)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (allThoughtsData) {
        const thoughtIds = allThoughtsData.map((t: any) => t.id);
        const { data: reactions } = await supabase
          .from('reactions')
          .select('thought_id, reaction_type, user_id')
          .in('thought_id', thoughtIds);

        const formattedThoughts = allThoughtsData.map((thought: any) => {
          const thoughtReactions = reactions?.filter((r: any) => r.thought_id === thought.id) || [];
          const userReaction = thoughtReactions.find((r: any) => r.user_id === user.id);
          
          return {
            id: thought.id,
            user: {
              id: thought.profiles.id,
              handle: thought.profiles.handle,
              avatar_url: thought.profiles.avatar_url,
            },
            content: thought.text_content,
            show: thought.content?.kind === 'show' ? {
              title: thought.content.title,
              external_id: thought.content.external_id,
            } : undefined,
            likes: thoughtReactions.filter((r: any) => r.reaction_type === 'like').length,
            dislikes: thoughtReactions.filter((r: any) => r.reaction_type === 'dislike').length,
            comments: 0,
            rethinks: thoughtReactions.filter((r: any) => r.reaction_type === 'rethink').length,
            userReaction: userReaction?.reaction_type,
          };
        });

        setForYouThoughts(formattedThoughts);
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
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="feed">
            <Sparkles className="h-4 w-4 mr-2" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <Tabs defaultValue="foryou" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="foryou">For You</TabsTrigger>
              <TabsTrigger value="following">
                <Users className="h-4 w-4 mr-2" />
                Following
              </TabsTrigger>
            </TabsList>

            <TabsContent value="foryou">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : forYouThoughts.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No thoughts yet. Start sharing!</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {forYouThoughts.map((thought) => (
                    <ThoughtCard
                      key={thought.id}
                      thought={thought}
                      onDelete={loadData}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="following">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : followingThoughts.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    Follow users to see their thoughts here
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/search')}
                  >
                    Find Users
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {followingThoughts.map((thought) => (
                    <ThoughtCard
                      key={thought.id}
                      thought={thought}
                      onDelete={loadData}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="trending">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Trending Shows</h2>
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
