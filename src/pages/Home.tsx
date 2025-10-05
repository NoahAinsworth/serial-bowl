import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ThoughtCard } from '@/components/ThoughtCard';
import { TrendingShows } from '@/components/TrendingShows';
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
      // Get reaction counts for each thought
      const thoughtsWithCounts = await Promise.all(
        thoughtsData.map(async (thought: any) => {
          const { data: reactions } = await supabase
            .from('reactions')
            .select('reaction_type')
            .eq('thought_id', thought.id);

          const { data: comments } = await supabase
            .from('comments')
            .select('id')
            .eq('thought_id', thought.id);

          let userReaction = undefined;
          if (user) {
            const { data } = await supabase
              .from('reactions')
              .select('reaction_type')
              .eq('thought_id', thought.id)
              .eq('user_id', user.id)
              .single();
            userReaction = data?.reaction_type;
          }

          const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
          const dislikes = reactions?.filter(r => r.reaction_type === 'dislike').length || 0;
          const rethinks = reactions?.filter(r => r.reaction_type === 'rethink').length || 0;

          return {
            id: thought.id,
            user: {
              id: thought.profiles.id,
              handle: thought.profiles.handle,
              avatar_url: thought.profiles.avatar_url,
            },
            content: thought.text_content,
            show: thought.content ? { title: thought.content.title } : undefined,
            likes,
            dislikes,
            comments: comments?.length || 0,
            rethinks,
            userReaction,
          };
        })
      );

      setThoughts(thoughtsWithCounts);
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
      <TrendingShows />
      
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
            <div className="text-center text-muted-foreground py-12">
              {feedMode === 'following' ? (
                <>
                  <p>No thoughts from people you follow yet</p>
                  <p className="text-sm mt-2">Try the "For You" feed or follow some users!</p>
                </>
              ) : (
                <p>No thoughts yet. Be the first to post!</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {thoughts.map((thought) => (
                <ThoughtCard
                  key={thought.id}
                  thought={thought}
                  onReactionChange={loadFeed}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        TV data provided by TheTVDB
      </div>
    </div>
  );
}
