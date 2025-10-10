import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Flame, Users, Loader2, MessageSquare, Star } from 'lucide-react';
import { useFeed } from '@/hooks/useFeed';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';
import { supabase } from '@/lib/supabase';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedType, setFeedType] = useState('trending');
  const [contentType, setContentType] = useState('all');
  const { posts, loading, refetch } = useFeed(feedType, contentType);
  console.log(`Home page - feedType: ${feedType}, contentType: ${contentType}, posts:`, posts.length, loading ? 'loading' : 'loaded');
  const [userHideSpoilers, setUserHideSpoilers] = useState(true);
  const [strictSafety, setStrictSafety] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
            const settings = data.settings as any;
            setUserHideSpoilers(settings?.safety?.hide_spoilers ?? true);
            setStrictSafety(settings?.safety?.strict_safety ?? false);
          }
        });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <img src={cerealBowlLogo} alt="Serial Bowl Logo" className="w-32 h-32" />
          <h1 className="text-4xl font-bold tracking-[0.5em] text-center mx-auto">
            <span className="inline-block" style={{ color: '#4DA6FF' }}>S</span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-block" style={{ color: '#FFD84D' }}>E</span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-block" style={{ color: '#4DA6FF' }}>R</span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-block" style={{ color: '#4DA6FF' }}>I</span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-block" style={{ color: '#FFD84D' }}>A</span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-block" style={{ color: '#4DA6FF' }}>L</span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-block" style={{ color: '#4DA6FF' }}>B</span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-block" style={{ color: '#FFD84D' }}>O</span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-block" style={{ color: '#4DA6FF' }}>W</span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-block" style={{ color: '#4DA6FF' }}>L</span>
          </h1>
          <p className="text-xl font-medium text-muted-foreground">Your TV social network</p>
        </div>
        <p className="text-muted-foreground">
          Rate shows, share thoughts, and connect with fellow TV enthusiasts
        </p>
        <Button onClick={() => navigate('/auth')} size="lg">
          Get Started
        </Button>
      </div>
    );
  }

  const emptyMessages = {
    trending: { all: 'No trending posts yet.', thoughts: 'No trending thoughts yet.', reviews: 'No trending reviews yet.' },
    'hot-takes': { all: 'No hot takes yet.', thoughts: 'No controversial thoughts yet.', reviews: 'No controversial reviews yet.' },
    following: { all: 'Follow users to see their posts!', thoughts: 'Follow users to see their thoughts!', reviews: 'Follow users to see their reviews!' }
  };

  const currentMessage = emptyMessages[feedType as keyof typeof emptyMessages]?.[contentType as keyof typeof emptyMessages.trending] || 'No posts yet.';

  return (
    <div className="max-w-2xl mx-auto pb-6">
      {/* Wordmark */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold tracking-[0.5em] mx-auto">
          <span className="inline-block" style={{ color: '#4DA6FF' }}>S</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#FFD84D' }}>E</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>R</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>I</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#FFD84D' }}>A</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>L</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>B</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#FFD84D' }}>O</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>W</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>L</span>
        </h1>
      </div>

      {/* Feed Type Tabs */}
      <Tabs value={feedType} onValueChange={setFeedType} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-0 sticky top-0 z-10 bg-background/80 backdrop-blur-lg rounded-none border-b border-border/30">
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="hot-takes">
            <Flame className="h-4 w-4 mr-2" />
            Hot Takes
          </TabsTrigger>
          <TabsTrigger value="following">
            <Users className="h-4 w-4 mr-2" />
            Following
          </TabsTrigger>
        </TabsList>

        {/* Content Type Tabs */}
        <div className="sticky top-[52px] z-10 bg-background/80 backdrop-blur-lg border-b border-border/30">
          <Tabs value={contentType} onValueChange={setContentType} className="w-full">
            <TabsList className="w-full grid grid-cols-3 rounded-none bg-transparent">
              <TabsTrigger value="all" className="rounded-none">All</TabsTrigger>
              <TabsTrigger value="thoughts" className="rounded-none">
                <MessageSquare className="h-4 w-4 mr-2" />
                Thoughts
              </TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-none">
                <Star className="h-4 w-4 mr-2" />
                Reviews
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <TabsContent value="trending" className="space-y-0 mt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">{currentMessage}</p>
            </div>
          ) : (
            <div className="px-4">
              {posts
                .filter(post => !strictSafety || !post.contains_mature)
                .map((post) => 
                post.type === 'thought' ? (
                  <ThoughtCard 
                    key={post.id} 
                    thought={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onReactionChange={refetch} 
                    onDelete={refetch} 
                  />
                ) : (
                  <ReviewCard 
                    key={post.id} 
                    review={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onDelete={refetch} 
                  />
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hot-takes" className="space-y-0 mt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">{currentMessage}</p>
            </div>
          ) : (
            <div className="px-4">
              {posts
                .filter(post => !strictSafety || !post.contains_mature)
                .map((post) => 
                post.type === 'thought' ? (
                  <ThoughtCard 
                    key={post.id} 
                    thought={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onReactionChange={refetch} 
                    onDelete={refetch} 
                  />
                ) : (
                  <ReviewCard 
                    key={post.id} 
                    review={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onDelete={refetch} 
                  />
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following" className="space-y-0 mt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">{currentMessage}</p>
            </div>
          ) : (
            <div className="px-4">
              {posts
                .filter(post => !strictSafety || !post.contains_mature)
                .map((post) => 
                post.type === 'thought' ? (
                  <ThoughtCard 
                    key={post.id} 
                    thought={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onReactionChange={refetch} 
                    onDelete={refetch} 
                  />
                ) : (
                  <ReviewCard 
                    key={post.id} 
                    review={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onDelete={refetch} 
                  />
                )
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
