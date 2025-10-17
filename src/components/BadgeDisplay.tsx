import { cn } from '@/lib/utils';

const BADGE_CONFIG = {
  bronze: {
    emoji: '🥉',
    color: 'text-amber-600',
    gradient: 'from-amber-600 to-amber-800',
  },
  silver: {
    emoji: '🥈',
    color: 'text-gray-400',
    gradient: 'from-gray-300 to-gray-500',
  },
  gold: {
    emoji: '🥇',
    color: 'text-yellow-500',
    gradient: 'from-yellow-400 to-yellow-600',
  },
  platinum: {
    emoji: '💎',
    color: 'text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text',
    gradient: 'from-cyan-400 to-blue-500',
  },
} as const;

interface BadgeDisplayProps {
  badge: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  variant?: 'full' | 'compact' | 'emoji-only';
  className?: string;
}

export function BadgeDisplay({ badge, variant = 'compact', className }: BadgeDisplayProps) {
  if (!badge) {
    return <span className={cn("text-xs text-muted-foreground", className)}>No badge</span>;
  }

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
        <span className="capitalize">{badge}</span>
      </div>
    );
  }
  
  // compact
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', config.color, className)}>
      <span>{config.emoji}</span>
      <span className="capitalize">{badge}</span>
    </span>
  );
}
