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

    let postIds: string[] = [];
    
    // Fetch post IDs based on tab using new RPC functions
    if (tab === 'trending') {
      // Try trending first
      const { data: trendingData, error: trendingError } = await supabase
        .rpc('feed_trending_rt', { limit_count: limit, cursor_score: null });
      
      if (!trendingError && trendingData && trendingData.length > 0) {
        postIds = trendingData.map((item: any) => item.post_id);
        console.log(`Fetched ${postIds.length} posts from feed_trending_rt`);
      } else {
        // Fallback to recent popular
        const { data: fallbackData } = await supabase
          .rpc('feed_recent_popular', { limit_count: limit });
        postIds = fallbackData?.map((item: any) => item.post_id) || [];
        console.log(`Trending empty, using fallback: ${postIds.length} posts from feed_recent_popular`);
      }
    } else if (tab === 'hot-takes') {
      const { data: hotTakesData } = await supabase
        .rpc('feed_hot_takes', { limit_count: limit, cursor_score: null });
      postIds = hotTakesData?.map((item: any) => item.post_id) || [];
      console.log(`Fetched ${postIds.length} posts from feed_hot_takes`);
    } else if (tab === 'following') {
      // Following uses existing view
      const { data: viewPosts } = await supabase
        .from('feed_following')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(limit);
      postIds = viewPosts?.map((p: any) => p.id) || [];
      console.log(`Fetched ${postIds.length} posts from feed_following`);
    } else {
      // For You - use trending with some mixing logic
      const { data: forYouData } = await supabase
        .from('feed_for_you')
        .select('id')
        .order('rank_score', { ascending: false })
        .limit(limit);
      postIds = forYouData?.map((p: any) => p.id) || [];
      console.log(`Fetched ${postIds.length} posts from feed_for_you`);
    }

    if (postIds.length === 0) {
      console.log('No posts found, returning empty array');
      return new Response(
        JSON.stringify({ tab, posts: [], count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hydrate posts with full data from the posts table
    const hydratedPosts = await Promise.all(
      postIds.map(async (postId) => {
        // Get post from posts table
        const { data: post } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .is('deleted_at', null)
          .single();

        if (!post) return null;

        const isThought = post.kind === 'thought';
        
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, handle, avatar_url')
          .eq('id', post.author_id)
          .single();

        // Get content details if item_type and item_id exist
        let content = null;
        if (post.item_type && post.item_id) {
          // For now, return basic content info - you can enhance this later
          content = {
            id: post.item_id,
            title: 'Content', // TODO: fetch from TVDB cache
            kind: post.item_type
          };
        }

        // Get user's reaction if authenticated
        let userReaction: 'like' | 'dislike' | undefined;
        if (userId) {
          const { data: reaction } = await supabase
            .from('post_reactions')
            .select('kind')
            .eq('post_id', post.id)
            .eq('user_id', userId)
            .maybeSingle();
          userReaction = reaction?.kind as 'like' | 'dislike' | undefined;
        }

        // Filter by content type if needed
        if (contentType !== 'all') {
          const targetType = contentType === 'thoughts' ? 'thought' : 'review';
          if (post.kind !== targetType) return null;
        }

        return {
          id: post.id,
          type: post.kind,
          user: profile || { id: post.author_id, handle: 'Unknown', avatar_url: null },
          content,
          text: post.body,
          is_spoiler: post.is_spoiler || false,
          contains_mature: post.has_mature || false,
          mature_reasons: [],
          rating: post.rating_percent,
          likes: post.likes_count || 0,
          dislikes: post.dislikes_count || 0,
          comments: post.replies_count || 0,
          rethinks: post.reshares_count || 0,
          userReaction,
          created_at: post.created_at,
          score: 0
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
