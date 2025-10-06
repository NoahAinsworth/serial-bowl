import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, Flame, Zap, Star, Sparkles, Plus } from 'lucide-react';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';
import { CerealBowlIcon } from '@/components/CerealBowlIcon';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trendingThoughts, setTrendingThoughts] = useState<any[]>([]);
  const [trendingReviews, setTrendingReviews] = useState<any[]>([]);
  const [hotTakesThoughts, setHotTakesThoughts] = useState<any[]>([]);
  const [hotTakesReviews, setHotTakesReviews] = useState<any[]>([]);
  const [bingeThoughts, setBingeThoughts] = useState<any[]>([]);
  const [bingeReviews, setBingeReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('trending');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadTrendingData(),
      loadHotTakesData(),
      loadBingeData()
    ]);
    setLoading(false);
  };

  const loadTrendingData = async () => {
    const limit = 10;
    
    // Load trending thoughts
    const { data: thoughtsData } = await supabase
      .from('thoughts')
      .select(`
        id,
        user_id,
        text_content,
        content_id,
        created_at,
        profiles!thoughts_user_id_fkey (
          id,
          handle,
          avatar_url
        ),
        content (
          id,
          title,
          external_id,
          kind,
          metadata
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    const thoughtsWithCounts = await processThoughts(thoughtsData || []);
    const sortedThoughts = thoughtsWithCounts.sort((a, b) => b.totalInteractions - a.totalInteractions);
    setTrendingThoughts(sortedThoughts);

    // Load trending reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        user_id,
        review_text,
        content_id,
        created_at,
        profiles!reviews_user_id_fkey (
          id,
          handle,
          avatar_url
        ),
        content (
          id,
          title,
          poster_url,
          external_id,
          kind
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    const reviewsWithRatings = await processReviews(reviewsData || []);
    setTrendingReviews(reviewsWithRatings);
  };

  const loadHotTakesData = async () => {
    const limit = 10;
    
    const { data: thoughtsData } = await supabase
      .from('thoughts')
      .select(`
        id,
        user_id,
        text_content,
        content_id,
        created_at,
        profiles!thoughts_user_id_fkey (
          id,
          handle,
          avatar_url
        ),
        content (
          id,
          title,
          external_id,
          kind,
          metadata
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    const thoughtsWithCounts = await processThoughts(thoughtsData || []);
    const sortedThoughts = thoughtsWithCounts.sort((a, b) => b.dislikes - a.dislikes);
    setHotTakesThoughts(sortedThoughts);

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        user_id,
        review_text,
        content_id,
        created_at,
        profiles!reviews_user_id_fkey (
          id,
          handle,
          avatar_url
        ),
        content (
          id,
          title,
          poster_url,
          external_id,
          kind
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    const reviewsWithRatings = await processReviews(reviewsData || []);
    setHotTakesReviews(reviewsWithRatings);
  };

  const loadBingeData = async () => {
    const limit = 10;
    
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user!.id);

    const followingIds = follows?.map(f => f.following_id) || [];

    const { data: thoughtsData } = await supabase
      .from('thoughts')
      .select(`
        id,
        user_id,
        text_content,
        content_id,
        created_at,
        profiles!thoughts_user_id_fkey (
          id,
          handle,
          avatar_url
        ),
        content (
          id,
          title,
          external_id,
          kind,
          metadata
        )
      `)
      .in('user_id', followingIds.length > 0 ? followingIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })
      .limit(limit);

    const thoughtsWithCounts = await processThoughts(thoughtsData || []);
    setBingeThoughts(thoughtsWithCounts);

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        user_id,
        review_text,
        content_id,
        created_at,
        profiles!reviews_user_id_fkey (
          id,
          handle,
          avatar_url
        ),
        content (
          id,
          title,
          poster_url,
          external_id,
          kind
        )
      `)
      .in('user_id', followingIds.length > 0 ? followingIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })
      .limit(limit);

    const reviewsWithRatings = await processReviews(reviewsData || []);
    setBingeReviews(reviewsWithRatings);
  };

  const processThoughts = async (thoughtsData: any[]) => {
    return await Promise.all(
      thoughtsData.map(async (thought: any) => {
        const { data: reactions } = await supabase
          .from('reactions')
          .select('reaction_type')
          .eq('thought_id', thought.id);

        const { data: comments } = await supabase
          .from('comments')
          .select('id')
          .eq('thought_id', thought.id);

        const { data: userReaction } = await supabase
          .from('reactions')
          .select('reaction_type')
          .eq('thought_id', thought.id)
          .eq('user_id', user?.id || '')
          .maybeSingle();

        const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
        const dislikes = reactions?.filter(r => r.reaction_type === 'dislike').length || 0;
        const rethinks = reactions?.filter(r => r.reaction_type === 'rethink').length || 0;
        const totalInteractions = likes + dislikes + rethinks;

        let contentDisplay: any = undefined;
        if (thought.content) {
          if (thought.content.kind === 'show') {
            contentDisplay = {
              show: { 
                title: thought.content.title, 
                external_id: thought.content.external_id 
              }
            };
          } else if (thought.content.kind === 'season') {
            const metadata = thought.content.metadata as any;
            contentDisplay = {
              season: {
                title: thought.content.title,
                external_id: thought.content.external_id,
                show_external_id: metadata?.show_id
              }
            };
          } else if (thought.content.kind === 'episode') {
            const metadata = thought.content.metadata as any;
            contentDisplay = {
              episode: {
                title: thought.content.title,
                external_id: thought.content.external_id,
                season_external_id: metadata?.season_number,
                show_external_id: metadata?.show_id
              }
            };
          }
        }

        return {
          id: thought.id,
          user: {
            id: thought.profiles.id,
            handle: thought.profiles.handle,
            avatar_url: thought.profiles.avatar_url,
          },
          content: thought.text_content,
          ...contentDisplay,
          likes,
          dislikes,
          comments: comments?.length || 0,
          rethinks,
          totalInteractions,
          userReaction: userReaction?.reaction_type,
        };
      })
    );
  };

  const processReviews = async (reviewsData: any[]) => {
    return await Promise.all(
      reviewsData.map(async (review: any) => {
        const { data: rating } = await supabase
          .from('ratings')
          .select('rating')
          .eq('user_id', review.user_id)
          .eq('content_id', review.content_id)
          .maybeSingle();

        return {
          id: review.id,
          user: {
            id: review.profiles.id,
            handle: review.profiles.handle,
            avatar_url: review.profiles.avatar_url,
          },
          reviewText: review.review_text,
          rating: rating?.rating || 0,
          content: review.content,
          createdAt: review.created_at,
        };
      })
    );
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
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <div className="flex justify-center items-center mb-6">
        <CerealBowlIcon size={56} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-6">
          <TabsTrigger 
            value="trending" 
            className="transition-all data-[state=active]:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
          >
            Trending
          </TabsTrigger>
          <TabsTrigger 
            value="hot-takes" 
            className="transition-all data-[state=active]:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
          >
            Hot Takes
          </TabsTrigger>
          <TabsTrigger 
            value="binge" 
            className="transition-all data-[state=active]:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
          >
            Binge
          </TabsTrigger>
        </TabsList>

        <div ref={scrollRef} className="max-h-[calc(100vh-240px)] overflow-y-auto space-y-8">
          <TabsContent value="trending" className="mt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold px-2">Reviews</h3>
                  {trendingReviews.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No reviews yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trendingReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold px-2">Thoughts</h3>
                  {trendingThoughts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No thoughts yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trendingThoughts.map((thought) => (
                        <ThoughtCard
                          key={thought.id}
                          thought={thought}
                          onReactionChange={() => loadData()}
                          onDelete={() => loadData()}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="hot-takes" className="mt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold px-2">Reviews</h3>
                  {hotTakesReviews.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No reviews yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hotTakesReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold px-2">Thoughts</h3>
                  {hotTakesThoughts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No thoughts yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hotTakesThoughts.map((thought) => (
                        <ThoughtCard
                          key={thought.id}
                          thought={thought}
                          onReactionChange={() => loadData()}
                          onDelete={() => loadData()}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="binge" className="mt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : bingeReviews.length === 0 && bingeThoughts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                Start following users to see their content here!
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold px-2">Reviews</h3>
                  {bingeReviews.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No reviews yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bingeReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold px-2">Thoughts</h3>
                  {bingeThoughts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No thoughts yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bingeThoughts.map((thought) => (
                        <ThoughtCard
                          key={thought.id}
                          thought={thought}
                          onReactionChange={() => loadData()}
                          onDelete={() => loadData()}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <Button 
        onClick={() => navigate('/post')} 
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full btn-glow shadow-lg"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
