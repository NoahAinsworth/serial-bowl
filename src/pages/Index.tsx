import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import serialBowlLogo from '@/assets/serial-bowl-logo.png';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';
import { useFeed } from '@/hooks/useFeed';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you');
  const [postType, setPostType] = useState<'all' | 'thoughts' | 'reviews'>('all');
  
  // Use the feed hook based on feed type
  const forYouFeed = useFeed('trending');
  const followingFeed = useFeed('following');
  
  const currentFeed = feedType === 'for-you' ? forYouFeed : followingFeed;
  
  const toggleFeedType = () => {
    setFeedType(prev => prev === 'for-you' ? 'following' : 'for-you');
  };
  
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
            text: post.text,
            rating: post.rating,
            content: post.content,
            created_at: post.created_at
          }}
          onDelete={currentFeed.refetch}
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


  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="flex flex-col items-center gap-6">
          <img src={serialBowlLogo} alt="Serial Bowl Logo" className="w-64 h-auto" />
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

  const filteredPosts = getFilteredPosts(currentFeed.posts);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Logo Header - Clickable to toggle feeds */}
      <div 
        className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
        onClick={toggleFeedType}
      >
        <div className="flex items-center justify-center py-3 px-4 cursor-pointer active:scale-95 transition-transform">
          <img src={serialBowlLogo} alt="Serial Bowl" className="h-8" />
          <div className="ml-3 text-sm text-muted-foreground">
            {feedType === 'for-you' ? 'For You' : 'Following'}
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="sticky top-[57px] z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setPostType('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              postType === 'all' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setPostType('thoughts')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              postType === 'thoughts' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setPostType('reviews')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              postType === 'reviews' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Reviews
          </button>
        </div>
      </div>

      {/* Feed Content */}
      <div className="pb-20">
        {currentFeed.loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : currentFeed.error ? (
          <div className="text-center text-destructive py-12 px-4">
            {currentFeed.error}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 px-4">
            No {postType === 'all' ? 'posts' : postType} yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredPosts.map(renderPost)}
          </div>
        )}
      </div>
    </div>
  );
}
