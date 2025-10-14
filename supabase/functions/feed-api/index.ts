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

    let postIds: { id: string, post_type: string }[] = [];
    
    // Fetch posts based on tab - for now just get recent reviews and thoughts
    if (tab === 'trending' || tab === 'hot-takes') {
      // Get all recent posts (reviews + thoughts) from last 72 hours
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, created_at, user_id')
        .gte('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);
      
      const { data: thoughts } = await supabase
        .from('thoughts')
        .select('id, created_at, user_id')
        .gte('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);
      
      postIds = [
        ...(reviews?.map(r => ({ id: r.id, post_type: 'review' })) || []),
        ...(thoughts?.map(t => ({ id: t.id, post_type: 'thought' })) || [])
      ];
      
      console.log(`Fetched ${postIds.length} posts (reviews + thoughts) for ${tab}`);
    } else if (tab === 'following') {
      // Get posts from followed users
      const { data: followedIds } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId!)
        .eq('status', 'accepted');
      
      const ids = followedIds?.map(f => f.following_id) || [];
      
      if (ids.length > 0) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('id, created_at, user_id')
          .in('user_id', ids)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        const { data: thoughts } = await supabase
          .from('thoughts')
          .select('id, created_at, user_id')
          .in('user_id', ids)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        postIds = [
          ...(reviews?.map(r => ({ id: r.id, post_type: 'review' })) || []),
          ...(thoughts?.map(t => ({ id: t.id, post_type: 'thought' })) || [])
        ];
      }
      
      console.log(`Fetched ${postIds.length} posts from following`);
    } else {
      // For You - mix of everything
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(Math.floor(limit / 2));
      
      const { data: thoughts } = await supabase
        .from('thoughts')
        .select('id, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(Math.floor(limit / 2));
      
      postIds = [
        ...(reviews?.map(r => ({ id: r.id, post_type: 'review' })) || []),
        ...(thoughts?.map(t => ({ id: t.id, post_type: 'thought' })) || [])
      ];
      
      console.log(`Fetched ${postIds.length} posts for For You`);
    }

    if (postIds.length === 0) {
      console.log('No posts found, returning empty array');
      return new Response(
        JSON.stringify({ tab, posts: [], count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hydrate posts with full data
    const hydratedPosts = await Promise.all(
      postIds.map(async ({ id: postId, post_type }) => {
        const isThought = post_type === 'thought';
        const tableName = isThought ? 'thoughts' : 'reviews';
        
        // Filter by content type if needed
        if (contentType !== 'all') {
          const targetType = contentType === 'thoughts' ? 'thought' : 'review';
          if (post_type !== targetType) return null;
        }
        
        // Fetch the full post data
        const { data: fullPost } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', postId)
          .single();

        if (!fullPost) return null;

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, handle, avatar_url')
          .eq('id', fullPost.user_id)
          .single();

        // Fetch content details
        const { data: content } = await supabase
          .from('content')
          .select('*')
          .eq('id', fullPost.content_id)
          .maybeSingle();

        // Get interaction counts
        const likeTable = isThought ? 'reactions' : 'review_likes';
        const dislikeTable = isThought ? 'thought_dislikes' : 'review_dislikes';
        const likeFilter = isThought ? { thought_id: postId, reaction_type: 'like' } : { review_id: postId };
        const dislikeFilter = isThought ? { thought_id: postId } : { review_id: postId };

        const [likesResult, dislikesResult, commentsResult, resharesResult] = await Promise.all([
          supabase.from(likeTable).select('id', { count: 'exact', head: true }).match(likeFilter),
          supabase.from(dislikeTable).select('id', { count: 'exact', head: true }).match(dislikeFilter),
          isThought ? supabase.from('comments').select('id', { count: 'exact', head: true }).eq('thought_id', postId) : Promise.resolve({ count: 0 }),
          supabase.from('reshares').select('id', { count: 'exact', head: true }).match({ post_id: postId, post_type: post_type })
        ]);

        // Get user's reaction if authenticated
        let userReaction: 'like' | 'dislike' | undefined;
        if (userId) {
          if (isThought) {
            const { data: reaction } = await supabase
              .from('reactions')
              .select('reaction_type')
              .eq('thought_id', postId)
              .eq('user_id', userId)
              .maybeSingle();
            userReaction = reaction?.reaction_type as 'like' | 'dislike' | undefined;
          } else {
            const [likeData, dislikeData] = await Promise.all([
              supabase.from('review_likes').select('id').eq('review_id', postId).eq('user_id', userId).maybeSingle(),
              supabase.from('review_dislikes').select('id').eq('review_id', postId).eq('user_id', userId).maybeSingle()
            ]);
            userReaction = likeData.data ? 'like' : (dislikeData.data ? 'dislike' : undefined);
          }
        }

        return {
          id: postId,
          type: post_type,
          user: profile || { id: fullPost.user_id, handle: 'Unknown', avatar_url: null },
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
          created_at: fullPost.created_at,
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
