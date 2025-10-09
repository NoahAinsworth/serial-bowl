import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { env } from '@/lib/env';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';
import { CerealBowlIcon } from '@/components/CerealBowlIcon';
import { useFeed } from '@/hooks/useFeed';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('trending');
  const [postType, setPostType] = useState<'all' | 'thoughts' | 'reviews'>('all');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  
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
  
  // Pull to refresh for current feed - temporarily disabled
  const { isRefreshing } = usePullToRefresh({ 
    onRefresh: async () => currentFeed.refetch(),
    disabled: true, // Disabled to fix hook error
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
            is_spoiler: post.is_spoiler,
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
            is_spoiler: post.is_spoiler,
            show: post.content ? {
              title: post.content.title,
              external_id: post.content.external_id
            } : undefined,
            likes: post.likes,
            dislikes: post.dislikes,
            comments: post.comments,
            rethinks: post.rethinks,
            userReaction: post.userReaction
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
          No {postType === 'all' ? 'thoughts' : postType} yet
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {filteredPosts.map(renderPost)}
      </div>
    );
  };

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in",
      });
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!handle.trim()) {
      toast({
        title: "Handle required",
        description: "Please enter a handle",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          handle: handle.startsWith('@') ? handle : `@${handle}`,
        },
        emailRedirectTo: env.AUTH_REDIRECT,
      },
    });

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Welcome to Serial Bowl",
      });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: env.AUTH_REDIRECT,
      },
    });

    if (error) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-cloud px-4">
        <Card className="w-full max-w-md p-8 border-0">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-2 wordmark gradient-text">SERIAL BOWL</h1>
            <p className="text-muted-foreground font-medium">Your TV social network</p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSignIn()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSignIn()}
                />
              </div>
              <Button
                onClick={handleSignIn}
                disabled={loading || !email || !password}
                className="w-full btn-glow"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-handle">Handle</Label>
                <Input
                  id="signup-handle"
                  type="text"
                  placeholder="@yourhandle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSignUp()}
                />
              </div>
              <Button
                onClick={handleSignUp}
                disabled={loading || !email || !password || !handle}
                className="w-full btn-glow"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            TV data powered by TheTVDB
          </div>
        </Card>
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
            value="following" 
            className="transition-all data-[state=active]:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
          >
            Following
          </TabsTrigger>
        </TabsList>

        <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
          {/* Secondary Filter Tabs */}
          <div className="mb-4">
            <div className="inline-flex h-10 items-center justify-center rounded-md bg-[hsl(0_0%_4%)] p-1 text-white w-full border border-[hsl(var(--border))]">
              <button
                onClick={() => setPostType('all')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                  postType === 'all' ? 'bg-white text-[hsl(0_0%_4%)] shadow-sm' : ''
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPostType('thoughts')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                  postType === 'thoughts' ? 'bg-white text-[hsl(0_0%_4%)] shadow-sm' : ''
                }`}
              >
                Thoughts
              </button>
              <button
                onClick={() => setPostType('reviews')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                  postType === 'reviews' ? 'bg-white text-[hsl(0_0%_4%)] shadow-sm' : ''
                }`}
              >
                Reviews
              </button>
            </div>
          </div>

          <TabsContent value="trending" className="mt-0">
            {renderFeedContent(currentFeed)}
          </TabsContent>

          <TabsContent value="hot-takes" className="mt-0">
            {renderFeedContent(hotTakesFeed)}
          </TabsContent>

          <TabsContent value="following" className="mt-0">
            {renderFeedContent(followingFeed)}
          </TabsContent>
        </div>

      </Tabs>
    </div>
  );
}
