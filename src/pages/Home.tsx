import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed, type FeedType } from '@/hooks/useFeed';
import { PostCard } from '@/components/PostCard';
import { Loader2 } from 'lucide-react';
import { createThought } from '@/api/posts';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import cerealBowlLogo from '@/assets/cereal-bowl-simple.png';
import cerealBowlIcon from '@/assets/cereal-bowl-icon.png';
import serialBowlWordmark from '@/assets/serial-bowl-wordmark-new.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<FeedType>('new');
  const { posts, loading, loadingMore, reachedEnd, loadMore, refetch } = useFeed(activeTab);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [thoughtText, setThoughtText] = useState('');
  const [posting, setPosting] = useState(false);
  const [userHideSpoilers, setUserHideSpoilers] = useState(true);
  const [strictSafety, setStrictSafety] = useState(false);
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [hasMature, setHasMature] = useState(false);

  // Load user settings
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.settings) {
            const settings = data.settings as any;
            const hideSpoilers = settings?.safety?.hide_spoilers ?? true;
            const filterMature = settings?.safety?.strict_safety ?? false;
            setUserHideSpoilers(hideSpoilers);
            setStrictSafety(filterMature);
          }
        });
    }
  }, [user]);

  // Scroll to top when coming from post creation
  useEffect(() => {
    if (location.state?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      refetch();
    }
  }, [location.state]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && !reachedEnd) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, loadingMore, reachedEnd]);

  const handleEmojiPost = async (emoji: string) => {
    if (!user) {
      toast.error('Please sign in to post');
      return;
    }

    setPosting(true);
    try {
      await createThought({ body: emoji });
      toast.success('Posted!');
      setActiveTab('new');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        refetch();
      }, 100);
    } catch (error) {
      toast.error('Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handleThoughtSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to post');
      return;
    }

    if (!thoughtText.trim()) return;

    setPosting(true);
    try {
      await createThought({ body: thoughtText.trim(), hasSpoilers, hasMature });
      toast.success('Posted!');
      setThoughtText('');
      setHasSpoilers(false);
      setHasMature(false);
      setActiveTab('new');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        refetch();
      }, 100);
    } catch (error) {
      toast.error('Failed to post');
    } finally {
      setPosting(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <img src={cerealBowlLogo} alt="Logo" className="w-32 h-32" />
          <p className="text-xl font-medium text-muted-foreground">Your bingeing experience awaits!</p>
        </div>
        <p className="text-muted-foreground">
          Rate shows, share thoughts, and connect with fellow TV enthusiasts
        </p>
        <Button onClick={() => navigate('/auth')} size="lg">
          Start Pouring
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-6 px-0 md:px-4 pt-6">
      {/* Pour a Thought Bar */}
      <div className="mb-6 bg-card border-0 md:border rounded-none md:rounded-lg p-4 mx-0">
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Pour a thought..."
            value={thoughtText}
            onChange={(e) => setThoughtText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleThoughtSubmit()}
            disabled={posting}
          />
          <Button onClick={handleThoughtSubmit} disabled={posting || !thoughtText.trim()}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
          </Button>
        </div>
        <div className="flex gap-3 mb-3 text-sm">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="spoiler"
              checked={hasSpoilers}
              onCheckedChange={(checked) => setHasSpoilers(checked as boolean)}
            />
            <Label htmlFor="spoiler" className="text-sm cursor-pointer">
              Contains spoilers
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mature"
              checked={hasMature}
              onCheckedChange={(checked) => setHasMature(checked as boolean)}
            />
            <Label htmlFor="mature" className="text-sm cursor-pointer">
              🔞 Mature content
            </Label>
          </div>
        </div>
        <div className="flex gap-2 justify-center">
          {['🔥', '😂', '🤯', '😭', '❤️'].map((emoji) => (
            <Button
              key={emoji}
              variant="outline"
              size="sm"
              onClick={() => handleEmojiPost(emoji)}
              disabled={posting}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </div>

      {/* Feed Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedType)}>
        <TabsList className="w-full mb-6 grid grid-cols-4 text-xs sm:text-sm">
          <TabsTrigger value="trending" className="px-2">Trending</TabsTrigger>
          <TabsTrigger value="hot-takes" className="px-2">Hot Takes</TabsTrigger>
          <TabsTrigger value="following" className="px-2">Following</TabsTrigger>
          <TabsTrigger value="new" className="px-2">New</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {loading && posts.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No posts yet
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    ...post,
                    user: post.author,
                    is_spoiler: post.has_spoilers,
                  }}
                  userHideSpoilers={userHideSpoilers}
                  strictSafety={strictSafety}
                  onReactionChange={refetch}
                  onDelete={refetch}
                />
              ))}
              
              {!reachedEnd && (
                <div ref={sentinelRef} className="h-20 flex items-center justify-center">
                  {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                </div>
              )}

              {reachedEnd && posts.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  You've reached the end
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
