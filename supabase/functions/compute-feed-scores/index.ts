import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PopularityMetrics {
  post_id: string;
  post_type: string;
  created_at: string;
  likes: number;
  dislikes: number;
  reshares: number;
  comments: number;
  views: number;
}

interface Post {
  id: string;
  author_id: string;
  type: string;
  show_id: string | null;
  rating: number | null;
  text: string;
  created_at: string;
}

interface FeedScore {
  user_id: string;
  post_id: string;
  post_type: string;
  score: number;
  reason: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Computing feed scores for user: ${userId}`);

    // Get user's follows
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    const followingIds = new Set((follows || []).map(f => f.following_id));

    // Get user preferences
    const { data: prefs } = await supabase
      .from('user_prefs')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const userGenres = new Set(prefs?.genres || []);
    const userShows = new Set(prefs?.shows || []);

    // Get user's recent activity to infer preferences
    const { data: recentActivity } = await supabase
      .from('interactions')
      .select('post_id, post_type')
      .eq('user_id', userId)
      .eq('interaction_type', 'like')
      .order('created_at', { ascending: false })
      .limit(50);

    // Get recent posts with popularity
    const { data: popularity } = await supabase
      .from('v_post_popularity')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: posts } = await supabase
      .from('v_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!posts || !popularity) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create popularity lookup
    const popularityMap = new Map<string, PopularityMetrics>();
    popularity.forEach(p => {
      popularityMap.set(`${p.post_id}-${p.post_type}`, p);
    });

    // Compute scores
    const scores: FeedScore[] = [];
    const now = new Date();
    const seenAuthors = new Map<string, number>();
    const seenShows = new Map<string, number>();

    for (const post of posts) {
      const key = `${post.id}-${post.type}`;
      const pop = popularityMap.get(key);
      
      if (!pop) continue;

      // Calculate age in hours
      const createdAt = new Date(post.created_at);
      const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      // Base score from engagement
      const base = 
        3 * pop.likes +
        4 * pop.comments +
        5 * pop.reshares +
        0.25 * pop.views -
        6 * pop.dislikes;

      // Time decay (exponential)
      const decay = Math.exp(-ageHours / 36);

      // Social signal
      let social = 0;
      const isFollowed = followingIds.has(post.author_id);
      if (isFollowed) {
        social += 8;
      }

      // Similarity based on shows (simplified)
      let similar = 0;
      if (post.show_id && userShows.has(post.show_id)) {
        similar += 6;
      }

      // Explore boost for binge feed (not followed)
      let exploreBoost = 0;
      if (!isFollowed) {
        exploreBoost = 2;
      }

      // Diversity penalty
      let diversityPenalty = 0;
      const authorCount = seenAuthors.get(post.author_id) || 0;
      const showCount = post.show_id ? (seenShows.get(post.show_id) || 0) : 0;

      if (authorCount >= 2) {
        diversityPenalty -= 2;
      }
      if (showCount >= 3) {
        diversityPenalty -= 2;
      }

      // Final score
      const score = (base * decay) + social + similar + exploreBoost + diversityPenalty;

      scores.push({
        user_id: userId,
        post_id: post.id,
        post_type: post.type,
        score,
        reason: {
          followed: isFollowed,
          similar_show: post.show_id && userShows.has(post.show_id),
          base: Math.round(base * 100) / 100,
          decay: Math.round(decay * 100) / 100,
          social,
          similar,
          explore: exploreBoost,
          diversity: diversityPenalty
        }
      });

      // Update seen counts
      seenAuthors.set(post.author_id, authorCount + 1);
      if (post.show_id) {
        seenShows.set(post.show_id, showCount + 1);
      }
    }

    // Sort by score and take top 200
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 200);

    // Upsert into feed_scores
    if (topScores.length > 0) {
      const { error } = await supabase
        .from('feed_scores')
        .upsert(
          topScores.map(s => ({
            ...s,
            computed_at: new Date().toISOString()
          })),
          { onConflict: 'user_id,post_id,post_type' }
        );

      if (error) {
        console.error('Error upserting scores:', error);
        throw error;
      }
    }

    console.log(`Computed ${topScores.length} scores for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        scoresComputed: topScores.length,
        userId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error computing feed scores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});