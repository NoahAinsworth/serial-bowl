import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Trash2, ThumbsDown, MoreVertical, EyeOff, Flag, Send } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SpoilerText } from '@/components/SpoilerText';
import { RatingBadge } from '@/components/PercentRating';
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
import { CommentsSection } from '@/components/CommentsSection';
import { SafetyOverlay } from '@/components/SafetyOverlay';
import { replaceProfanity } from '@/utils/profanityFilter';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: {
    id: string;
    type: 'thought' | 'review' | 'rating';
    user: {
      id: string;
      handle: string;
      avatar_url?: string;
    };
    text: string;
    rating?: number | null;
    is_spoiler?: boolean;
    contains_mature?: boolean;
    mature_reasons?: string[];
    content?: {
      id: string;
      title: string;
      poster_url?: string;
      external_id: string;
      kind: string;
    } | null;
    show?: {
      title: string;
      external_id?: string;
    };
    season?: {
      title: string;
      external_id?: string;
      show_external_id?: string;
    };
    episode?: {
      title: string;
      external_id?: string;
      season_external_id?: string;
      show_external_id?: string;
    };
    likes: number;
    dislikes: number;
    comments: number;
    userReaction?: 'like' | 'dislike';
    created_at?: string;
  };
  userHideSpoilers?: boolean;
  strictSafety?: boolean;
  onReactionChange?: () => void;
  onDelete?: () => void;
}

