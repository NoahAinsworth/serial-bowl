import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedMode, setFeedMode] = useState<'following' | 'for-you'>('for-you');
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, [feedMode, user]);

  const loadFeed = async () => {
    setLoading(true);
    
    let query = supabase
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
          title
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    // If following mode and user is logged in, filter by followed users
    if (feedMode === 'following' && user) {
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      
      if (followingIds.length > 0) {
        query = query.in('user_id', followingIds);
      } else {
        // No one followed yet
        setThoughts([]);
        setLoading(false);
        return;
      }
    }

    const { data: thoughtsData, error } = await query;

    if (!error && thoughtsData) {
      const simplifiedThoughts = thoughtsData.map((thought: any) => ({
        id: thought.id,
        user_id: thought.user_id,
        handle: thought.profiles?.handle || 'Unknown',
        content: thought.text_content,
        show: thought.content?.title,
        created_at: thought.created_at,
      }));

      setThoughts(simplifiedThoughts);
    }

    setLoading(false);
  };

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 neon-glow">SERIALCEREAL</h1>
          <p className="text-xl text-muted-foreground">
            Your TV social network
          </p>
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
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      <h1 className="text-3xl font-bold neon-glow text-center">Your Feed</h1>
      
      <Tabs value={feedMode} onValueChange={(value) => setFeedMode(value as 'following' | 'for-you')} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
          <TabsTrigger value="for-you">For You</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>

        <TabsContent value={feedMode} className="mt-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : thoughts.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                {feedMode === 'following' ? (
                  <>No thoughts from people you follow yet. Try the "For You" feed!</>
                ) : (
                  <>No thoughts yet. Be the first to post!</>
                )}
              </p>
              <Button onClick={() => navigate('/post')} className="btn-glow">
                Create Post
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {thoughts.map((thought) => (
                <Card key={thought.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                      {thought.handle[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{thought.handle}</span>
                        {thought.show && (
                          <span className="text-sm text-muted-foreground">• {thought.show}</span>
                        )}
                      </div>
                      <p className="text-foreground">{thought.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(thought.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-center">
        <Button onClick={() => navigate('/search')} variant="outline" className="mr-2">
          Search Shows
        </Button>
        <Button onClick={() => navigate('/post')} className="btn-glow">
          Create Post
        </Button>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        TV data provided by TheTVDB
      </div>
    </div>
  );
}
