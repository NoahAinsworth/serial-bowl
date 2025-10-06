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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const tab = url.searchParams.get('tab') || 'trending';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    console.log(`Fetching feed for tab: ${tab}, user: ${userId || 'anonymous'}`);

    let posts: any[] = [];

    if (tab === 'trending') {
      // Global trending - rank by (base * decay)
      const { data: popularity } = await supabase
        .from('v_post_popularity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (popularity) {
        const now = new Date();
        const scored = popularity.map(p => {
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

    } else if (tab === 'hot') {
      // Controversial - rank by (dislikes - likes) * decay with minimum engagement
      const { data: popularity } = await supabase
        .from('v_post_popularity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (popularity) {
        const now = new Date();
        const scored = popularity
          .filter(p => (p.likes + p.dislikes) >= 10) // Minimum engagement
          .map(p => {
            const createdAt = new Date(p.created_at);
            const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            const decay = Math.exp(-ageHours / 36);
            const controversy = (p.dislikes - p.likes);
            return {
              ...p,
              score: controversy * decay
            };
          });

        scored.sort((a, b) => b.score - a.score);
        posts = scored.slice(0, limit);
      }

    } else if (tab === 'reviews') {
      // Reviews only - rank by base * decay
      const { data: popularity } = await supabase
        .from('v_post_popularity')
        .select('*')
        .eq('post_type', 'review')
        .order('created_at', { ascending: false })
        .limit(100);

      if (popularity) {
        const now = new Date();
        const scored = popularity.map(p => {
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

    } else if (tab === 'binge') {
      // Personalized feed
      if (!userId) {
        // Not logged in - fallback to trending
        return Response.redirect(`${url.origin}/api/feed?tab=trending&limit=${limit}`);
      }

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
        // Trigger async refresh
        const refreshPromise = fetch(`${supabaseUrl}/functions/v1/compute-feed-scores`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        }).catch(err => console.error('Background refresh failed:', err));

        // Return current cache or trending
        if (recentScores && recentScores.length > 0) {
          posts = recentScores;
        } else {
          // Cold start - blend trending
          const { data: trending } = await supabase
            .from('v_post_popularity')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
          
          if (trending) {
            posts = trending;
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

        return {
          id: postId,
          type: postType,
          user: postData.profiles,
          content: postData.content,
          text: postType === 'thought' ? postData.text_content : postData.review_text,
          rating,
          likes,
          dislikes,
          comments: comments?.length || 0,
          rethinks,
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