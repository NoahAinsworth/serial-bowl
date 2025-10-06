import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, RefreshCw } from 'lucide-react';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';
import serialBowlWordmark from '@/assets/serial-bowl-wordmark.png';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';
import { CerealBowlIcon } from '@/components/CerealBowlIcon';
import { useFeed } from '@/hooks/useFeed';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trending');
  const [postType, setPostType] = useState<'all' | 'thoughts' | 'reviews'>('all');
  
  // Use the feed hook for each tab
  const trendingFeed = useFeed('trending');
  const hotTakesFeed = useFeed('hot');
  const reviewsFeed = useFeed('reviews');
  const bingeFeed = useFeed('binge');

  // Map tab to appropriate feed
  const getFeedForTab = () => {
    switch (activeTab) {
      case 'trending':
        return trendingFeed;
      case 'hot-takes':
        return hotTakesFeed;
      case 'reviews':
        return reviewsFeed;
      case 'binge':
        return bingeFeed;
      default:
        return trendingFeed;
    }
  };

  const currentFeed = getFeedForTab();
  
  // Pull to refresh for current feed
  const { isRefreshing } = usePullToRefresh({ 
    onRefresh: async () => currentFeed.refetch(),
    disabled: currentFeed.loading,
  });

  const renderPost = (post: any) => {
    if (post.type === 'review') {
      return (
        <ReviewCard
          key={post.id}
          review={{
            id: post.id,
            user: post.user,
            reviewText: post.text,
            rating: post.rating || 0,
            content: post.content,
            createdAt: post.created_at
          }}
        />
      );
    } else {
      return (
        <ThoughtCard
          key={post.id}
          thought={{
            id: post.id,
            user: post.user,
            content: post.text,
            show: post.content ? {
              title: post.content.title,
              external_id: post.content.external_id
            } : undefined,
            likes: post.likes,
            dislikes: post.dislikes,
            comments: post.comments,
            rethinks: post.rethinks,
            userReaction: undefined
          }}
          onReactionChange={currentFeed.refetch}
          onDelete={currentFeed.refetch}
        />
      );
    }
  };

  const getFilteredPosts = (posts: any[]) => {
    if (postType === 'thoughts') {
      return posts.filter(p => p.type === 'thought');
    }
    if (postType === 'reviews') {
      return posts.filter(p => p.type === 'review');
    }
    return posts;
  };

  const renderFeedContent = (feed: any) => {
    const filteredPosts = getFilteredPosts(feed.posts);
    
    if (feed.loading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (feed.error) {
      return (
        <div className="text-center text-red-500 py-12">
          {feed.error}
        </div>
      );
    }
    
    if (filteredPosts.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          No {postType === 'all' ? 'posts' : postType} yet
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {filteredPosts.map(renderPost)}
      </div>
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
      {isRefreshing && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Refreshing...</span>
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-6">
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
            value="reviews" 
            className="transition-all data-[state=active]:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
          >
            Reviews
          </TabsTrigger>
          <TabsTrigger 
            value="binge" 
            className="transition-all data-[state=active]:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
          >
            Binge
          </TabsTrigger>
        </TabsList>

        <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
          {/* Secondary Tabs for Post Type */}
          <Tabs value={postType} onValueChange={(v) => setPostType(v as any)} className="mb-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="thoughts">Posts</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
          </Tabs>

          <TabsContent value="trending" className="mt-0">
            {renderFeedContent(currentFeed)}
          </TabsContent>

          <TabsContent value="hot-takes" className="mt-0">
            {renderFeedContent(hotTakesFeed)}
          </TabsContent>

          <TabsContent value="reviews" className="mt-0">
            {renderFeedContent(reviewsFeed)}
          </TabsContent>

          <TabsContent value="binge" className="mt-0">
            {renderFeedContent(bingeFeed)}
          </TabsContent>
        </div>

      </Tabs>
    </div>
  );
}
