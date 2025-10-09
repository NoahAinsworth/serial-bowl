import { Button } from '@/components/ui/button';
import { Star, MessageSquare } from 'lucide-react';

interface PostTypeSelectorProps {
  onReviewClick: () => void;
  onThoughtClick: () => void;
}

export function PostTypeSelector({ onReviewClick, onThoughtClick }: PostTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant="outline"
        onClick={onReviewClick}
        className="w-full h-auto py-3 flex-col gap-1 text-xs"
      >
        <Star className="h-5 w-5" />
        <span className="whitespace-nowrap">WRITE REVIEW</span>
      </Button>
      <Button
        variant="outline"
        onClick={onThoughtClick}
        className="w-full h-auto py-3 flex-col gap-1 text-xs"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="whitespace-nowrap">SHARE THOUGHT</span>
      </Button>
    </div>
  );
}
