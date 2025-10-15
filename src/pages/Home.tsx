import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Flame, Users, Loader2, Sparkles, Clock } from 'lucide-react';
import { useFeed } from '@/hooks/useFeed';
import { PostCard } from '@/components/PostCard';
import { supabase } from '@/lib/supabase';
import { createThought } from '@/api/posts';
import { toast } from 'sonner';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedType, setFeedType] = useState('for-you');
  const { posts, loading, refetch } = useFeed(feedType, 'all');
  const [thoughtText, setThoughtText] = useState('');
  const [posting, setPosting] = useState(false);
  const [userHideSpoilers, setUserHideSpoilers] = useState(true);
  const [strictSafety, setStrictSafety] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

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

  const handleQuickThought = async (text: string) => {
    if (!text.trim() || posting) return;
    
    setPosting(true);
    try {
      await createThought({ body: text });
      toast.success('Posted!');
      setThoughtText('');
      
      // Switch to "New" tab and refetch
      setFeedType('new');
      setTimeout(() => {
        refetch();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      toast.error('Failed to post thought');
      console.error(error);
    } finally {
      setPosting(false);
    }
  };

  const handleEmojiClick = async (emoji: string) => {
    await handleQuickThought(emoji);
  };

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <img src={cerealBowlLogo} alt="Logo" className="w-32 h-32" />
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
    'for-you': 'No posts yet.',
    trending: 'No trending posts yet.',
    'hot-takes': 'No hot takes yet.',
    following: 'Follow users to see their posts!',
    new: 'No posts yet.'
  };

  const currentMessage = emptyMessages[feedType as keyof typeof emptyMessages] || 'No posts yet.';

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

      {/* Pour a Thought Bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border/50 px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-0.5 sm:gap-2">
          <Input
            placeholder="Pour a thought… 🧠"
            value={thoughtText}
            onChange={(e) => setThoughtText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleQuickThought(thoughtText);
              }
            }}
            disabled={posting}
            className="flex-1 text-sm"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEmojiClick('🔥')}
            disabled={posting}
            title="Fire"
            className="h-7 w-7 sm:h-10 sm:w-10 shrink-0 text-xs sm:text-base p-0"
          >
            🔥
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEmojiClick('😂')}
            disabled={posting}
            title="Laugh"
            className="h-7 w-7 sm:h-10 sm:w-10 shrink-0 text-xs sm:text-base p-0"
          >
            😂
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEmojiClick('🤯')}
            disabled={posting}
            title="Mind Blown"
            className="h-7 w-7 sm:h-10 sm:w-10 shrink-0 text-xs sm:text-base p-0 hidden sm:inline-flex"
          >
            🤯
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEmojiClick('😭')}
            disabled={posting}
            title="Cry"
            className="h-7 w-7 sm:h-10 sm:w-10 shrink-0 text-xs sm:text-base p-0 hidden md:inline-flex"
          >
            😭
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEmojiClick('❤️')}
            disabled={posting}
            title="Heart"
            className="h-7 w-7 sm:h-10 sm:w-10 shrink-0 text-xs sm:text-base p-0 hidden md:inline-flex"
          >
            ❤️
          </Button>
        </div>
      </div>

      {/* Feed Type Tabs */}
      <Tabs value={feedType} onValueChange={setFeedType} className="w-full">
        <TabsList className="w-full grid grid-cols-5 mb-0 sticky top-[73px] z-10 bg-background/80 backdrop-blur-lg rounded-none border-b border-border/30">
          <TabsTrigger value="for-you">
            <Sparkles className="h-4 w-4 mr-1" />
            For You
          </TabsTrigger>
          <TabsTrigger value="following">
            <Users className="h-4 w-4 mr-1" />
            Following
          </TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-1" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="hot-takes">
            <Flame className="h-4 w-4 mr-1" />
            Hot Takes
          </TabsTrigger>
          <TabsTrigger value="new">
            <Clock className="h-4 w-4 mr-1" />
            New
          </TabsTrigger>
        </TabsList>

        {/* Feed Content */}
        <TabsContent value="for-you" className="space-y-0 mt-0">
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
                .filter(post => !strictSafety || !post.has_mature)
                .map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onReactionChange={refetch} 
                    onDelete={refetch} 
                  />
                ))}
              <div ref={feedEndRef} />
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
                .filter(post => !strictSafety || !post.has_mature)
                .map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onReactionChange={refetch} 
                    onDelete={refetch} 
                  />
                ))}
              <div ref={feedEndRef} />
            </div>
          )}
        </TabsContent>

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
                .filter(post => !strictSafety || !post.has_mature)
                .map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onReactionChange={refetch} 
                    onDelete={refetch} 
                  />
                ))}
              <div ref={feedEndRef} />
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
                .filter(post => !strictSafety || !post.has_mature)
                .map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onReactionChange={refetch} 
                    onDelete={refetch} 
                  />
                ))}
              <div ref={feedEndRef} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="new" className="space-y-0 mt-0">
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
                .filter(post => !strictSafety || !post.has_mature)
                .map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    userHideSpoilers={userHideSpoilers} 
                    strictSafety={strictSafety}
                    onReactionChange={refetch} 
                    onDelete={refetch} 
                  />
                ))}
              <div ref={feedEndRef} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
