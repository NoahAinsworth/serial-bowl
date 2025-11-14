import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Trash2, ThumbsDown, MoreVertical, EyeOff, Flag, Send, Tv, Pencil, Clock, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sharePost } from '@/api/messages';
import { deletePost } from '@/api/posts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { replaceProfanity } from '@/utils/profanityFilter';
import { EditPostDialog } from '@/components/EditPostDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmbeddedVideoPlayer } from '@/components/EmbeddedVideoPlayer';

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
    edited_at?: string | null;
    video_embed_url?: string | null;
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [contentInfo, setContentInfo] = useState<{ title: string; type: 'show' | 'season' | 'episode'; externalId: string } | null>(null);
  
  const isOwner = user?.id === post.user.id;

  // Load content info for reviews
  useEffect(() => {
    async function loadContentInfo() {
      if (!post.item_id || !post.item_type) return;

      try {
        const parts = post.item_id.split(':');
        
        // Check if item_id has the correct format
        const isValidFormat = (
          (post.item_type === 'episode' && parts.length === 3) ||
          (post.item_type === 'season' && parts.length === 2) ||
          (post.item_type === 'show' && parts.length === 1)
        );

        if (!isValidFormat) {
          // Old/malformed data - hide the link
          return;
        }

        const { data, error } = await supabase
          .from('content')
          .select('title, external_id, kind, metadata')
          .eq('external_src', 'thetvdb')
          .eq('external_id', post.item_id)
          .eq('kind', post.item_type as 'show' | 'season' | 'episode')
          .maybeSingle();

        if (data && !error) {
          // Format titles properly for episodes and seasons
          if (data.kind === 'episode') {
            const showId = parts[0];
            const { data: showData } = await supabase
              .from('content')
              .select('title')
              .eq('external_src', 'thetvdb')
              .eq('external_id', showId)
              .eq('kind', 'show')
              .maybeSingle();
            
            const showName = showData?.title || 'Show';
            setContentInfo({
              title: `${showName} - S${parts[1]}E${parts[2]}`,
              type: 'episode',
              externalId: data.external_id
            });
          } else if (data.kind === 'season') {
            const showId = parts[0];
            const { data: showData } = await supabase
              .from('content')
              .select('title')
              .eq('external_src', 'thetvdb')
              .eq('external_id', showId)
              .eq('kind', 'show')
              .maybeSingle();
            
            const showName = showData?.title || 'Show';
            setContentInfo({
              title: `${showName} - Season ${parts[1]}`,
              type: 'season',
              externalId: data.external_id
            });
          } else {
            // For shows, use the title directly
            setContentInfo({ 
              title: data.title, 
              type: data.kind as 'show' | 'season' | 'episode',
              externalId: data.external_id 
            });
          }
        } else {
          // Fallback: Create a readable title from the ID
          if (post.item_type === 'episode') {
            // For episodes, try to fetch show name
            const showId = parts[0];
            const { data: showData } = await supabase
              .from('content')
              .select('title')
              .eq('external_src', 'thetvdb')
              .eq('external_id', showId)
              .eq('kind', 'show')
              .maybeSingle();

            const showName = showData?.title || 'Show';
            setContentInfo({
              title: `${showName} - S${parts[1]}E${parts[2]}`,
              type: 'episode',
              externalId: post.item_id
            });
          } else if (post.item_type === 'season') {
            // For seasons, fetch show name
            const showId = parts[0];
            const { data: showData } = await supabase
              .from('content')
              .select('title')
              .eq('external_src', 'thetvdb')
              .eq('external_id', showId)
              .eq('kind', 'show')
              .maybeSingle();

            const showName = showData?.title || 'Show';
            setContentInfo({
              title: `${showName} - Season ${parts[1]}`,
              type: 'season',
              externalId: post.item_id
            });
          } else if (post.item_type === 'show') {
            const showId = parts[0];
            const { data: showData } = await supabase
              .from('content')
              .select('title')
              .eq('external_src', 'thetvdb')
              .eq('external_id', showId)
              .eq('kind', 'show')
              .maybeSingle();

            setContentInfo({
              title: showData?.title || 'Unknown Show',
              type: 'show',
              externalId: post.item_id
            });
          }
        }
      } catch (error) {
        // Failed to load content info
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

  const loadEditHistory = async () => {
    const { data, error } = await supabase
      .from('post_edit_history')
      .select('*')
      .eq('post_id', post.id)
      .order('edited_at', { ascending: false });
    
    if (data) setEditHistory(data);
  };

  useEffect(() => {
    if (showEditHistory && editHistory.length === 0) {
      loadEditHistory();
    }
  }, [showEditHistory]);

  const typeConfig = {
    thought: {
      label: 'Thought',
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      glow: 'shadow-purple-500/10'
    },
    review: {
      label: 'Review',
      color: 'bg-green-500/10 text-green-500 border-green-500/30',
      glow: 'shadow-green-500/10'
    },
    rating: {
      label: 'Rating',
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      glow: 'shadow-blue-500/10'
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
    setShowDeleteDialog(false);
    
    // Optimistically remove from UI
    setDeleted(true);
    
    try {
      await deletePost(post.id);
      toast.success('Post deleted');
      onDelete?.();
    } catch (error: any) {
      // Revert on failure
      setDeleted(false);
      console.error('Delete post error:', error);
      toast.error('Failed to delete post. Please try again.');
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

  const shouldHideSpoiler = userHideSpoilers && post.has_spoilers && !revealSpoiler;
  const shouldHideMature = strictSafety && post.has_mature;
  const shouldHide = shouldHideSpoiler || shouldHideMature;
  
  // Apply profanity filter if strict safety is on
  const displayText = strictSafety ? replaceProfanity(post.body || '') : (post.body || '');
  
  const getSpoilerWarningText = () => {
    if (!contentInfo) return 'This contains spoilers';
    return `This contains spoilers for ${contentInfo.title}`;
  };

  const getWarningText = () => {
    if (shouldHideMature && shouldHideSpoiler) return '🔞 ⚠️ Contains mature content and spoilers';
    if (shouldHideMature) return '🔞 Contains mature content';
    if (shouldHideSpoiler) return `⚠️ ${getSpoilerWarningText()}`;
    return '';
  };

  return (
    <article className={cn(
      "relative py-3 bg-card border-0 md:border md:border-border/20 rounded-none md:rounded-2xl px-3 mb-2 transition-all duration-200 animate-fade-in active:scale-[0.98]",
      config.glow
    )}>
      {/* User Header */}
      <div className="flex items-start gap-2 mb-2">
        <Avatar className="h-9 w-9 cursor-pointer shrink-0" onClick={() => navigate(`/user/${post.user.handle}`)}>
          <AvatarImage src={post.user.avatar_url || undefined} alt={post.user.handle} />
          <AvatarFallback>{post.user.handle[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <span 
              className="font-bold text-foreground hover:underline cursor-pointer truncate"
              onClick={() => navigate(`/user/${post.user.handle}`)}
            >
              {post.user.handle}
            </span>
            <span className="text-sm text-foreground/60 shrink-0">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
          <Badge variant="outline" className={cn("text-xs font-semibold w-fit mt-1", config.color)}>
            {config.label}
          </Badge>
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
              <>
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="mb-3">
        {shouldHide ? (
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">{getWarningText()}</p>
            {shouldHideMature && shouldHideSpoiler && (
              <p className="text-xs text-muted-foreground mb-2">
                Turn OFF Strict Safety Mode to view mature content
              </p>
            )}
            {shouldHideMature && !shouldHideSpoiler && (
              <p className="text-xs text-muted-foreground mb-2">
                Turn OFF Strict Safety Mode in settings to view
              </p>
            )}
            {!shouldHideMature && shouldHideSpoiler && (
              <Button size="sm" variant="outline" onClick={() => setRevealSpoiler(true)}>
                Reveal Spoiler
              </Button>
            )}
            {shouldHideMature && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate('/settings')}
                className="mt-2"
              >
                Open Safety Settings
              </Button>
            )}
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
                  if (contentInfo.type === 'show') {
                    navigate(`/show/${contentInfo.externalId}`);
                  } else if (contentInfo.type === 'episode') {
                    const [showId, seasonNum, episodeNum] = contentInfo.externalId.split(':');
                    navigate(`/show/${showId}/season/${seasonNum}/episode/${episodeNum}`);
                  } else if (contentInfo.type === 'season') {
                    const [showId, seasonNum] = contentInfo.externalId.split(':');
                    navigate(`/show/${showId}/season/${seasonNum}`);
                  }
                }}
              >
                <Tv className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium truncate">{contentInfo.title}</span>
              </div>
            )}
            {post.body && (
              <div>
                <p className="text-base whitespace-pre-wrap break-words text-foreground font-medium leading-relaxed">{displayText}</p>
                {post.edited_at && (
                  <Collapsible open={showEditHistory} onOpenChange={setShowEditHistory}>
                    <CollapsibleTrigger className="text-xs text-muted-foreground mt-1 hover:underline cursor-pointer flex items-center gap-1 hover:text-foreground transition-colors">
                      <Clock className="h-3 w-3" />
                      Edited
                      <ChevronDown className={`h-3 w-3 transition-transform ${showEditHistory ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        {editHistory.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Loading history...</p>
                        ) : (
                          editHistory.map((edit) => (
                            <div key={edit.id} className="text-xs space-y-1">
                              <div className="text-muted-foreground">
                                {new Date(edit.edited_at).toLocaleString()}
                              </div>
                              {edit.previous_body && (
                                <div className="text-foreground/80 line-through">
                                  {replaceProfanity(edit.previous_body)}
                                </div>
                              )}
                              {edit.previous_rating_percent !== null && (
                                <div className="text-foreground/80 line-through">
                                  Rating: {edit.previous_rating_percent}%
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
            
            {post.video_embed_url && (
              <div className="mt-3">
                <EmbeddedVideoPlayer url={post.video_embed_url} />
              </div>
            )}
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
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          onClick={() => navigate(`/post/${post.id}`)}
        >
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
                  toast.success(`Shared with ${u.handle}`);
                  setShowShareDialog(false);
                } catch {
                  toast.error('Failed to share');
                }
              }}>
                {u.handle}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <EditPostDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        post={post}
        onSuccess={onReactionChange || (() => {})}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
