import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, MessageCircle, MoreHorizontal, Trash, ExternalLink } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmbeddedVideoPlayer } from './EmbeddedVideoPlayer';
import { SafetyOverlay } from './SafetyOverlay';

interface VideoPostCardProps {
  post: {
    id: string;
    author_id: string;
    body: string | null;
    video_embed_url?: string | null;
    video_url?: string | null;
    video_thumbnail_url?: string | null;
    video_duration?: number | null;
    video_status?: string | null;
    created_at: string;
    item_type?: string | null;
    item_id?: string | null;
    has_spoilers?: boolean;
    has_mature?: boolean;
    likes_count: number;
    dislikes_count: number;
    replies_count: number;
    userReaction?: 'like' | 'dislike';
    profiles?: {
      handle: string;
      avatar_url: string | null;
    };
  };
  userHideSpoilers?: boolean;
  strictSafety?: boolean;
  onReactionChange?: () => void;
  onDelete?: () => void;
}

export function VideoPostCard({ post, userHideSpoilers = true, strictSafety = false, onReactionChange, onDelete }: VideoPostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [localLikes, setLocalLikes] = useState(post.likes_count);
  const [localDislikes, setLocalDislikes] = useState(post.dislikes_count);
  const [localReplies] = useState(post.replies_count);
  const [localReaction, setLocalReaction] = useState(post.userReaction);
  const [showSpoiler, setShowSpoiler] = useState(false);

  const handleLike = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const wasLiked = localReaction === 'like';
    const wasDisliked = localReaction === 'dislike';

    // Optimistic UI update
    setLocalReaction(wasLiked ? undefined : 'like');
    setLocalLikes(wasLiked ? localLikes - 1 : localLikes + 1);
    if (wasDisliked) setLocalDislikes(localDislikes - 1);

    try {
      if (wasLiked) {
        await supabase.from('post_reactions').delete().match({ post_id: post.id, user_id: user.id });
      } else {
        await supabase.from('post_reactions').upsert({ post_id: post.id, user_id: user.id, kind: 'like' });
      }
      onReactionChange?.();
    } catch (error) {
      // Revert on error
      setLocalReaction(post.userReaction);
      setLocalLikes(post.likes_count);
      setLocalDislikes(post.dislikes_count);
      toast.error('Failed to update reaction');
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const wasDisliked = localReaction === 'dislike';
    const wasLiked = localReaction === 'like';

    // Optimistic UI update
    setLocalReaction(wasDisliked ? undefined : 'dislike');
    setLocalDislikes(wasDisliked ? localDislikes - 1 : localDislikes + 1);
    if (wasLiked) setLocalLikes(localLikes - 1);

    try {
      if (wasDisliked) {
        await supabase.from('post_reactions').delete().match({ post_id: post.id, user_id: user.id });
      } else {
        await supabase.from('post_reactions').upsert({ post_id: post.id, user_id: user.id, kind: 'dislike' });
      }
      onReactionChange?.();
    } catch (error) {
      // Revert on error
      setLocalReaction(post.userReaction);
      setLocalLikes(post.likes_count);
      setLocalDislikes(post.dislikes_count);
      toast.error('Failed to update reaction');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this video post?')) return;

    try {
      await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', post.id);
      toast.success('Video post deleted');
      onDelete?.();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Check if content should be hidden
  const shouldHideSpoiler = userHideSpoilers && post.has_spoilers && !showSpoiler;
  const shouldHideMature = strictSafety && post.has_mature;
  const shouldHide = shouldHideSpoiler || shouldHideMature;

  const safetyType = shouldHideSpoiler && shouldHideMature 
    ? 'both' 
    : shouldHideSpoiler 
    ? 'spoiler' 
    : 'sexual';

  return (
    <Card className="overflow-hidden rounded-xl shadow-lg border-border mb-4">
      {/* Video Embed or Old Video */}
      {shouldHide ? (
        <div className="relative aspect-video bg-muted flex items-center justify-center">
          <SafetyOverlay 
            type={safetyType} 
            onRevealSpoiler={() => setShowSpoiler(true)} 
          />
        </div>
      ) : (
        <>
          {post.video_embed_url ? (
            <EmbeddedVideoPlayer url={post.video_embed_url} />
          ) : post.video_thumbnail_url ? (
            <div className="relative aspect-video bg-muted">
              <img 
                src={post.video_thumbnail_url} 
                alt="Video thumbnail" 
                className="w-full h-full object-cover"
              />
              {post.video_status === 'processing' && (
                <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
                  Processing…
                </Badge>
              )}
            </div>
          ) : null}
        </>
      )}

      {/* Post Content */}
      <div className="p-4 space-y-3">
        {/* User Info */}
        <div className="flex items-center gap-2">
          <Link to={`/profile/${post.profiles?.handle}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.profiles?.avatar_url || undefined} />
              <AvatarFallback>
                {post.profiles?.handle?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <Link to={`/profile/${post.profiles?.handle}`} className="font-semibold text-sm hover:underline">
              @{post.profiles?.handle}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Caption */}
        {post.body && (
          <p className="text-sm">{post.body}</p>
        )}

        {/* Content Tags */}
        {post.item_type && post.item_id && (
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              {post.item_type === 'show' && '📺'}
              {post.item_type === 'season' && '📚'}
              {post.item_type === 'episode' && '📼'}
              {' '}
              {post.item_id}
            </Badge>
          </div>
        )}

        {/* Engagement Actions */}
        <div className="flex items-center gap-4 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn(localReaction === 'like' && 'text-primary')}
          >
            <ThumbsUp className={cn('h-4 w-4 mr-1', localReaction === 'like' && 'fill-primary')} />
            {localLikes}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDislike}
            className={cn(localReaction === 'dislike' && 'text-destructive')}
          >
            <ThumbsDown className={cn('h-4 w-4 mr-1', localReaction === 'dislike' && 'fill-destructive')} />
            {localDislikes}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {localReplies}
          </Button>

          <div className="flex-1" />

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/post/${post.id}`)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                View Comments
              </DropdownMenuItem>
              {(post.video_embed_url || post.video_url) && (
                <DropdownMenuItem asChild>
                  <a href={post.video_embed_url || post.video_url || '#'} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Original
                  </a>
                </DropdownMenuItem>
              )}
              {user?.id === post.author_id && (
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
