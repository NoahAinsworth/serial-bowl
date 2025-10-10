import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const url = new URL(req.url);
    const tab = url.searchParams.get('tab') || 'trending';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    
    // Create Supabase client with auth context
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {}
      },
      auth: {
        persistSession: false
      }
    });
    
    // Get user - don't pass token, let client use the headers
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Auth error:', error.message);
        } else if (user) {
          userId = user.id;
          console.log(`Authenticated user: ${userId}`);
        }
      } catch (e) {
        console.error('Exception getting user:', e);
      }
    }

    console.log(`Feed request - tab: ${tab}, user: ${userId || 'anonymous'}`);

    let posts: any[] = [];

    // Helper to get all posts (thoughts + reviews)
    const getAllPosts = async () => {
      const [thoughtsResult, reviewsResult] = await Promise.all([
        supabase
          .from('thoughts')
          .select('id, user_id, created_at, moderation_status')
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('reviews')
          .select('id, user_id, created_at')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      const thoughts = (thoughtsResult.data || []).map(t => ({ 
        id: t.id, 
        user_id: t.user_id,
        type: 'thought' as const, 
        created_at: t.created_at 
      }));
      const reviews = (reviewsResult.data || []).map(r => ({ 
        id: r.id, 
        user_id: r.user_id,
        type: 'review' as const, 
        created_at: r.created_at 
      }));

      return [...thoughts, ...reviews].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    };

    if (tab === 'trending') {
      const allPosts = await getAllPosts();
      const now = new Date();
      
      const scoredPosts = await Promise.all(allPosts.map(async (p) => {
        const { data: reactions } = await supabase
          .from('reactions')
          .select('reaction_type')
          .eq('thought_id', p.id);
        
        const { data: comments } = await supabase
          .from('comments')
          .select('id')
          .eq('thought_id', p.id);
        
        const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
        const { count: dislikeCount } = await supabase
          .from('thought_dislikes')
          .select('*', { count: 'exact', head: true })
          .eq('thought_id', p.id);
        const dislikes = dislikeCount || 0;
        const commentCount = comments?.length || 0;

        const createdAt = new Date(p.created_at);
        const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        const numerator = (likes * 3) - (dislikes * 2) + commentCount;
        const denominator = Math.pow(ageHours + 2, 1.3);
        const score = numerator / denominator;
        
        return {
          post_id: p.id,
          post_type: p.type,
          created_at: p.created_at,
          likes,
          dislikes,
          comments: commentCount,
          score
        };
      }));

      scoredPosts.sort((a, b) => b.score - a.score);
      posts = scoredPosts.slice(0, limit);

    } else if (tab === 'hot-takes' || tab === 'hot') {
      const allPosts = await getAllPosts();
      
      const scoredPosts = await Promise.all(allPosts.map(async (p) => {
        const { data: reactions } = await supabase
          .from('reactions')
          .select('reaction_type')
          .eq('thought_id', p.id);
        
        const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
        const { count: dislikeCount } = await supabase
          .from('thought_dislikes')
          .select('*', { count: 'exact', head: true })
          .eq('thought_id', p.id);
        const dislikes = dislikeCount || 0;

        return {
          post_id: p.id,
          post_type: p.type,
          created_at: p.created_at,
          likes,
          dislikes,
          comments: 0,
          score: dislikes
        };
      }));

      const hotTakes = scoredPosts
        .filter(p => p.dislikes > p.likes)
        .sort((a, b) => b.score - a.score);

      posts = hotTakes.slice(0, limit);

    } else if (tab === 'reviews') {
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('id, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (allReviews && allReviews.length > 0) {
        const now = new Date();
        
        const scoredPosts = await Promise.all(allReviews.map(async (r) => {
          const { data: reactions } = await supabase
            .from('reactions')
            .select('reaction_type')
            .eq('thought_id', r.id);
          
          const { data: comments } = await supabase
            .from('comments')
            .select('id')
            .eq('thought_id', r.id);
          
          const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
          const { count: dislikeCount } = await supabase
            .from('thought_dislikes')
            .select('*', { count: 'exact', head: true })
            .eq('thought_id', r.id);
          const dislikes = dislikeCount || 0;
          const commentCount = comments?.length || 0;

          const createdAt = new Date(r.created_at);
          const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          const numerator = (likes * 3) - (dislikes * 2) + commentCount;
          const denominator = Math.pow(ageHours + 2, 1.3);
          
          return {
            post_id: r.id,
            post_type: 'review' as const,
            created_at: r.created_at,
            likes,
            dislikes,
            comments: commentCount,
            score: numerator / denominator
          };
        }));

        scoredPosts.sort((a, b) => b.score - a.score);
        posts = scoredPosts.slice(0, limit);
      }

    } else if (tab === 'following') {
      if (!userId) {
        posts = [];
      } else {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .eq('status', 'accepted');

        if (follows && follows.length > 0) {
          const followingIds = follows.map(f => f.following_id);
          
          const [thoughtsResult, reviewsResult] = await Promise.all([
            supabase
              .from('thoughts')
              .select('id, user_id, created_at')
              .in('user_id', followingIds)
              .eq('moderation_status', 'approved')
              .order('created_at', { ascending: false })
              .limit(limit),
            supabase
              .from('reviews')
              .select('id, user_id, created_at')
              .in('user_id', followingIds)
              .order('created_at', { ascending: false })
              .limit(limit)
          ]);

          const thoughts = (thoughtsResult.data || []).map(t => ({ 
            post_id: t.id, 
            post_type: 'thought' as const, 
            created_at: t.created_at,
            likes: 0,
            dislikes: 0,
            comments: 0,
            score: 0
          }));
          const reviews = (reviewsResult.data || []).map(r => ({ 
            post_id: r.id, 
            post_type: 'review' as const, 
            created_at: r.created_at,
            likes: 0,
            dislikes: 0,
            comments: 0,
            score: 0
          }));

          posts = [...thoughts, ...reviews]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);
        }
      }
    } else if (tab === 'binge') {
      // Personalized feed
      if (!userId) {
        // Not logged in - use trending instead
        const { data: trending } = await supabase
          .from('v_post_popularity')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (trending) {
          const now = new Date();
          const scored = trending.map(p => {
            const createdAt = new Date(p.created_at);
            const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            const base = 3 * p.likes + 4 * p.comments + 5 * p.reshares + 0.25 * p.views - 6 * p.dislikes;
            const decay = Math.exp(-ageHours / 36);
            return {
              ...p,
              score: base * decay
            };
          });

          scored.sort((a, b) => b.score - a.score);
          posts = scored.slice(0, limit);
        }
      } else {
        // Check if we have recent scores (< 10 minutes old)
        const { data: recentScores } = await supabase
          .from('feed_scores')
          .select('*')
          .eq('user_id', userId)
          .gte('computed_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
          .order('score', { ascending: false })
          .limit(limit);

        if (recentScores && recentScores.length >= 10) {
          // Use cached scores
          posts = recentScores;
        } else {
          // Trigger async refresh using anon key
          const supabaseServiceUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          
          fetch(`${supabaseServiceUrl}/functions/v1/compute-feed-scores`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
          }).catch(err => console.error('Background refresh failed:', err));

          // Return current cache or fallback to trending
          if (recentScores && recentScores.length > 0) {
            posts = recentScores;
          } else {
            // No personalized content yet - use trending
            const { data: trending } = await supabase
              .from('v_post_popularity')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(100);
            
            if (trending) {
              const now = new Date();
              const scored = trending.map(p => {
                const createdAt = new Date(p.created_at);
                const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                const base = 3 * p.likes + 4 * p.comments + 5 * p.reshares + 0.25 * p.views - 6 * p.dislikes;
                const decay = Math.exp(-ageHours / 36);
                return {
                  ...p,
                  score: base * decay
                };
              });

              scored.sort((a, b) => b.score - a.score);
              posts = scored.slice(0, limit);
            }
          }
        }
      }
    }

    // Hydrate posts with full data
    const hydratedPosts = await Promise.all(
      posts.map(async (p) => {
        const postId = p.post_id || p.id;
        const postType = p.post_type || p.type;

        // Get full post data
        const table = postType === 'thought' ? 'thoughts' : 'reviews';
        const { data: postData } = await supabase
          .from(table)
          .select(`
            *,
            profiles!${table}_user_id_fkey (
              id,
              handle,
              avatar_url
            ),
            content (
              id,
              title,
              poster_url,
              external_id,
              kind,
              metadata
            )
          `)
          .eq('id', postId)
          .single();

        if (!postData) return null;

        // Get rating if review
        let rating = null;
        if (postType === 'review') {
          const { data: ratingData } = await supabase
            .from('ratings')
            .select('rating')
            .eq('user_id', postData.user_id)
            .eq('content_id', postData.content_id)
            .maybeSingle();
          rating = ratingData?.rating || null;
        }

        // Get interaction counts
        const { data: reactions } = await supabase
          .from('reactions')
          .select('reaction_type')
          .eq('thought_id', postId);

        const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
        const dislikes = reactions?.filter(r => r.reaction_type === 'dislike').length || 0;
        const rethinks = reactions?.filter(r => r.reaction_type === 'rethink').length || 0;

        const { data: comments } = await supabase
          .from('comments')
          .select('id')
          .eq('thought_id', postId);

        // Check if current user has reacted to this post
        let userReaction: 'like' | 'dislike' | undefined = undefined;
        if (userId) {
          const { data: userLike } = await supabase
            .from('reactions')
            .select('reaction_type')
            .eq('thought_id', postId)
            .eq('user_id', userId)
            .eq('reaction_type', 'like')
            .maybeSingle();

          const { data: userDislike } = await supabase
            .from('thought_dislikes')
            .select('id')
            .eq('thought_id', postId)
            .eq('user_id', userId)
            .maybeSingle();

          if (userLike) {
            userReaction = 'like';
          } else if (userDislike) {
            userReaction = 'dislike';
          }
        }

        return {
          id: postId,
          type: postType,
          user: postData.profiles,
          content: postData.content,
          text: postType === 'thought' ? postData.text_content : postData.review_text,
          is_spoiler: postData.is_spoiler || false,
          rating,
          likes,
          dislikes,
          comments: comments?.length || 0,
          rethinks,
          userReaction,
          created_at: postData.created_at,
          score: p.score
        };
      })
    );

    const validPosts = hydratedPosts.filter(p => p !== null);

    // Log impressions
    if (userId && validPosts.length > 0) {
      const impressions = validPosts.map((post, index) => ({
        user_id: userId,
        post_id: post.id,
        post_type: post.type,
        tab,
        position: index
      }));

      const { error: impressionError } = await supabase
        .from('feed_impressions')
        .insert(impressions);
      
      if (impressionError) {
        console.error('Failed to log impressions:', impressionError);
      }
    }

    return new Response(
      JSON.stringify({ 
        tab,
        posts: validPosts,
        count: validPosts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error serving feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});