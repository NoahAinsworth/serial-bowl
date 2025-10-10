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
    const contentType = url.searchParams.get('contentType') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    // Get auth header and extract JWT
    const authHeader = req.headers.get('Authorization');
    
    // Create client that will use the user's auth context for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
      auth: { persistSession: false }
    });
    
    // Get user ID from JWT token directly
    let userId: string | null = null;
    if (authHeader) {
      try {
        // Extract token and decode to get user_id
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          userId = payload.sub || null;
          console.log(`Authenticated as: ${userId}`);
        }
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }

    console.log(`Feed: tab=${tab}, type=${contentType}, user=${userId || 'anon'}`);

    let posts: any[] = [];

    // Helper to fetch all posts
    const fetchAllPosts = async () => {
      const [thoughtsRes, reviewsRes] = await Promise.all([
        supabase
          .from('thoughts')
          .select('id, user_id, created_at')
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('reviews')
          .select('id, user_id, created_at')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      const thoughts = (thoughtsRes.data || []).map(t => ({ 
        id: t.id, 
        user_id: t.user_id,
        type: 'thought' as const, 
        created_at: t.created_at 
      }));
      
      const reviews = (reviewsRes.data || []).map(r => ({ 
        id: r.id, 
        user_id: r.user_id,
        type: 'review' as const, 
        created_at: r.created_at 
      }));

      return [...thoughts, ...reviews].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    };

    // TRENDING FEED
    if (tab === 'trending') {
      const allPosts = await fetchAllPosts();
      const now = new Date();
      
      const scored = await Promise.all(allPosts.map(async (p) => {
        const [reactionsRes, dislikesRes, commentsRes] = await Promise.all([
          supabase.from('reactions').select('reaction_type').eq('thought_id', p.id),
          supabase.from('thought_dislikes').select('id', { count: 'exact', head: true }).eq('thought_id', p.id),
          supabase.from('comments').select('id').eq('thought_id', p.id)
        ]);
        
        const likes = reactionsRes.data?.filter(r => r.reaction_type === 'like').length || 0;
        const dislikes = dislikesRes.count || 0;
        const comments = commentsRes.data?.length || 0;
        
        const ageHours = (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60);
        const score = ((likes * 3) - (dislikes * 2) + comments) / Math.pow(ageHours + 2, 1.3);
        
        return { ...p, score };
      }));

      posts = scored.sort((a, b) => b.score - a.score).slice(0, limit);
    }
    
    // HOT TAKES FEED
    else if (tab === 'hot-takes' || tab === 'hot') {
      const allPosts = await fetchAllPosts();
      
      const scored = await Promise.all(allPosts.map(async (p) => {
        const [reactionsRes, dislikesRes] = await Promise.all([
          supabase.from('reactions').select('reaction_type').eq('thought_id', p.id),
          supabase.from('thought_dislikes').select('id', { count: 'exact', head: true }).eq('thought_id', p.id)
        ]);
        
        const likes = reactionsRes.data?.filter(r => r.reaction_type === 'like').length || 0;
        const dislikes = dislikesRes.count || 0;
        
        return { ...p, likes, dislikes };
      }));

      posts = scored
        .filter(p => p.dislikes > p.likes)
        .sort((a, b) => b.dislikes - a.dislikes)
        .slice(0, limit);
    }
    
    // FOLLOWING FEED
    else if (tab === 'following') {
      if (!userId) {
        console.log('Following tab requires authentication');
        posts = [];
      } else {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .eq('status', 'accepted');

        console.log(`Found ${follows?.length || 0} follows for user ${userId}`);

        if (follows && follows.length > 0) {
          const followingIds = follows.map(f => f.following_id);
          
          const [thoughtsRes, reviewsRes] = await Promise.all([
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

          const thoughts = (thoughtsRes.data || []).map(t => ({ 
            id: t.id, 
            user_id: t.user_id,
            type: 'thought' as const, 
            created_at: t.created_at 
          }));
          
          const reviews = (reviewsRes.data || []).map(r => ({ 
            id: r.id, 
            user_id: r.user_id,
            type: 'review' as const, 
            created_at: r.created_at 
          }));

          posts = [...thoughts, ...reviews]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);

          console.log(`Posts fetched: ${posts.length}`);
        }
      }
    }

    // Filter by content type
    if (contentType === 'thoughts') {
      posts = posts.filter(p => p.type === 'thought');
    } else if (contentType === 'reviews') {
      posts = posts.filter(p => p.type === 'review');
    }

    console.log(`Returning ${posts.length} posts`);

    // Hydrate posts with full data
    const hydrated = await Promise.all(
      posts.map(async (p) => {
        const table = p.type === 'thought' ? 'thoughts' : 'reviews';
        const { data: postData } = await supabase
          .from(table)
          .select(`
            *,
            profiles!${table}_user_id_fkey(id, handle, avatar_url),
            content(id, title, poster_url, external_id, kind, metadata)
          `)
          .eq('id', p.id)
          .single();

        if (!postData) return null;

        // Get rating for reviews
        let rating = null;
        if (p.type === 'review') {
          const { data: ratingData } = await supabase
            .from('ratings')
            .select('rating')
            .eq('user_id', postData.user_id)
            .eq('content_id', postData.content_id)
            .maybeSingle();
          rating = ratingData?.rating || null;
        }

        // Get interaction counts
        const [reactionsRes, dislikesRes, commentsRes] = await Promise.all([
          supabase.from('reactions').select('reaction_type').eq('thought_id', p.id),
          supabase.from('thought_dislikes').select('id', { count: 'exact', head: true }).eq('thought_id', p.id),
          supabase.from('comments').select('id').eq('thought_id', p.id)
        ]);

        const likes = reactionsRes.data?.filter(r => r.reaction_type === 'like').length || 0;
        const dislikes = dislikesRes.count || 0;
        const rethinks = reactionsRes.data?.filter(r => r.reaction_type === 'rethink').length || 0;

        // Check user reaction
        let userReaction: 'like' | 'dislike' | undefined;
        if (userId) {
          const [userLikeRes, userDislikeRes] = await Promise.all([
            supabase.from('reactions').select('id').eq('thought_id', p.id).eq('user_id', userId).eq('reaction_type', 'like').maybeSingle(),
            supabase.from('thought_dislikes').select('id').eq('thought_id', p.id).eq('user_id', userId).maybeSingle()
          ]);
          
          if (userLikeRes.data) userReaction = 'like';
          else if (userDislikeRes.data) userReaction = 'dislike';
        }

        return {
          id: p.id,
          type: p.type,
          user: postData.profiles,
          content: postData.content,
          text: p.type === 'thought' ? postData.text_content : postData.review_text,
          is_spoiler: postData.is_spoiler || false,
          rating,
          likes,
          dislikes,
          comments: commentsRes.data?.length || 0,
          rethinks,
          userReaction,
          created_at: postData.created_at,
          score: p.score || 0
        };
      })
    );

    const validPosts = hydrated.filter(p => p !== null);

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
