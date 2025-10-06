import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CommentsSectionProps {
  thoughtId: string;
}

export function CommentsSection({ thoughtId }: CommentsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [thoughtId]);

  const loadComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
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

    if (!error && data) {
      setComments(data);
    }
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

    if (!newComment.trim()) return;

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
          comments.map((comment) => (
            <Card key={comment.id} className="p-3 animate-scale-in">
              <div className="flex items-start gap-2">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.profiles.avatar_url} alt={comment.profiles.handle} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm font-bold">
                    {comment.profiles.handle[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{comment.profiles.handle}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm break-words">{comment.text_content}</p>
                </div>
              </div>
            </Card>
          ))
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
            className="btn-glow flex-shrink-0"
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
