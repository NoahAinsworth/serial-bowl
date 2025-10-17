import { FEATURE_WATCH_AND_BADGES } from '@/lib/featureFlags';

interface WatchBadgeProps {
  badgeTier?: string | null;
  hoursWatched?: number;
  compact?: boolean;
}

const BADGE_CONFIG = {
  'Casual Viewer': { emoji: '🍿', shortLabel: 'Casual' },
  'Episodically Easy': { emoji: '📺', shortLabel: 'Easy' },
  'Season Smasher': { emoji: '🎬', shortLabel: 'Smasher' },
  'Binge Legend': { emoji: '🌀', shortLabel: 'Legend' },
};

export function WatchBadge({ badgeTier, hoursWatched = 0, compact = false }: WatchBadgeProps) {
  if (!FEATURE_WATCH_AND_BADGES) return null;

  // Default to Casual Viewer if no badge tier yet
  const tier = badgeTier || 'Casual Viewer';
  const config = BADGE_CONFIG[tier as keyof typeof BADGE_CONFIG] || { emoji: '🍿', shortLabel: 'Casual' };
  
  if (compact) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs opacity-80">
        <span>{config.emoji}</span>
        <span>{config.shortLabel}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span>{hoursWatched.toFixed(1)} hrs watched</span>
      <span>•</span>
      <span className="inline-flex items-center gap-1">
        <span>{config.emoji}</span>
        <span>{tier}</span>
      </span>
    </div>
  );
}
