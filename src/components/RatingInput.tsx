import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingInputProps {
  initialRating?: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
}

export function RatingInput({ initialRating = 0, onRate, disabled = false }: RatingInputProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(initialRating);

  const handleClick = (rating: number) => {
    if (disabled) return;
    // Toggle: if clicking the same rating, deselect it
    const newRating = selectedRating === rating ? 0 : rating;
    setSelectedRating(newRating);
    onRate(newRating);
  };

  const displayRating = hoveredRating || selectedRating;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => handleClick(rating)}
            onMouseEnter={() => !disabled && setHoveredRating(rating)}
            onMouseLeave={() => !disabled && setHoveredRating(0)}
            className={cn(
              "transition-all duration-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                rating <= displayRating
                  ? "fill-primary text-primary"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
      {selectedRating > 0 && (
        <div className="text-center">
          <span className="text-2xl font-bold text-primary">{selectedRating * 10}%</span>
          <span className="text-sm text-muted-foreground ml-2">({selectedRating}/10)</span>
        </div>
      )}
    </div>
  );
}
