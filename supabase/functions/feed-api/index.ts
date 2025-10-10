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
    const tab = url.searchParams.get('tab') || 'for-you';
    const contentType = url.searchParams.get('contentType') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    
    // Create Supabase client with the auth token for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
      auth: { persistSession: false }
    });
    
    // Extract user ID from JWT token
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        
        // Decode JWT payload (middle part of JWT)
        const base64Url = token.split('.')[1];
        if (base64Url) {
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64).split('').map((c) => {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join('')
          );
          
          const payload = JSON.parse(jsonPayload);
          userId = payload.sub || null;
          
          console.log(`User authenticated: ${userId}`);
        }
      } catch (e) {
        console.error('JWT decode error:', e);
      }
    }

    console.log(`Feed: tab=${tab}, type=${contentType}, user=${userId || 'anon'}`);

    // Determine which view to query based on tab
    let viewName = 'feed_for_you';
    switch(tab) {
      case 'for-you':
        viewName = 'feed_for_you';
        break;
      case 'following':
        viewName = 'feed_following';
        break;
      case 'trending':
        viewName = 'feed_trending';
        break;
      case 'hot-takes':
        viewName = 'feed_hot_takes';
        break;
      default:
        viewName = 'feed_for_you';
    }

    // Fetch posts from the appropriate view
    const { data: viewPosts, error: viewError } = await supabase
      .from(viewName)
      .select('*')
      .order('rank_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (viewError) {
      console.error(`Error fetching from ${viewName}:`, viewError);
      throw viewError;
    }

    console.log(`Fetched ${viewPosts?.length || 0} posts from ${viewName}`);

    // Filter by content type if specified
    let filteredPosts = viewPosts || [];
    if (contentType !== 'all') {
      const targetType = contentType === 'thoughts' ? 'thought' : 'review';
      filteredPosts = filteredPosts.filter(p => p.post_type === targetType);
    }

    // Hydrate posts with full data
    const hydratedPosts = await Promise.all(
      filteredPosts.map(async (post) => {
        const isThought = post.post_type === 'thought';
        const tableName = isThought ? 'thoughts' : 'reviews';
        
        // Fetch the full post data
        const { data: fullPost } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', post.id)
          .single();

        if (!fullPost) return null;

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, handle, avatar_url')
          .eq('id', post.author_id)
          .single();

        // Fetch content details
        const { data: content } = await supabase
          .from('content')
          .select('*')
          .eq('id', isThought ? fullPost.content_id : fullPost.content_id)
          .maybeSingle();

        // Get interaction counts
        const likeTable = isThought ? 'reactions' : 'review_likes';
        const dislikeTable = isThought ? 'thought_dislikes' : 'review_dislikes';
        const likeFilter = isThought ? { thought_id: post.id, reaction_type: 'like' } : { review_id: post.id };
        const dislikeFilter = isThought ? { thought_id: post.id } : { review_id: post.id };

        const [likesResult, dislikesResult, commentsResult, resharesResult] = await Promise.all([
          supabase.from(likeTable).select('id', { count: 'exact', head: true }).match(likeFilter),
          supabase.from(dislikeTable).select('id', { count: 'exact', head: true }).match(dislikeFilter),
          isThought ? supabase.from('comments').select('id', { count: 'exact', head: true }).eq('thought_id', post.id) : Promise.resolve({ count: 0 }),
          supabase.from('reshares').select('id', { count: 'exact', head: true }).match({ post_id: post.id, post_type: post.post_type })
        ]);

        // Get user's reaction if authenticated
        let userReaction: 'like' | 'dislike' | undefined;
        if (userId) {
          if (isThought) {
            const { data: reaction } = await supabase
              .from('reactions')
              .select('reaction_type')
              .eq('thought_id', post.id)
              .eq('user_id', userId)
              .maybeSingle();
            userReaction = reaction?.reaction_type as 'like' | 'dislike' | undefined;
          } else {
            const [likeData, dislikeData] = await Promise.all([
              supabase.from('review_likes').select('id').eq('review_id', post.id).eq('user_id', userId).maybeSingle(),
              supabase.from('review_dislikes').select('id').eq('review_id', post.id).eq('user_id', userId).maybeSingle()
            ]);
            userReaction = likeData.data ? 'like' : (dislikeData.data ? 'dislike' : undefined);
          }
        }

        return {
          id: post.id,
          type: post.post_type,
          user: profile || { id: post.author_id, handle: 'Unknown', avatar_url: null },
          content: content,
          text: isThought ? fullPost.text_content : fullPost.review_text,
          is_spoiler: fullPost.is_spoiler || false,
          contains_mature: fullPost.contains_mature || false,
          mature_reasons: fullPost.mature_reasons || [],
          rating: isThought ? null : fullPost.rating,
          likes: likesResult.count || 0,
          dislikes: dislikesResult.count || 0,
          comments: commentsResult.count || 0,
          rethinks: resharesResult.count || 0,
          userReaction,
          created_at: post.created_at,
          score: post.rank_score
        };
      })
    );

    const validPosts = hydratedPosts.filter(p => p !== null);

    return new Response(
      JSON.stringify({ tab, posts: validPosts, count: validPosts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
