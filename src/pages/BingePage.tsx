import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, TrendingUp } from 'lucide-react';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';

export default function BingePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPersonalizedFeed();
    }
  }, [user]);

  const loadPersonalizedFeed = async () => {
    setLoading(true);

    // Get user's follows
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user!.id);

    const followingIds = follows?.map(f => f.following_id) || [];

    // Get user's ratings to understand preferences
    const { data: userRatings } = await supabase
      .from('user_ratings')
      .select('item_id, score')
      .eq('user_id', user!.id);

    const ratedItemIds = userRatings?.map(r => r.item_id) || [];

    // Fetch thoughts from followed users and related content
    const { data: thoughtsData } = await supabase
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
          id,
          title,
          external_id,
          kind,
          metadata
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch reviews from posts table
    const { data: reviewsData } = await supabase
      .from('posts')
      .select(`
        id,
        author_id,
        body,
        item_id,
        item_type,
        rating_percent,
        created_at,
        profiles!posts_author_id_fkey (
          id,
          handle,
          avatar_url
        )
      `)
      .eq('kind', 'review')
      .not('body', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    // Score and mix content
    const scoredContent = [];

    // Process thoughts
    if (thoughtsData) {
      for (const thought of thoughtsData) {
        const { data: reactions } = await supabase
          .from('reactions')
          .select('reaction_type')
          .eq('thought_id', thought.id);

        const { data: comments } = await supabase
          .from('comments')
          .select('id')
          .eq('thought_id', thought.id);

        const { data: userReaction } = await supabase
          .from('reactions')
          .select('reaction_type')
          .eq('thought_id', thought.id)
          .eq('user_id', user!.id)
          .maybeSingle();

        const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
        const dislikes = reactions?.filter(r => r.reaction_type === 'dislike').length || 0;
        const rethinks = reactions?.filter(r => r.reaction_type === 'rethink').length || 0;

        let score = 0;
        if (followingIds.includes(thought.user_id)) score += 10;
        // Content matching disabled for now
        score += likes * 2 - dislikes;
        score += rethinks * 1.5;

        let contentDisplay: any = undefined;
        if (thought.content) {
          if (thought.content.kind === 'show') {
            contentDisplay = {
              show: { 
                title: thought.content.title, 
                external_id: thought.content.external_id 
              }
            };
          } else if (thought.content.kind === 'season') {
            const metadata = thought.content.metadata as any;
            contentDisplay = {
              season: {
                title: thought.content.title,
                external_id: thought.content.external_id,
                show_external_id: metadata?.show_id
              }
            };
          } else if (thought.content.kind === 'episode') {
            const metadata = thought.content.metadata as any;
            contentDisplay = {
              episode: {
                title: thought.content.title,
                external_id: thought.content.external_id,
                season_external_id: metadata?.season_number,
                show_external_id: metadata?.show_id
              }
            };
          }
        }

        scoredContent.push({
          type: 'thought',
          score,
          data: {
            id: thought.id,
            user: {
              id: thought.profiles.id,
              handle: thought.profiles.handle,
              avatar_url: thought.profiles.avatar_url,
            },
            content: thought.text_content,
            ...contentDisplay,
            likes,
            dislikes,
            comments: comments?.length || 0,
            rethinks,
            totalInteractions: likes + dislikes + rethinks,
            userReaction: userReaction?.reaction_type,
          }
        });
      }
    }

    // Process reviews
    if (reviewsData) {
      for (const review of reviewsData) {
        let score = 0;
        if (followingIds.includes(review.author_id)) score += 10;

        scoredContent.push({
          type: 'review',
          score,
          data: {
            id: review.id,
            user: {
              id: review.author_id,
              handle: 'user', // profiles relation needs fixing
              avatar_url: '',
            },
            reviewText: review.body,
            rating: review.rating_percent || 0,
            content: { item_type: review.item_type, item_id: review.item_id },
            createdAt: review.created_at,
          }
        });
      }
    }

    // Sort by score and take top items
    const sortedFeed = scoredContent
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    setFeed(sortedFeed);
    setLoading(false);
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold neon-glow">Binge</h1>
        <span className="text-sm text-muted-foreground">Personalized for you</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          Start following users and rating shows to get personalized recommendations!
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((item) => (
            item.type === 'thought' ? (
              <ThoughtCard
                key={item.data.id}
                thought={item.data}
                onReactionChange={loadPersonalizedFeed}
                onDelete={loadPersonalizedFeed}
              />
            ) : (
              <ReviewCard key={item.data.id} review={item.data} />
            )
          ))}
        </div>
      )}
    </div>
  );
}
