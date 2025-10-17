import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeDisplayProps {
  badge: string;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
}

const BADGE_COLORS: Record<string, string> = {
  'Pilot Watcher': 'text-gray-400',
  'Casual Viewer': 'text-blue-500',
  'Marathon Madness': 'text-orange-500',
  'Season Smasher': 'text-red-500',
  'Series Finisher': 'text-purple-500',
  'Stream Scholar': 'text-teal-500',
  'Ultimate Binger': 'text-purple-400',
};

const BADGE_GLOW: Record<string, string> = {
  'Pilot Watcher': 'shadow-gray-400/50',
  'Casual Viewer': 'shadow-blue-500/50',
  'Marathon Madness': 'shadow-orange-500/50',
  'Season Smasher': 'shadow-red-500/50',
  'Series Finisher': 'shadow-purple-500/50',
  'Stream Scholar': 'shadow-teal-500/50',
  'Ultimate Binger': 'shadow-purple-500/50',
};

export function BadgeDisplay({ badge, size = 'md', showGlow = true }: BadgeDisplayProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-10 w-10',
  };

  const badgeContent = (
    <>
      <div 
        className={cn(
          "rounded-full p-2 backdrop-blur-md bg-background/90 transition-all duration-300 flex items-center justify-center relative",
          sizeClasses[size],
          showGlow && badge !== 'Ultimate Binger' && `shadow-lg ${BADGE_GLOW[badge]}`,
          "hover:scale-110"
        )}
      >
        <Trophy className={cn(iconSizes[size], BADGE_COLORS[badge])} />
        {showGlow && badge !== 'Ultimate Binger' && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full opacity-50 blur-md -z-10 animate-pulse",
              badge === 'Ultimate Binger' ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500' : ''
            )}
            style={{ 
              animationDuration: '2s',
            }}
          />
        )}
      </div>
      {size !== 'sm' && (
        <span className={cn(
          "text-xs font-semibold text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
          badge === 'Ultimate Binger' ? BADGE_COLORS[badge] : 'text-white'
        )}>
          {badge}
        </span>
      )}
    </>
  );

  return (
    <div className="flex flex-col items-center gap-1">
      {badge === 'Ultimate Binger' ? (
        <>
          <div className="rounded-full p-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500">
            <div 
              className={cn(
                "rounded-full p-2 backdrop-blur-md bg-background/90 transition-all duration-300 flex items-center justify-center relative",
                sizeClasses[size],
                "hover:scale-110"
              )}
            >
              <Trophy className={cn(iconSizes[size], BADGE_COLORS[badge])} />
            </div>
          </div>
          {size !== 'sm' && (
            <span className={cn(
              "text-xs font-semibold text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
              BADGE_COLORS[badge]
            )}>
              {badge}
            </span>
          )}
        </>
      ) : (
        badgeContent
      )}
    </div>
  );
}
