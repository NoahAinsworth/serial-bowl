import { BADGE_CONFIG, WatchStats } from '@/lib/watchHours';
import { cn } from '@/lib/utils';

interface BadgeDisplayProps {
  badge: WatchStats['badgeTier'];
  variant?: 'full' | 'compact' | 'emoji-only';
  className?: string;
}

export function BadgeDisplay({ badge, variant = 'compact', className }: BadgeDisplayProps) {
  const config = BADGE_CONFIG[badge];
  
  if (variant === 'emoji-only') {
    return <span className={cn("text-sm", className)}>{config.emoji}</span>;
  }
  
  if (variant === 'full') {
    return (
      <div className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
        'bg-gradient-to-r', config.gradient,
        'text-white shadow-sm',
        className
      )}>
        <span>{config.emoji}</span>
        <span>{badge}</span>
      </div>
    );
  }
  
  // compact
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', config.color, className)}>
      <span>{config.emoji}</span>
      <span>{badge}</span>
    </span>
  );
}
