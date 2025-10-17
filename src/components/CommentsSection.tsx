import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Heart, ThumbsDown, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { commentSchema } from '@/lib/validation';
import { z } from 'zod';

interface Comment {
  id: string;
  text_content: string;
  created_at: string;
  profiles: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
  likes: number;
  dislikes: number;
  userReaction?: 'like' | 'dislike';
}

interface CommentsSectionProps {
  thoughtId: string;
}

export function CommentsSection({ thoughtId }: CommentsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [thoughtId]);

  const loadComments = async () => {
    setLoading(true);
    
    // Fetch comments
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select(`
        id,
        text_content,
        created_at,
        profiles!comments_user_id_fkey (
          id,
          handle,
          avatar_url
        )
      `)
      .eq('thought_id', thoughtId)
      .order('created_at', { ascending: true });

    if (commentsError || !commentsData) {
      setLoading(false);
      return;
    }

    // Fetch likes and dislikes counts for each comment
    const commentIds = commentsData.map(c => c.id);
    
    const [likesResult, dislikesResult, userLikesResult, userDislikesResult] = await Promise.all([
      supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds),
      supabase
        .from('comment_dislikes')
        .select('comment_id')
        .in('comment_id', commentIds),
      user ? supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds) : { data: [] },
      user ? supabase
        .from('comment_dislikes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds) : { data: [] }
    ]);

    const likesCount = likesResult.data?.reduce((acc, like) => {
      acc[like.comment_id] = (acc[like.comment_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const dislikesCount = dislikesResult.data?.reduce((acc, dislike) => {
      acc[dislike.comment_id] = (acc[dislike.comment_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const userLikes = new Set(userLikesResult.data?.map(l => l.comment_id) || []);
    const userDislikes = new Set(userDislikesResult.data?.map(d => d.comment_id) || []);

    const enrichedComments = commentsData.map(comment => ({
      ...comment,
      likes: likesCount[comment.id] || 0,
      dislikes: dislikesCount[comment.id] || 0,
      userReaction: userLikes.has(comment.id) ? 'like' as const : 
                    userDislikes.has(comment.id) ? 'dislike' as const : 
                    undefined
    }));

    setComments(enrichedComments);
    setLoading(false);
  };

  const handlePostComment = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment",
        variant: "destructive",
      });
      return;
    }

    try {
      commentSchema.parse({
        text_content: newComment,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setPosting(true);
    const { error } = await supabase
      .from('comments')
      .insert({
        thought_id: thoughtId,
        user_id: user.id,
        text_content: newComment.trim(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    } else {
      setNewComment('');
      loadComments();
    }
    setPosting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed",
      });
      loadComments();
    }
  };

  const handleLike = async (commentId: string, currentReaction?: 'like' | 'dislike') => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to react",
        variant: "destructive",
      });
      return;
    }

    try {
      const isLiked = currentReaction === 'like';

      if (isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        if (currentReaction === 'dislike') {
          await supabase
            .from('comment_dislikes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id);
        }

        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          });
      }

      loadComments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  const handleDislike = async (commentId: string, currentReaction?: 'like' | 'dislike') => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to react",
        variant: "destructive",
      });
      return;
    }

    try {
      const isDisliked = currentReaction === 'dislike';

      if (isDisliked) {
        await supabase
          .from('comment_dislikes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        if (currentReaction === 'like') {
          await supabase
            .from('comment_likes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id);
        }

        await supabase
          .from('comment_dislikes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          });
      }

      loadComments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-4 space-y-4 animate-fade-in">
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first!
          </p>
        ) : (
          comments.map((comment) => {
            const isOwner = user?.id === comment.profiles.id;
            
            return (
              <Card key={comment.id} className="p-3 animate-scale-in">
                <div className="flex items-start gap-2">
                  <div className="profile-ring">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={comment.profiles.avatar_url || undefined} alt={comment.profiles.handle} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm font-bold">
                        {comment.profiles.handle[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{comment.profiles.handle}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {isOwner && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your comment.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteComment(comment.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    <p className="text-sm break-words mb-2">{comment.text_content}</p>
                    
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(comment.id, comment.userReaction)}
                        className={`h-7 px-2 transition-all ${comment.userReaction === 'like' ? 'text-primary' : ''}`}
                      >
                        <Heart className={`h-3 w-3 mr-1 ${comment.userReaction === 'like' ? 'fill-primary' : ''}`} />
                        <span className="text-xs">{comment.likes}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDislike(comment.id, comment.userReaction)}
                        className={`h-7 px-2 transition-all ${comment.userReaction === 'dislike' ? 'text-destructive' : ''}`}
                      >
                        <ThumbsDown className={`h-3 w-3 mr-1 ${comment.userReaction === 'dislike' ? 'fill-destructive' : ''}`} />
                        <span className="text-xs">{comment.dislikes}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {user && (
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
            maxLength={500}
          />
          <Button
            onClick={handlePostComment}
            disabled={!newComment.trim() || posting}
            size="icon"
            className="flex-shrink-0"
          >
            {posting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}