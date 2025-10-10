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
    
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {}
      }
    });

    const url = new URL(req.url);
    const tab = url.searchParams.get('tab') || 'trending';
    const contentType = url.searchParams.get('contentType') || 'all';
    const limit = 50;
    
    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    console.log(`Feed: tab=${tab}, type=${contentType}, user=${userId || 'anon'}`);

    // Get thoughts and reviews separately
    let allPosts: any[] = [];

    if (contentType === 'all' || contentType === 'thoughts') {
      const { data: thoughts } = await supabase
        .from('thoughts')
        .select(`
          id,
          user_id,
          text_content,
          is_spoiler,
          created_at,
          content_id,
          profiles!thoughts_user_id_fkey (
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
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (thoughts) {
        allPosts.push(...thoughts.map(t => ({ ...t, type: 'thought' })));
      }
    }

    if (contentType === 'all' || contentType === 'reviews') {
      const { data: reviews } = await supabase
        .from('reviews')
        .select(`
          id,
          user_id,
          review_text,
          rating,
          is_spoiler,
          created_at,
          content_id,
          profiles!reviews_user_id_fkey (
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
        .order('created_at', { ascending: false })
        .limit(limit);

      if (reviews) {
        allPosts.push(...reviews.map(r => ({ ...r, type: 'review' })));
      }
    }

    // Filter by following if needed
    if (tab === 'following') {
      if (!userId) {
        return new Response(
          JSON.stringify({ tab, posts: [], count: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('status', 'accepted');

      if (!follows || follows.length === 0) {
        return new Response(
          JSON.stringify({ tab, posts: [], count: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const followingIds = follows.map(f => f.following_id);
      allPosts = allPosts.filter(p => followingIds.includes(p.user_id));
    }

    // Sort by created_at
    allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Calculate scores and add interaction counts
    const now = new Date();
    const hydratedPosts = await Promise.all(
      allPosts.slice(0, limit).map(async (post) => {
        try {
          // Get reactions
          const { data: reactions } = await supabase
            .from('reactions')
            .select('reaction_type')
            .eq('thought_id', post.id);

          const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
          
          const { count: dislikeCount } = await supabase
            .from('thought_dislikes')
            .select('*', { count: 'exact', head: true })
            .eq('thought_id', post.id);
          
          const dislikes = dislikeCount || 0;

          const { data: comments } = await supabase
            .from('comments')
            .select('id')
            .eq('thought_id', post.id);

          const commentCount = comments?.length || 0;

          // Calculate score
          let score = 0;
          if (tab === 'trending') {
            const createdAt = new Date(post.created_at);
            const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            const numerator = (likes * 3) - (dislikes * 2) + commentCount;
            const denominator = Math.pow(ageHours + 2, 1.3);
            score = numerator / denominator;
          } else if (tab === 'hot-takes' || tab === 'hot') {
            score = dislikes - likes;
          }

          // Check user reaction
          let userReaction: 'like' | 'dislike' | undefined = undefined;
          if (userId) {
            const { data: userLike } = await supabase
              .from('reactions')
              .select('reaction_type')
              .eq('thought_id', post.id)
              .eq('user_id', userId)
              .eq('reaction_type', 'like')
              .maybeSingle();

            const { data: userDislike } = await supabase
              .from('thought_dislikes')
              .select('id')
              .eq('thought_id', post.id)
              .eq('user_id', userId)
              .maybeSingle();

            if (userLike) userReaction = 'like';
            else if (userDislike) userReaction = 'dislike';
          }

          return {
            id: post.id,
            type: post.type,
            user: post.profiles,
            content: post.content,
            text: post.type === 'thought' ? post.text_content : post.review_text,
            is_spoiler: post.is_spoiler || false,
            rating: post.type === 'review' ? post.rating : null,
            likes,
            dislikes,
            comments: commentCount,
            rethinks: 0,
            userReaction,
            created_at: post.created_at,
            score
          };
        } catch (err) {
          console.error('Error hydrating post:', post.id, err);
          return null;
        }
      })
    );

    let validPosts = hydratedPosts.filter(p => p !== null);

    // Sort and filter based on tab
    if (tab === 'trending') {
      validPosts.sort((a, b) => b.score - a.score);
    } else if (tab === 'hot-takes' || tab === 'hot') {
      validPosts = validPosts.filter(p => p.dislikes > p.likes);
      validPosts.sort((a, b) => b.score - a.score);
    }

    console.log(`Returning ${validPosts.length} posts`);

    return new Response(
      JSON.stringify({ 
        tab,
        contentType,
        posts: validPosts,
        count: validPosts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Feed error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
