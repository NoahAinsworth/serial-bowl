import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: {
    id: string;
    user: {
      id: string;
      handle: string;
      avatar_url?: string;
    };
    reviewText: string;
    rating: number;
    content: {
      id: string;
      title: string;
      poster_url?: string;
      external_id: string;
      kind: string;
    };
    createdAt: string;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-4 hover:border-primary/50 transition-all duration-300 animate-fade-in hover-scale">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0 cursor-pointer" onClick={() => navigate(`/user/${review.user.id}`)}>
          <AvatarImage src={review.user.avatar_url} alt={review.user.handle} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
            {review.user.handle[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-foreground">
              {review.user.handle}
            </span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="flex items-start gap-3 mb-3">
            {review.content.poster_url && (
              <div 
                className="w-16 h-24 rounded-md overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
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
                className="font-semibold text-foreground mb-1 cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate(`/show/${review.content.external_id}`)}
              >
                {review.content.title}
              </div>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-lg font-bold text-primary">{review.rating}</span>
                <Star className="h-4 w-4 fill-primary text-primary" />
              </div>
            </div>
          </div>

          <p className="text-foreground break-words">{review.reviewText}</p>
        </div>
      </div>
    </Card>
  );
}
