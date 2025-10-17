import { cn } from "@/lib/utils";

interface ProfileRingProps {
  points: number;
  badge: string;
  children: React.ReactNode;
}

const BADGE_THRESHOLDS = [
  { name: 'Pilot Watcher', min: 0, max: 49, color: 'from-gray-400 to-gray-500' },
  { name: 'Casual Viewer', min: 50, max: 149, color: 'from-blue-400 to-blue-600' },
  { name: 'Marathon Madness', min: 150, max: 299, color: 'from-orange-400 to-yellow-500' },
  { name: 'Season Smasher', min: 300, max: 499, color: 'from-red-500 to-orange-600' },
  { name: 'Series Finisher', min: 500, max: 799, color: 'from-purple-500 to-pink-600' },
  { name: 'Stream Scholar', min: 800, max: 1199, color: 'from-teal-400 to-cyan-600' },
  { name: 'Ultimate Binger', min: 1200, max: Infinity, color: 'from-purple-500 via-pink-500 to-blue-500' },
];

const BADGE_COLORS = {
  'Pilot Watcher': { start: '#9ca3af', end: '#6b7280', glow: 'from-gray-400 to-gray-500' },
  'Casual Viewer': { start: '#60a5fa', end: '#2563eb', glow: 'from-blue-400 to-blue-600' },
  'Marathon Madness': { start: '#fb923c', end: '#eab308', glow: 'from-orange-400 to-yellow-500' },
  'Season Smasher': { start: '#ef4444', end: '#ea580c', glow: 'from-red-500 to-orange-600' },
  'Series Finisher': { start: '#a855f7', end: '#ec4899', glow: 'from-purple-500 to-pink-600' },
  'Stream Scholar': { start: '#2dd4bf', end: '#0891b2', glow: 'from-teal-400 to-cyan-600' },
  'Ultimate Binger': { start: '#a855f7', end: '#3b82f6', glow: 'from-purple-500 via-pink-500 to-blue-500' },
};

export function ProfileRing({ points, badge, children }: ProfileRingProps) {
  const currentTier = BADGE_THRESHOLDS.find(t => t.name === badge) || BADGE_THRESHOLDS[0];
  const currentIndex = BADGE_THRESHOLDS.findIndex(t => t.name === badge);
  const nextTier = currentIndex < BADGE_THRESHOLDS.length - 1 ? BADGE_THRESHOLDS[currentIndex + 1] : null;
  
  const progress = nextTier 
    ? ((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  const badgeColors = BADGE_COLORS[badge as keyof typeof BADGE_COLORS] || BADGE_COLORS['Pilot Watcher'];
  const gradientId = `gradient-${badge.replace(/\s+/g, '-')}`;

  return (
    <div className="relative inline-block">
      {/* Animated background glow */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full opacity-50 blur-xl animate-pulse",
          `bg-gradient-to-r ${badgeColors.glow}`
        )}
        style={{ animationDuration: '3s' }}
      />
      
      {/* Ring container */}
      <div className="relative p-1">
        {/* Background ring */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={badgeColors.start} />
              <stop offset="100%" stopColor={badgeColors.end} />
            </linearGradient>
          </defs>
          
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/20"
          />
          
          {/* Progress ring */}
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              strokeDasharray: `${2 * Math.PI * 95}`,
              strokeDashoffset: `${2 * Math.PI * 95 * (1 - progress / 100)}`,
            }}
          />
        </svg>
        
        {/* Content */}
        <div className="absolute inset-4 flex items-center justify-center">
          {children}
        </div>
      </div>

    </div>
  );
}
