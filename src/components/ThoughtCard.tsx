import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Repeat2, Trash2 } from 'lucide-react';
import { SpoilerText } from '@/components/SpoilerText';
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

interface ThoughtCardProps {
  thought: {
    id: string;
    user: {
      id: string;
      handle: string;
      avatar_url?: string;
    };
    content: string;
    is_spoiler?: boolean;
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
    rethinks: number;
    userReaction?: 'like' | 'dislike' | 'rethink';
  };
  userHideSpoilers?: boolean;
  onReactionChange?: () => void;
  onDelete?: () => void;
}

export function ThoughtCard({ thought, userHideSpoilers = true, onReactionChange, onDelete }: ThoughtCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [localReaction, setLocalReaction] = useState(thought.userReaction);
  const [localLikes, setLocalLikes] = useState(thought.likes);
  const [localDislikes, setLocalDislikes] = useState(thought.dislikes);
  const [localRethinks, setLocalRethinks] = useState(thought.rethinks);
  const [showComments, setShowComments] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const isOwner = user?.id === thought.user.id;

  const handleReaction = async (type: 'like' | 'dislike' | 'rethink') => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to react to thoughts",
        variant: "destructive",
      });
      return;
    }

    try {
      if (localReaction === type) {
        await supabase
          .from('reactions')
          .delete()
          .eq('thought_id', thought.id)
          .eq('user_id', user.id)
          .eq('reaction_type', type);

        if (type === 'like') setLocalLikes(prev => prev - 1);
        if (type === 'dislike') setLocalDislikes(prev => prev - 1);
        if (type === 'rethink') setLocalRethinks(prev => prev - 1);
        setLocalReaction(undefined);
      } else {
        if (localReaction) {
          await supabase
            .from('reactions')
            .delete()
            .eq('thought_id', thought.id)
            .eq('user_id', user.id)
            .eq('reaction_type', localReaction);

          if (localReaction === 'like') setLocalLikes(prev => prev - 1);
          if (localReaction === 'dislike') setLocalDislikes(prev => prev - 1);
          if (localReaction === 'rethink') setLocalRethinks(prev => prev - 1);
        }

        await supabase
          .from('reactions')
          .insert({
            thought_id: thought.id,
            user_id: user.id,
            reaction_type: type,
          });

        if (type === 'like') setLocalLikes(prev => prev + 1);
        if (type === 'dislike') setLocalDislikes(prev => prev + 1);
        if (type === 'rethink') setLocalRethinks(prev => prev + 1);
        setLocalReaction(type);
      }

      onReactionChange?.();
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
      const { error } = await supabase
        .from('thoughts')
        .delete()
        .eq('id', thought.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Thought deleted",
        description: "Your thought has been removed",
      });

      onDelete?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete thought",
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  return (
    <Card className="p-4 transition-all duration-200 animate-fade-in group">
      <div className="flex gap-3">
        <div className="profile-ring">
          <Avatar className="h-10 w-10 flex-shrink-0 cursor-pointer transition-transform active:scale-95" onClick={() => navigate(`/user/${thought.user.id}`)}>
            <AvatarImage src={thought.user.avatar_url} alt={thought.user.handle} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
              {thought.user.handle[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-semibold text-foreground truncate">
              {thought.user.handle}
            </span>
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
                    <AlertDialogTitle>Delete thought?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your thought.
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
          </div>
          <SpoilerText content={thought.content} isSpoiler={thought.is_spoiler && userHideSpoilers} />
          <div className="flex flex-wrap gap-2 mb-3">
            {thought.show && (
              <div 
                className="inline-block px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 text-primary text-sm cursor-pointer active:from-primary/20 active:to-primary/10 transition-all duration-300 border border-primary/20 active:border-primary/40 active:scale-95"
                onClick={() => thought.show?.external_id && navigate(`/show/${thought.show.external_id}`)}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-base">📺</span>
                  <span className="font-medium">{thought.show.title}</span>
                </span>
              </div>
            )}
            {thought.season && (
              <div 
                className="inline-block px-3 py-1.5 rounded-lg bg-gradient-to-r from-secondary/10 to-secondary/5 text-secondary text-sm cursor-pointer active:from-secondary/20 active:to-secondary/10 transition-all duration-300 border border-secondary/20 active:border-secondary/40 active:scale-95"
                onClick={() => thought.season?.show_external_id && thought.season?.external_id && navigate(`/show/${thought.season.show_external_id}/season/${thought.season.external_id}`)}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-base">📖</span>
                  <span className="font-medium">{thought.season.title}</span>
                </span>
              </div>
            )}
            {thought.episode && (
              <div 
                className="inline-block px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent/10 to-accent/5 text-accent text-sm cursor-pointer active:from-accent/20 active:to-accent/10 transition-all duration-300 border border-accent/20 active:border-accent/40 active:scale-95"
                onClick={() => thought.episode?.show_external_id && thought.episode?.season_external_id && thought.episode?.external_id && navigate(`/show/${thought.episode.show_external_id}/season/${thought.episode.season_external_id}/episode/${thought.episode.external_id}`)}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-base">🎬</span>
                  <span className="font-medium">{thought.episode.title}</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-6 text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction('like')}
              className={`transition-all duration-200 ${localReaction === 'like' ? 'text-primary' : ''}`}
            >
              <Heart className={`h-4 w-4 mr-1 ${localReaction === 'like' ? 'fill-primary' : ''}`} />
              <span className="text-sm">{localLikes}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="active:text-accent transition-colors"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">{thought.comments}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction('rethink')}
              className={`transition-all duration-200 ${localReaction === 'rethink' ? 'text-secondary' : ''}`}
            >
              <Repeat2 className="h-4 w-4 mr-1" />
              <span className="text-sm">{localRethinks}</span>
            </Button>
          </div>

          {showComments && <CommentsSection thoughtId={thought.id} />}
        </div>
      </div>
    </Card>
  );
}
