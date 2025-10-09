import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PercentRatingProps {
  initialRating?: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
  compact?: boolean;
  showSaveButton?: boolean;
}

export function PercentRating({ 
  initialRating = 0, 
  onRate, 
  disabled = false,
  compact = false,
  showSaveButton = false
}: PercentRatingProps) {
  const [value, setValue] = useState(initialRating ?? 0);
  const [hasChanged, setHasChanged] = useState(false);

  // Sync internal state when initialRating changes
  useEffect(() => {
    setValue(initialRating ?? 0);
    setHasChanged(false);
  }, [initialRating]);

  const handleValueChange = (newValue: number[]) => {
    setValue(newValue[0]);
    setHasChanged(true);
  };

  const handleCommit = () => {
    if (!disabled && hasChanged) {
      onRate(value);
      setHasChanged(false);
    }
  };

  const getColorClass = () => {
    if (value < 40) return 'text-muted-foreground';
    if (value < 70) return 'text-secondary';
    return 'text-primary';
  };

  const getSliderColor = () => {
    if (value < 40) return 'bg-muted';
    if (value < 70) return 'bg-secondary';
    return 'bg-primary';
  };

  if (compact) {
    return (
      <div className={cn("space-y-1", disabled && "opacity-50")}>
        <Slider
          value={[value]}
          onValueChange={handleValueChange}
          onValueCommit={handleCommit}
          min={1}
          max={100}
          step={1}
          disabled={disabled}
          className="w-full"
        />
        <div className="text-center">
          <span className={cn("text-lg font-bold", getColorClass())}>{value}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", disabled && "opacity-50")}>
      <div className="space-y-2">
        <Slider
          value={[value]}
          onValueChange={handleValueChange}
          onValueCommit={!showSaveButton ? handleCommit : undefined}
          min={1}
          max={100}
          step={1}
          disabled={disabled}
          className="w-full"
          aria-label="Rating percentage"
          aria-valuemin={1}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={`${value} percent`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1%</span>
          <span>100%</span>
        </div>
      </div>
      
      <div className="text-center">
        <span className={cn("text-4xl font-bold", getColorClass())}>{value}%</span>
        <p className="text-sm text-muted-foreground mt-1">Your rating</p>
      </div>

      {showSaveButton && hasChanged && (
        <Button 
          onClick={handleCommit} 
          disabled={disabled}
          className="w-full"
        >
          Save Rating
        </Button>
      )}
    </div>
  );
}

// Display-only badge component
interface RatingBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function RatingBadge({ rating, size = 'md', label }: RatingBadgeProps) {
  const getColorClass = () => {
    if (rating < 40) return 'text-muted-foreground border-muted';
    if (rating < 70) return 'text-secondary border-secondary';
    return 'text-primary border-primary';
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-lg px-4 py-2'
  };

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className={cn(
        "rounded-full border-2 font-bold",
        sizeClasses[size],
        getColorClass()
      )}>
        {rating}%
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
