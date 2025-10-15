import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PostCard } from '@/components/PostCard';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';
import { CommentsSection } from '@/components/CommentsSection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    if (!id) return;

    setLoading(true);

    // Try to load from posts table first
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_author_id_fkey (
          id,
          handle,
          avatar_url
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (postData) {
      // This is a unified post (thought or review from posts table)
      const [reactionsData, userReactionData] = await Promise.all([
        supabase
          .from('post_reactions')
          .select('kind')
          .eq('post_id', id),
        user ? supabase
          .from('post_reactions')
          .select('kind')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle() : { data: null }
      ]);

      const likes = reactionsData.data?.filter(r => r.kind === 'like').length || 0;
      const dislikes = reactionsData.data?.filter(r => r.kind === 'dislike').length || 0;
      const userReaction = userReactionData.data?.kind;

      setPost({
        ...postData,
        likes,
        dislikes,
        userReaction,
        type: 'post'
      });
      setLoading(false);
      return;
    }

    // Try to load from thoughts table
    const { data: thoughtData, error: thoughtError } = await supabase
      .from('thoughts')
      .select(`
        id,
        text_content,
        created_at,
        is_spoiler,
        contains_mature,
        mature_reasons,
        content_id,
        user_id,
        profiles!thoughts_user_id_fkey (
          id,
          handle,
          avatar_url
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (thoughtData) {
      // Load content details if content_id exists
      let contentInfo = null;
      if (thoughtData.content_id) {
        const { data: content } = await supabase
          .from('content')
          .select('*')
          .eq('id', thoughtData.content_id)
          .single();
        
        contentInfo = content;
      }

      // Load reactions
      const [likesData, dislikesData, userLikeData, userDislikeData, commentsData] = await Promise.all([
        supabase
          .from('reactions')
          .select('id')
          .eq('thought_id', id)
          .eq('reaction_type', 'like'),
        supabase
          .from('thought_dislikes')
          .select('id')
          .eq('thought_id', id),
        user ? supabase
          .from('reactions')
          .select('id')
          .eq('thought_id', id)
          .eq('user_id', user.id)
          .eq('reaction_type', 'like')
          .maybeSingle() : { data: null },
        user ? supabase
          .from('thought_dislikes')
          .select('id')
          .eq('thought_id', id)
          .eq('user_id', user.id)
          .maybeSingle() : { data: null },
        supabase
          .from('comments')
          .select('id')
          .eq('thought_id', id)
      ]);

      const userReaction = userLikeData.data ? 'like' : userDislikeData.data ? 'dislike' : undefined;

      setPost({
        id: thoughtData.id,
        user: {
          id: thoughtData.profiles.id,
          handle: thoughtData.profiles.handle,
          avatar_url: thoughtData.profiles.avatar_url
        },
        content: thoughtData.text_content,
        is_spoiler: thoughtData.is_spoiler,
        contains_mature: thoughtData.contains_mature,
        mature_reasons: thoughtData.mature_reasons,
        likes: likesData.data?.length || 0,
        dislikes: dislikesData.data?.length || 0,
        comments: commentsData.data?.length || 0,
        userReaction,
        show: contentInfo?.kind === 'show' ? { 
          title: contentInfo.title, 
          external_id: contentInfo.external_id 
        } : undefined,
        season: contentInfo?.kind === 'season' ? { 
          title: contentInfo.title, 
          external_id: contentInfo.metadata?.season_number,
          show_external_id: contentInfo.metadata?.show_id
        } : undefined,
        episode: contentInfo?.kind === 'episode' ? { 
          title: contentInfo.title, 
          external_id: contentInfo.metadata?.episode_number,
          season_external_id: contentInfo.metadata?.season_number,
          show_external_id: contentInfo.metadata?.show_id
        } : undefined,
        type: 'thought'
      });
      setLoading(false);
      return;
    }

    // Post not found
    toast({
      title: "Post not found",
      description: "This post may have been deleted",
      variant: "destructive",
    });
    navigate('/');
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-6 px-4">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container max-w-2xl mx-auto py-6 px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Post not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {post.type === 'thought' ? (
        <ThoughtCard 
          thought={post}
          onReactionChange={loadPost}
          onDelete={() => navigate('/')}
        />
      ) : (
        <>
          <PostCard 
            post={post}
            userHideSpoilers={true}
            strictSafety={false}
            onReactionChange={loadPost}
            onDelete={() => navigate('/')}
          />
          <CommentsSection thoughtId={id!} />
        </>
      )}
    </div>
  );
}
