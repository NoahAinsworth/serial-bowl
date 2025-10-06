import { useState } from 'react';
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
import { useFeed } from '@/hooks/useFeed';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trending');
  
  // Use the feed hook for each tab
  const trendingFeed = useFeed('trending');
  const hotTakesFeed = useFeed('hot');
  const bingeFeed = useFeed('binge');

  // Map tab to appropriate feed
  const getFeedForTab = () => {
    switch (activeTab) {
      case 'trending':
        return trendingFeed;
      case 'hot-takes':
        return hotTakesFeed;
      case 'binge':
        return bingeFeed;
      default:
        return trendingFeed;
    }
  };

  const currentFeed = getFeedForTab();

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

        <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
          <TabsContent value="trending" className="mt-0">
            {currentFeed.loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : currentFeed.error ? (
              <div className="text-center text-red-500 py-12">
                {currentFeed.error}
              </div>
            ) : currentFeed.posts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No posts yet
              </div>
            ) : (
              <div className="space-y-4">
                {currentFeed.posts.map(renderPost)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="hot-takes" className="mt-0">
            {hotTakesFeed.loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : hotTakesFeed.error ? (
              <div className="text-center text-red-500 py-12">
                {hotTakesFeed.error}
              </div>
            ) : hotTakesFeed.posts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No posts yet
              </div>
            ) : (
              <div className="space-y-4">
                {hotTakesFeed.posts.map(renderPost)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="binge" className="mt-0">
            {bingeFeed.loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : bingeFeed.error ? (
              <div className="text-center text-red-500 py-12">
                {bingeFeed.error}
              </div>
            ) : bingeFeed.posts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                {user ? 'Start following users to see their content here!' : 'Please log in to see personalized content'}
              </div>
            ) : (
              <div className="space-y-4">
                {bingeFeed.posts.map(renderPost)}
              </div>
            )}
          </TabsContent>
        </div>

      </Tabs>
    </div>
  );
}
