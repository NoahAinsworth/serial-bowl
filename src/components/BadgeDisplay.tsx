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
  'Ultimate Binger': 'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500',
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

  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        className={cn(
          "rounded-full p-2 backdrop-blur-sm bg-background/80 border-2 transition-all duration-300",
          sizeClasses[size],
          showGlow && `shadow-lg ${BADGE_GLOW[badge]}`,
          "hover:scale-110"
        )}
        style={{
          borderColor: badge === 'Ultimate Binger' 
            ? 'transparent'
            : undefined,
          borderImage: badge === 'Ultimate Binger'
            ? 'linear-gradient(135deg, rgb(168, 85, 247), rgb(236, 72, 153), rgb(59, 130, 246)) 1'
            : undefined,
        }}
      >
        <Trophy className={cn(iconSizes[size], BADGE_COLORS[badge])} />
        {showGlow && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full opacity-50 blur-md -z-10 animate-pulse",
              BADGE_COLORS[badge]
            )}
            style={{ animationDuration: '2s' }}
          />
        )}
      </div>
      {size !== 'sm' && (
        <span className={cn("text-xs font-semibold text-center", BADGE_COLORS[badge])}>
          {badge}
        </span>
      )}
    </div>
  );
}
