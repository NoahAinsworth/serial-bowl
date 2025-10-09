import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, ThumbsDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SpoilerText } from '@/components/SpoilerText';
import { RatingBadge } from '@/components/PercentRating';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ReviewCardProps {
  review: {
    id: string;
    user: {
      id: string;
      handle: string;
      avatar_url?: string | null;
    };
    text: string;
    rating: number | null;
    is_spoiler?: boolean;
    content?: {
      id: string;
      title: string;
      poster_url?: string;
      external_id: string;
      kind: string;
    } | null;
    created_at: string;
    likes?: number;
    dislikes?: number;
    userReaction?: 'like' | 'dislike';
  };
  userHideSpoilers?: boolean;
  onDelete?: () => void;
}

export function ReviewCard({ review, userHideSpoilers = true, onDelete }: ReviewCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [localReaction, setLocalReaction] = useState(review.userReaction);
  const [localLikes, setLocalLikes] = useState(review.likes || 0);
  const [localDislikes, setLocalDislikes] = useState(review.dislikes || 0);

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to react to reviews",
        variant: "destructive",
      });
      return;
    }

    try {
      const isLiked = localReaction === 'like';

      if (isLiked) {
        await supabase
          .from('review_likes')
          .delete()
          .eq('review_id', review.id)
          .eq('user_id', user.id);

        setLocalLikes(prev => prev - 1);
        setLocalReaction(undefined);
      } else {
        if (localReaction === 'dislike') {
          await supabase
            .from('review_dislikes')
            .delete()
            .eq('review_id', review.id)
            .eq('user_id', user.id);

          setLocalDislikes(prev => prev - 1);
        }

        await supabase
          .from('review_likes')
          .insert({
            review_id: review.id,
            user_id: user.id,
          });

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
        description: "Please sign in to react to reviews",
        variant: "destructive",
      });
      return;
    }

    try {
      const isDisliked = localReaction === 'dislike';

      if (isDisliked) {
        await supabase
          .from('review_dislikes')
          .delete()
          .eq('review_id', review.id)
          .eq('user_id', user.id);

        setLocalDislikes(prev => prev - 1);
        setLocalReaction(undefined);
      } else {
        if (localReaction === 'like') {
          await supabase
            .from('review_likes')
            .delete()
            .eq('review_id', review.id)
            .eq('user_id', user.id);

          setLocalLikes(prev => prev - 1);
        }

        await supabase
          .from('review_dislikes')
          .insert({
            review_id: review.id,
            user_id: user.id,
          });

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

  return (
    <article className="py-4 border-b border-border/30 transition-all duration-200 animate-fade-in group">
      <div className="flex gap-3">
        <div className="profile-ring">
          <Avatar className="h-10 w-10 flex-shrink-0 cursor-pointer transition-transform active:scale-95" onClick={() => navigate(`/user/${review.user.id}`)}>
            <AvatarImage src={review.user.avatar_url || undefined} alt={review.user.handle} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
              {review.user.handle[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-foreground">
              {review.user.handle}
            </span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
            </span>
          </div>

          {review.content && (
            <div className="flex items-start gap-3 mb-3">
              {review.content.poster_url && (
                <div 
                  className="w-16 h-24 rounded-md overflow-hidden flex-shrink-0 cursor-pointer active:opacity-80 transition-opacity"
                  onClick={() => navigate(`/show/${review.content.external_id}`)}
                >
                  <img 
                    src={review.content.poster_url} 
                    alt={review.content.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div 
                  className="font-semibold text-foreground mb-1 cursor-pointer active:text-primary transition-colors"
                  onClick={() => navigate(`/show/${review.content.external_id}`)}
                >
                  {review.content.title}
                </div>
                {review.rating && (
                  <div className="mb-2">
                    <RatingBadge rating={review.rating} size="sm" />
                  </div>
                )}
              </div>
            </div>
          )}

          <SpoilerText content={review.text} isSpoiler={review.is_spoiler && userHideSpoilers} />

          {(review.likes !== undefined || review.dislikes !== undefined) && (
            <div className="flex items-center gap-6 text-muted-foreground mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`transition-all duration-200 ${localReaction === 'like' ? 'text-primary' : ''}`}
              >
                <Heart className={`h-4 w-4 mr-1 ${localReaction === 'like' ? 'fill-primary' : ''}`} />
                <span className="text-sm">{localLikes}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDislike}
                className={`transition-all duration-200 ${localReaction === 'dislike' ? 'text-destructive' : ''}`}
              >
                <ThumbsDown className={`h-4 w-4 mr-1 ${localReaction === 'dislike' ? 'fill-destructive' : ''}`} />
                <span className="text-sm">{localDislikes}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}