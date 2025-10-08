import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { SpoilerText } from '@/components/SpoilerText';
import { RatingBadge } from '@/components/PercentRating';

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
  };
  userHideSpoilers?: boolean;
  onDelete?: () => void;
}

export function ReviewCard({ review, userHideSpoilers = true }: ReviewCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-4 transition-all duration-200 animate-fade-in group">
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
        </div>
      </div>
    </Card>
  );
}