export function PostCard({ post, userHideSpoilers = true, strictSafety = false, onReactionChange, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [localReaction, setLocalReaction] = useState<'like' | 'dislike' | undefined>(post.userReaction);
  const [localLikes, setLocalLikes] = useState(post.likes);
  const [localDislikes, setLocalDislikes] = useState(post.dislikes);
  const [showComments, setShowComments] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  
  const isOwner = user?.id === post.user.id;

  // Post type styling
  const typeConfig = {
    thought: {
      label: 'Thought',
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      glow: 'shadow-[0_0_20px_-5px_rgba(168,85,247,0.3)]'
    },
    review: {
      label: 'Review',
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      glow: 'shadow-[0_0_20px_-5px_rgba(234,179,8,0.3)]'
    },
    rating: {
      label: 'Rating',
      color: 'bg-green-500/10 text-green-500 border-green-500/20',
      glow: 'shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]'
    }
  };

  const config = typeConfig[post.type];

  const handleHidePost = () => {
    setHidden(true);
    setShowUndo(true);
    toast({
      title: "Post hidden",
      description: "Undo?",
      action: (
        <Button variant="outline" size="sm" onClick={() => {
          setHidden(false);
          setShowUndo(false);
        }}>
          Undo
        </Button>
      ),
    });
  };

  const handleReport = () => {
    navigate('/settings', { 
      state: { 
        openTab: 'legal', 
        scrollTo: 'report',
        reportData: {
          reason: '',
          description: `Reported ${post.type} by ${post.user.handle}:\n\n"${post.text}"`,
          userOrLink: post.user.handle,
        }
      } 
    });
  };

  const handleShare = () => {
    navigate('/messages', { state: { sharePost: post } });
  };

  if (hidden && !showUndo) return null;

  const isSpoilerHidden = post.is_spoiler && userHideSpoilers && !spoilerRevealed;
  const isSexualHidden = strictSafety && post.contains_mature && post.mature_reasons?.includes('sexual');
  const overlayType = isSexualHidden && isSpoilerHidden ? 'both' : isSexualHidden ? 'sexual' : isSpoilerHidden ? 'spoiler' : null;

  const displayContent = strictSafety ? replaceProfanity(post.text) : post.text;

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to react to posts",
        variant: "destructive",
      });
      return;
    }

    try {
      if (localReaction === 'like') {
        // Remove like
        if (post.type === 'thought') {
          await supabase
            .from('reactions')
            .delete()
            .eq('thought_id', post.id)
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('review_likes')
            .delete()
            .eq('review_id', post.id)
            .eq('user_id', user.id);
        }

        setLocalLikes(prev => prev - 1);
        setLocalReaction(undefined);
      } else {
        // Remove dislike if exists
        if (localReaction === 'dislike') {
          if (post.type === 'thought') {
            await supabase
              .from('thought_dislikes')
              .delete()
              .eq('thought_id', post.id)
              .eq('user_id', user.id);
          } else {
            await supabase
              .from('review_dislikes')
              .delete()
              .eq('review_id', post.id)
              .eq('user_id', user.id);
          }
          setLocalDislikes(prev => prev - 1);
        }

        // Add like
        if (post.type === 'thought') {
          await supabase.from('reactions').insert({
            thought_id: post.id,
            user_id: user.id,
            reaction_type: 'like'
          });
        } else {
          await supabase.from('review_likes').insert({
            review_id: post.id,
            user_id: user.id
          });
        }

        setLocalLikes(prev => prev + 1);
        setLocalReaction('like');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to react to posts",
        variant: "destructive",
      });
      return;
    }

    try {
      if (localReaction === 'dislike') {
        // Remove dislike
        if (post.type === 'thought') {
          await supabase
            .from('thought_dislikes')
            .delete()
            .eq('thought_id', post.id)
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('review_dislikes')
            .delete()
            .eq('review_id', post.id)
            .eq('user_id', user.id);
        }

        setLocalDislikes(prev => prev - 1);
        setLocalReaction(undefined);
      } else {
        // Remove like if exists
        if (localReaction === 'like') {
          if (post.type === 'thought') {
            await supabase
              .from('reactions')
              .delete()
              .eq('thought_id', post.id)
              .eq('user_id', user.id);
          } else {
            await supabase
              .from('review_likes')
              .delete()
              .eq('review_id', post.id)
              .eq('user_id', user.id);
          }
          setLocalLikes(prev => prev - 1);
        }

        // Add dislike
        if (post.type === 'thought') {
          await supabase.from('thought_dislikes').insert({
            thought_id: post.id,
            user_id: user.id
          });
        } else {
          await supabase.from('review_dislikes').insert({
            review_id: post.id,
            user_id: user.id
          });
        }

        setLocalDislikes(prev => prev + 1);
        setLocalReaction('dislike');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!user || !isOwner) return;

    setDeleting(true);
    try {
      const table = post.type === 'thought' ? 'thoughts' : 'reviews';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', post.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: `${post.type === 'thought' ? 'Thought' : 'Review'} deleted`,
        description: `Your ${post.type} has been removed`,
      });

      onDelete?.();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${post.type}`,
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  return (
    <article className={cn(
      "relative py-4 bg-card border border-border/20 rounded-2xl px-4 mb-3 transition-all duration-200 animate-fade-in group",
      config.glow
    )}>
      {/* Post Type Badge */}
      <Badge variant="outline" className={cn("absolute top-3 right-3 text-xs font-semibold", config.color)}>
        {config.label}
      </Badge>

      {overlayType && <SafetyOverlay type={overlayType} onRevealSpoiler={() => setSpoilerRevealed(true)} />}
      
      <div className={`flex gap-3 ${isSpoilerHidden ? 'blur-md' : ''}`}>
        <div>
          <Avatar 
            className="h-10 w-10 flex-shrink-0 cursor-pointer transition-transform active:scale-95" 
            onClick={() => navigate(`/user/${post.user.handle}`)}
          >
            <AvatarImage src={post.user.avatar_url} alt={post.user.handle} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
              {post.user.handle[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span 
              className="font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate(`/user/${post.user.handle}`)}
            >
              {post.user.handle}
            </span>
            <div className="flex items-center gap-1">
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground active:text-destructive h-8 w-8 p-0"
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {post.type}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your {post.type}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive active:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleHidePost}>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReport}>
                    <Flag className="h-4 w-4 mr-2" />
                    Report...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Content with poster for reviews */}
          {post.type === 'review' && post.content && (
            <div className="flex items-start gap-3 mb-3">
              {post.content.poster_url && (
                <div 
                  className="w-16 h-24 rounded-md overflow-hidden flex-shrink-0 cursor-pointer active:opacity-80 transition-opacity"
                  onClick={() => navigate(`/show/${post.content.external_id}`)}
                >
                  <img 
                    src={post.content.poster_url} 
                    alt={post.content.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div 
                  className="font-semibold text-foreground mb-1 cursor-pointer active:text-primary transition-colors"
                  onClick={() => navigate(`/show/${post.content.external_id}`)}
                >
                  {post.content.title}
                </div>
                {post.rating && (
                  <div className="mb-2">
                    <RatingBadge rating={post.rating} size="md" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Show/Season/Episode tags for thoughts */}
          {post.type === 'thought' && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.show && (
                <div 
                  className="inline-block px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 text-primary text-sm cursor-pointer active:from-primary/20 active:to-primary/10 transition-all duration-300 border border-primary/20 active:border-primary/40 active:scale-95"
                  onClick={() => post.show?.external_id && navigate(`/show/${post.show.external_id}`)}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">📺</span>
                    <span className="font-medium">{post.show.title}</span>
                  </span>
                </div>
              )}
              {post.season && (
                <div 
                  className="inline-block px-3 py-1.5 rounded-lg bg-gradient-to-r from-secondary/10 to-secondary/5 text-secondary text-sm cursor-pointer active:from-secondary/20 active:to-secondary/10 transition-all duration-300 border border-secondary/20 active:border-secondary/40 active:scale-95"
                  onClick={() => post.season?.show_external_id && post.season?.external_id && navigate(`/show/${post.season.show_external_id}/season/${post.season.external_id}`)}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">📖</span>
                    <span className="font-medium">{post.season.title}</span>
                  </span>
                </div>
              )}
              {post.episode && (
                <div 
                  className="inline-block px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent/10 to-accent/5 text-accent text-sm cursor-pointer active:from-accent/20 active:to-accent/10 transition-all duration-300 border border-accent/20 active:border-accent/40 active:scale-95"
                  onClick={() => post.episode?.show_external_id && post.episode?.season_external_id && post.episode?.external_id && navigate(`/show/${post.episode.show_external_id}/season/${post.episode.season_external_id}/episode/${post.episode.external_id}`)}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">🎬</span>
                    <span className="font-medium">{post.episode.title}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Text content */}
          {post.text && <SpoilerText content={displayContent} isSpoiler={false} />}

          {/* Rating for rating-only posts */}
          {post.type === 'rating' && post.rating && !post.text && (
            <div className="mb-3">
              <RatingBadge rating={post.rating} size="md" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 text-muted-foreground mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`transition-all duration-200 ${
                localReaction === 'like' 
                  ? 'text-primary bg-primary/10 hover:bg-primary/20 scale-105' 
                  : 'hover:bg-accent/10 scale-100'
              }`}
            >
              <Heart className={`h-4 w-4 mr-1 transition-all duration-200 ${
                localReaction === 'like' 
                  ? 'fill-primary scale-110' 
                  : 'scale-100'
              }`} />
              <span className="text-sm font-medium">{localLikes}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDislike}
              className={`transition-all duration-200 ${
                localReaction === 'dislike' 
                  ? 'text-destructive bg-destructive/10 hover:bg-destructive/20 scale-105' 
                  : 'hover:bg-accent/10 scale-100'
              }`}
            >
              <ThumbsDown className={`h-4 w-4 mr-1 transition-all duration-200 ${
                localReaction === 'dislike' 
                  ? 'fill-destructive scale-110' 
                  : 'scale-100'
              }`} />
              <span className="text-sm font-medium">{localDislikes}</span>
            </Button>
            {post.type === 'thought' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="active:text-accent transition-colors"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">{post.comments}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="active:text-primary transition-colors ml-auto"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {showComments && post.type === 'thought' && <CommentsSection thoughtId={post.id} />}
        </div>
      </div>
    </article>
  );
}
