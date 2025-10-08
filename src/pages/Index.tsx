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
  const [activeTab, setActiveTab] = useState('trending');
  const [postType, setPostType] = useState<'all' | 'thoughts' | 'reviews'>('all');
  
  // Use the feed hook for each tab
  const trendingFeed = useFeed('trending');
  const hotTakesFeed = useFeed('hot');
  const followingFeed = useFeed('following');

  // Map tab to appropriate feed
  const getFeedForTab = () => {
    switch (activeTab) {
      case 'trending':
        return trendingFeed;
      case 'hot-takes':
        return hotTakesFeed;
      case 'following':
        return followingFeed;
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
      {/* Logo Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-center py-3 px-4">
          <img src={serialBowlLogo} alt="Serial Bowl" className="h-8" />
        </div>
      </div>

      {/* Feed Tabs */}
      <div className="sticky top-[57px] z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex-1 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'trending'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => setActiveTab('hot-takes')}
            className={`flex-1 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'hot-takes'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Hot Takes
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'following'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="sticky top-[109px] z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-2">
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
