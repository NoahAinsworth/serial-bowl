import { Button } from '@/components/ui/button';
import { Star, MessageSquare } from 'lucide-react';

interface PostTypeSelectorProps {
  onReviewClick: () => void;
  onThoughtClick: () => void;
}

export function PostTypeSelector({ onReviewClick, onThoughtClick }: PostTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        onClick={onReviewClick}
        className="w-full"
      >
        <Star className="mr-2 h-4 w-4" />
        Write Review
      </Button>
      <Button
        variant="outline"
        onClick={onThoughtClick}
        className="w-full"
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        Share Thought
      </Button>
    </div>
  );
}
