import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BowlScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'global' | 'personal';
  showLabel?: boolean;
  showEmpty?: boolean;
  className?: string;
}

export function BowlScoreBadge({ 
  score, 
  size = 'md', 
  variant = 'global',
  showLabel = false,
  showEmpty = false,
  className 
}: BowlScoreBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  if (score === null || score === undefined) {
    if (!showEmpty) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-2 font-medium shadow-sm",
                sizeClasses[size],
                "bg-muted/50 text-muted-foreground border-border/50",
                className
              )}
            >
              {variant === 'personal' && (
                <User className={iconSizes[size]} />
              )}
              <span>Not Rated Yet</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {variant === 'global' 
                ? "No community ratings yet" 
                : "Rate episodes, seasons, or the show to see your Bowl Score"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    if (score >= 40) return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
    return 'bg-red-500/10 text-red-600 border-red-500/30';
  };

  const tooltipContent = variant === 'global' 
    ? "Bowl Score: Community weighted rating based on episodes, seasons, and show ratings"
    : "Your Bowl Score: Your personal weighted rating based on your episode, season, and show ratings";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border-2 font-bold shadow-sm transition-all",
              sizeClasses[size],
              getScoreColor(score),
              className
            )}
          >
            {variant === 'personal' && (
              <User className={iconSizes[size]} />
            )}
            <span>{score}%</span>
            {showLabel && (
              <span className="font-semibold">
                {variant === 'global' ? 'Bowl Score' : 'You'}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
