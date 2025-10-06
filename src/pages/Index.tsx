import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, TrendingUp, ThumbsDown, Star, Plus } from 'lucide-react';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';
import { CerealBowlIcon } from '@/components/CerealBowlIcon';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('trending');

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user, activeTab]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current || !hasMore || loadingMore) return;
      
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        loadMoreData();
      }
    };

    const scrollElement = scrollRef.current;
    scrollElement?.addEventListener('scroll', handleScroll);
    return () => scrollElement?.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, activeTab, page]);

  const loadInitialData = async () => {
    setLoading(true);
    setPage(0);
    setHasMore(true);
    
    if (activeTab === 'reviews') {
      await loadReviews(0);
    } else {
      await loadThoughts(0, activeTab);
    }
    
    setLoading(false);
  };

  const loadMoreData = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    
    if (activeTab === 'reviews') {
      await loadReviews(nextPage);
    } else {
      await loadThoughts(nextPage, activeTab);
    }
    
    setPage(nextPage);
    setLoadingMore(false);
  };

  const loadThoughts = async (pageNum: number, tab: string) => {
    const limit = 20;
    const offset = pageNum * limit;

    // Fetch thoughts with user and content info
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
      .range(offset, offset + limit - 1);

    if (!thoughtsData || thoughtsData.length === 0) {
      setHasMore(false);
      if (pageNum === 0) setThoughts([]);
      return;
    }

    // Get reaction counts and user reactions for each thought
    const thoughtsWithCounts = await Promise.all(
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

        // Determine what to show based on content kind
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

    // Sort based on tab
    let sortedThoughts = [...thoughtsWithCounts];
    if (tab === 'trending') {
      sortedThoughts.sort((a, b) => b.totalInteractions - a.totalInteractions);
    } else if (tab === 'hot-takes') {
      sortedThoughts.sort((a, b) => b.dislikes - a.dislikes);
    }

    if (pageNum === 0) {
      setThoughts(sortedThoughts);
    } else {
      setThoughts(prev => [...prev, ...sortedThoughts]);
    }

    if (thoughtsData.length < limit) {
      setHasMore(false);
    }
  };

  const loadReviews = async (pageNum: number) => {
    const limit = 20;
    const offset = pageNum * limit;

    // Fetch reviews with user info, ratings, and content
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
      .range(offset, offset + limit - 1);

    if (!reviewsData || reviewsData.length === 0) {
      setHasMore(false);
      if (pageNum === 0) setReviews([]);
      return;
    }

    // Get ratings for each review
    const reviewsWithRatings = await Promise.all(
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

    if (pageNum === 0) {
      setReviews(reviewsWithRatings);
    } else {
      setReviews(prev => [...prev, ...reviewsWithRatings]);
    }

    if (reviewsData.length < limit) {
      setHasMore(false);
    }
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
      <div className="flex justify-between items-center mb-6">
        <CerealBowlIcon size={48} />
        <Button onClick={() => navigate('/post')} className="gap-2 btn-glow">
          <Plus className="h-4 w-4" />
          Post
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-6">
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="hot-takes">
            <ThumbsDown className="h-4 w-4 mr-2" />
            Hot Takes
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Star className="h-4 w-4 mr-2" />
            Reviews
          </TabsTrigger>
        </TabsList>

        <div ref={scrollRef} className="max-h-[calc(100vh-240px)] overflow-y-auto">
          <TabsContent value="trending" className="space-y-4 mt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : thoughts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No thoughts yet. Be the first to post!
              </div>
            ) : (
              <>
                {thoughts.map((thought) => (
                  <ThoughtCard
                    key={thought.id}
                    thought={thought}
                    onReactionChange={() => loadInitialData()}
                    onDelete={() => loadInitialData()}
                  />
                ))}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="hot-takes" className="space-y-4 mt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : thoughts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No hot takes yet!
              </div>
            ) : (
              <>
                {thoughts.map((thought) => (
                  <ThoughtCard
                    key={thought.id}
                    thought={thought}
                    onReactionChange={() => loadInitialData()}
                    onDelete={() => loadInitialData()}
                  />
                ))}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4 mt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No reviews yet. Share your first review!
              </div>
            ) : (
              <>
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
