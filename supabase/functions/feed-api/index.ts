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
    console.log('Auth header present:', !!authHeader);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {}
      }
    });

    const url = new URL(req.url);
    const tab = url.searchParams.get('tab') || 'trending';
    const contentType = url.searchParams.get('contentType') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Auth error:', error.message);
      } else if (user) {
        userId = user.id;
        console.log('User authenticated:', userId);
      }
    }

    console.log(`Fetching feed: tab=${tab}, contentType=${contentType}, user=${userId || 'anonymous'}`);

    let query = supabase.from('v_posts').select('*');

    // Filter by content type
    if (contentType === 'thoughts') {
      query = query.eq('type', 'thought');
    } else if (contentType === 'reviews') {
      query = query.eq('type', 'review');
    }

    // Apply tab-specific filters
    if (tab === 'following') {
      if (!userId) {
        console.log('Following tab requires authentication');
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

      console.log('Follows count:', follows?.length || 0);

      if (!follows || follows.length === 0) {
        return new Response(
          JSON.stringify({ tab, posts: [], count: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const followingIds = follows.map(f => f.following_id);
      query = query.in('author_id', followingIds);
    }

    // Fetch posts
    const { data: posts, error: postsError } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      throw postsError;
    }

    console.log('Posts fetched:', posts?.length || 0);

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ tab, posts: [], count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate scores and hydrate posts
    const now = new Date();
    const hydratedPosts = await Promise.all(
      posts.map(async (post) => {
        try {
          // Get full post data
          const table = post.type === 'thought' ? 'thoughts' : 'reviews';
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
            .eq('id', post.id)
            .single();

          if (!postData) return null;

          // Get interaction counts
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

          // Calculate score based on tab
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

            if (userLike) {
              userReaction = 'like';
            } else if (userDislike) {
              userReaction = 'dislike';
            }
          }

          return {
            id: post.id,
            type: post.type,
            user: postData.profiles,
            content: postData.content,
            text: post.type === 'thought' ? postData.text_content : postData.review_text,
            is_spoiler: postData.is_spoiler || false,
            rating: post.type === 'review' ? postData.rating : null,
            likes,
            dislikes,
            comments: commentCount,
            rethinks: 0,
            userReaction,
            created_at: postData.created_at,
            score
          };
        } catch (err) {
          console.error('Error hydrating post:', post.id, err);
          return null;
        }
      })
    );

    let validPosts = hydratedPosts.filter(p => p !== null);

    // Sort based on tab
    if (tab === 'trending') {
      validPosts.sort((a, b) => b.score - a.score);
    } else if (tab === 'hot-takes' || tab === 'hot') {
      validPosts = validPosts.filter(p => p.dislikes > p.likes);
      validPosts.sort((a, b) => b.score - a.score);
    }

    // Limit results
    validPosts = validPosts.slice(0, limit);

    console.log('Returning posts:', validPosts.length);

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
    console.error('Error serving feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
