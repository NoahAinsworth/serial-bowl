import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Flame, Sparkles, Loader2 } from 'lucide-react';
import { useFeed } from '@/hooks/useFeed';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';
import { supabase } from '@/lib/supabase';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trending');
  const { posts, loading, refetch } = useFeed(activeTab);
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

  // Filter posts based on strict safety mode
  const filteredPosts = strictSafety 
    ? posts.filter(post => !post.is_spoiler)
    : posts;

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <img src={cerealBowlLogo} alt="Serial Bowl Logo" className="w-32 h-32" />
          <h1 className="text-3xl font-bold wordmark gradient-text">SERIAL BOWL</h1>
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

  return (
    <div className="max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-0 sticky top-0 z-10 bg-background/80 backdrop-blur-lg rounded-none border-b border-border/30">
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="hot-takes">
            <Flame className="h-4 w-4 mr-2" />
            Hot Takes
          </TabsTrigger>
          <TabsTrigger value="binge">
            <Sparkles className="h-4 w-4 mr-2" />
            Binge
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No trending thoughts yet. Be the first to create!</p>
            </div>
          ) : (
            <div className="px-4">
              {filteredPosts.map((post) => 
                post.type === 'thought' ? (
                  <ThoughtCard key={post.id} thought={post} userHideSpoilers={userHideSpoilers} onReactionChange={refetch} onDelete={refetch} />
                ) : (
                  <ReviewCard key={post.id} review={post} userHideSpoilers={userHideSpoilers} onDelete={refetch} />
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hot-takes" className="space-y-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No hot takes yet. Share controversial opinions!</p>
            </div>
          ) : (
            <div className="px-4">
              {filteredPosts.map((post) => 
                post.type === 'thought' ? (
                  <ThoughtCard key={post.id} thought={post} userHideSpoilers={userHideSpoilers} onReactionChange={refetch} onDelete={refetch} />
                ) : (
                  <ReviewCard key={post.id} review={post} userHideSpoilers={userHideSpoilers} onDelete={refetch} />
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="binge" className="space-y-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                Follow users and rate shows to build your personalized feed!
              </p>
            </div>
          ) : (
            <div className="px-4">
              {filteredPosts.map((post) => 
                post.type === 'thought' ? (
                  <ThoughtCard key={post.id} thought={post} userHideSpoilers={userHideSpoilers} onReactionChange={refetch} onDelete={refetch} />
                ) : (
                  <ReviewCard key={post.id} review={post} userHideSpoilers={userHideSpoilers} onDelete={refetch} />
                )
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
