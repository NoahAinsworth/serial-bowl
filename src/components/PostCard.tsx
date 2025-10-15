import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Trash2, ThumbsDown, MoreVertical, EyeOff, Flag, Send, Tv } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sharePost } from '@/api/messages';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: {
    id: string;
    kind: 'thought' | 'review' | 'rating';
    user: {
      id: string;
      handle: string;
      avatar_url: string | null;
    };
    body: string | null;
    item_type: string | null;
    item_id: string | null;
    rating_percent: number | null;
    is_spoiler: boolean;
    has_spoilers: boolean;
    has_mature: boolean;
    likes_count: number;
    dislikes_count: number;
    replies_count: number;
    reshares_count: number;
    userReaction?: 'like' | 'dislike';
    created_at: string;
  };
  userHideSpoilers: boolean;
  strictSafety: boolean;
  onReactionChange?: () => void;
  onDelete?: () => void;
}

export function PostCard({ post, userHideSpoilers = true, strictSafety = false, onReactionChange, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [localReaction, setLocalReaction] = useState<'like' | 'dislike' | undefined>(post.userReaction);
  const [localLikes, setLocalLikes] = useState(post.likes_count);
  const [localDislikes, setLocalDislikes] = useState(post.dislikes_count);
  const [localComments] = useState(post.replies_count);
  const [deleted, setDeleted] = useState(false);
  const [revealSpoiler, setRevealSpoiler] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [contentInfo, setContentInfo] = useState<{ title: string; type: 'show' | 'season' | 'episode'; externalId: string } | null>(null);
  
  const isOwner = user?.id === post.user.id;

  // Load content info for reviews
  useEffect(() => {
    async function loadContentInfo() {
      if (!post.item_id || !post.item_type) return;

      try {
        const { data, error } = await supabase
          .from('content')
          .select('title, external_id, kind')
          .eq('external_id', post.item_id)
          .eq('kind', post.item_type as 'show' | 'season' | 'episode')
          .maybeSingle();

        if (data && !error) {
          setContentInfo({ 
            title: data.title, 
            type: data.kind as 'show' | 'season' | 'episode',
            externalId: data.external_id 
          });
        }
      } catch (error) {
        console.error('Failed to load content info:', error);
      }
    }

    loadContentInfo();
  }, [post.item_id, post.item_type]);

  useEffect(() => {
    if (showShareDialog) {
      supabase.from('profiles').select('id, handle').limit(50).then(({ data }) => {
        if (data) setUsers(data.filter(u => u.id !== user?.id));
      });
    }
  }, [showShareDialog, user]);

  const typeConfig = {
    thought: {
      label: 'Thought',
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      glow: 'shadow-purple-500/10'
    },
    review: {
      label: 'Review',
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      glow: 'shadow-yellow-500/10'
    },
    rating: {
      label: 'Rating',
      color: 'bg-green-500/10 text-green-500 border-green-500/30',
      glow: 'shadow-green-500/10'
    }
  };

  const config = typeConfig[post.kind];

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to react');
      return;
    }

    const newReaction = localReaction === 'like' ? null : 'like';
    const prevReaction = localReaction;
    const prevLikes = localLikes;
    const prevDislikes = localDislikes;

    setLocalReaction(newReaction);
    if (newReaction === 'like') {
      setLocalLikes(prev => prev + 1);
      if (prevReaction === 'dislike') setLocalDislikes(prev => Math.max(0, prev - 1));
    } else {
      setLocalLikes(prev => Math.max(0, prev - 1));
    }

    try {
      if (newReaction === 'like') {
        await supabase.from('post_reactions' as any).upsert({ user_id: user.id, post_id: post.id, kind: 'like' });
      } else {
        await supabase.from('post_reactions' as any).delete().eq('user_id', user.id).eq('post_id', post.id);
      }
      onReactionChange?.();
    } catch (error) {
      setLocalReaction(prevReaction);
      setLocalLikes(prevLikes);
      setLocalDislikes(prevDislikes);
      toast.error('Failed to update reaction');
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast.error('Please sign in to react');
      return;
    }

    const newReaction = localReaction === 'dislike' ? null : 'dislike';
    const prevReaction = localReaction;
    const prevLikes = localLikes;
    const prevDislikes = localDislikes;

    setLocalReaction(newReaction);
    if (newReaction === 'dislike') {
      setLocalDislikes(prev => prev + 1);
      if (prevReaction === 'like') setLocalLikes(prev => Math.max(0, prev - 1));
    } else {
      setLocalDislikes(prev => Math.max(0, prev - 1));
    }

    try {
      if (newReaction === 'dislike') {
        await supabase.from('post_reactions' as any).upsert({ user_id: user.id, post_id: post.id, kind: 'dislike' });
      } else {
        await supabase.from('post_reactions' as any).delete().eq('user_id', user.id).eq('post_id', post.id);
      }
      onReactionChange?.();
    } catch (error) {
      setLocalReaction(prevReaction);
      setLocalLikes(prevLikes);
      setLocalDislikes(prevDislikes);
      toast.error('Failed to update reaction');
    }
  };

  const handleDelete = async () => {
    try {
      await supabase.from('posts' as any).update({ deleted_at: new Date().toISOString() }).eq('id', post.id);
      setDeleted(true);
      toast.success('Post deleted');
      onDelete?.();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const handleHidePost = () => {
    setHidden(true);
    toast.success('Post hidden');
  };

  const handleReport = () => {
    navigate('/settings', { state: { openTab: 'legal', scrollTo: 'report' } });
  };

  const handleShare = () => {
    navigate('/messages', { state: { sharePost: post } });
  };

  if (deleted || hidden) return null;

  const shouldHide = userHideSpoilers && post.has_spoilers && !revealSpoiler;
  const displayText = post.body || '';

  return (
    <article className={cn(
      "relative py-4 bg-card border border-border/20 rounded-2xl px-4 mb-3 transition-all duration-200 animate-fade-in",
      config.glow
    )}>
      <Badge variant="outline" className={cn("absolute top-3 right-14 text-xs font-semibold", config.color)}>
        {config.label}
      </Badge>

      {/* User Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10 cursor-pointer" onClick={() => navigate(`/profile/${post.user.handle}`)}>
          <AvatarImage src={post.user.avatar_url || undefined} alt={post.user.handle} />
          <AvatarFallback>{post.user.handle[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span 
              className="font-semibold hover:underline cursor-pointer"
              onClick={() => navigate(`/profile/${post.user.handle}`)}
            >
              @{post.user.handle}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleHidePost}>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Share to Friend
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReport}>
              <Flag className="h-4 w-4 mr-2" />
              Report
            </DropdownMenuItem>
            {isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete post?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="mb-3">
        {shouldHide ? (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">⚠️ Spoiler warning</p>
            <Button size="sm" variant="outline" onClick={() => setRevealSpoiler(true)}>
              Reveal
            </Button>
          </div>
        ) : (
          <>
            {post.kind === 'review' && post.rating_percent !== null && (
              <div className="mb-2">
                <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 text-sm font-bold">
                  {post.rating_percent}%
                </span>
              </div>
            )}
            {contentInfo && (
              <div 
                className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm cursor-pointer hover:bg-primary/20 transition-all border border-primary/20 hover:border-primary/40"
                onClick={() => {
                  if (contentInfo.type === 'show') navigate(`/show/${contentInfo.externalId}`);
                  else if (contentInfo.type === 'episode') navigate(`/episode/${contentInfo.externalId}`);
                  else if (contentInfo.type === 'season') {
                    const [showId, seasonNum] = contentInfo.externalId.split(':');
                    navigate(`/show/${showId}/season/${seasonNum}`);
                  }
                }}
              >
                <Tv className="h-3.5 w-3.5" />
                <span className="font-medium">{contentInfo.title}</span>
              </div>
            )}
            {post.body && <p className="text-sm whitespace-pre-wrap break-words">{displayText}</p>}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-border/20">
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-2", localReaction === 'like' && "text-pink-500")}
          onClick={handleLike}
        >
          <Heart className={cn("h-4 w-4", localReaction === 'like' && "fill-current")} />
          <span>{localLikes}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-2", localReaction === 'dislike' && "text-red-500")}
          onClick={handleDislike}
        >
          <ThumbsDown className={cn("h-4 w-4", localReaction === 'dislike' && "fill-current")} />
          <span>{localDislikes}</span>
        </Button>
        
        <Button variant="ghost" size="sm" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          <span>{localComments}</span>
        </Button>

      </div>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share to Friend</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {users.map(u => (
              <Button key={u.id} variant="ghost" className="w-full justify-start" onClick={async () => {
                try {
                  await sharePost(post.id, u.id);
                  toast.success(`Shared with @${u.handle}`);
                  setShowShareDialog(false);
                } catch {
                  toast.error('Failed to share');
                }
              }}>
                @{u.handle}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
