import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';
import serialBowlWordmark from '@/assets/serial-bowl-wordmark.png';
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
  const [trendingSubTab, setTrendingSubTab] = useState('reviews');
  const [hotTakesSubTab, setHotTakesSubTab] = useState('reviews');
  const [bingeSubTab, setBingeSubTab] = useState('reviews');

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-6 bg-transparent border-0 p-0 gap-2">
          <TabsTrigger 
            value="trending" 
            className="relative overflow-hidden bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 data-[state=active]:border-[#ff6b35] data-[state=active]:from-[#ff6b35]/20 data-[state=active]:to-[#f7931e]/20 before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-[#ff6b35] before:to-[#f7931e] data-[state=active]:before:h-[3px] after:absolute after:top-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-[#ff6b35]/50 after:to-transparent"
          >
            Trending
          </TabsTrigger>
          <TabsTrigger 
            value="hot-takes" 
            className="relative overflow-hidden bg-gradient-to-r from-[#f7931e]/10 to-[#00d4aa]/10 border border-[#f7931e]/30 data-[state=active]:border-[#00d4aa] data-[state=active]:from-[#f7931e]/20 data-[state=active]:to-[#00d4aa]/20 before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-[#f7931e] before:to-[#00d4aa] data-[state=active]:before:h-[3px] after:absolute after:top-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-[#00d4aa]/50 after:to-transparent"
          >
            Hot Takes
          </TabsTrigger>
          <TabsTrigger 
            value="binge" 
            className="relative overflow-hidden bg-gradient-to-r from-[#00d4aa]/10 to-[#0ea5e9]/10 border border-[#00d4aa]/30 data-[state=active]:border-[#0ea5e9] data-[state=active]:from-[#00d4aa]/20 data-[state=active]:to-[#0ea5e9]/20 before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-[#00d4aa] before:to-[#0ea5e9] data-[state=active]:before:h-[3px] after:absolute after:top-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-[#0ea5e9]/50 after:to-transparent"
          >
            Binge
          </TabsTrigger>
        </TabsList>

        <div ref={scrollRef} className="max-h-[calc(100vh-240px)] overflow-y-auto">
          <TabsContent value="trending" className="mt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs value={trendingSubTab} onValueChange={setTrendingSubTab} className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-4 bg-transparent border-0 p-0 gap-2">
                  <TabsTrigger 
                    value="reviews"
                    className="relative overflow-hidden bg-gradient-to-r from-[#a855f7]/10 to-[#ec4899]/10 border border-[#a855f7]/30 data-[state=active]:border-[#ec4899] data-[state=active]:from-[#a855f7]/20 data-[state=active]:to-[#ec4899]/20 before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-[#a855f7] before:to-[#ec4899] data-[state=active]:before:h-[3px]"
                  >
                    Reviews
                  </TabsTrigger>
                  <TabsTrigger 
                    value="thoughts"
                    className="relative overflow-hidden bg-gradient-to-r from-[#ec4899]/10 to-[#f97316]/10 border border-[#ec4899]/30 data-[state=active]:border-[#f97316] data-[state=active]:from-[#ec4899]/20 data-[state=active]:to-[#f97316]/20 before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-[#ec4899] before:to-[#f97316] data-[state=active]:before:h-[3px]"
                  >
                    Thoughts
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reviews" className="space-y-4 mt-0 animate-fade-in">
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
                </TabsContent>

                <TabsContent value="thoughts" className="space-y-4 mt-0 animate-fade-in">
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
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="hot-takes" className="mt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs value={hotTakesSubTab} onValueChange={setHotTakesSubTab} className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-4 bg-transparent border-0 p-0 gap-2">
                  <TabsTrigger 
                    value="reviews"
                    className="relative overflow-hidden bg-gradient-to-r from-[#a855f7]/10 to-[#ec4899]/10 border border-[#a855f7]/30 data-[state=active]:border-[#ec4899] data-[state=active]:from-[#a855f7]/20 data-[state=active]:to-[#ec4899]/20 before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-[#a855f7] before:to-[#ec4899] data-[state=active]:before:h-[3px]"
                  >
                    Reviews
                  </TabsTrigger>
                  <TabsTrigger 
                    value="thoughts"
                    className="relative overflow-hidden bg-gradient-to-r from-[#ec4899]/10 to-[#f97316]/10 border border-[#ec4899]/30 data-[state=active]:border-[#f97316] data-[state=active]:from-[#ec4899]/20 data-[state=active]:to-[#f97316]/20 before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-[#ec4899] before:to-[#f97316] data-[state=active]:before:h-[3px]"
                  >
                    Thoughts
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reviews" className="space-y-4 mt-0 animate-fade-in">
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
                </TabsContent>

                <TabsContent value="thoughts" className="space-y-4 mt-0 animate-fade-in">
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
                </TabsContent>
              </Tabs>
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
              <Tabs value={bingeSubTab} onValueChange={setBingeSubTab} className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-4 bg-transparent border-0 p-0 gap-2">
                  <TabsTrigger 
                    value="reviews"
                    className="relative overflow-hidden bg-gradient-to-r from-[#a855f7]/10 to-[#ec4899]/10 border border-[#a855f7]/30 data-[state=active]:border-[#ec4899] data-[state=active]:from-[#a855f7]/20 data-[state=active]:to-[#ec4899]/20 before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-[#a855f7] before:to-[#ec4899] data-[state=active]:before:h-[3px]"
                  >
                    Reviews
                  </TabsTrigger>
                  <TabsTrigger 
                    value="thoughts"
                    className="relative overflow-hidden bg-gradient-to-r from-[#ec4899]/10 to-[#f97316]/10 border border-[#ec4899]/30 data-[state=active]:border-[#f97316] data-[state=active]:from-[#ec4899]/20 data-[state=active]:to-[#f97316]/20 before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-[#ec4899] before:to-[#f97316] data-[state=active]:before:h-[3px]"
                  >
                    Thoughts
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reviews" className="space-y-4 mt-0 animate-fade-in">
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
                </TabsContent>

                <TabsContent value="thoughts" className="space-y-4 mt-0 animate-fade-in">
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
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
