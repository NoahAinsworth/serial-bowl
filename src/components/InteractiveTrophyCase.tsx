import { useState } from 'react';
import { Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface TrophyCaseProps {
  bingeScore: number;
  currentBadge: string;
}

const BADGE_TIERS = [
  { name: 'Pilot Watcher', threshold: 0, description: 'Start your binge journey' },
  { name: 'Casual Viewer', threshold: 150, description: 'Watch your first few shows' },
  { name: 'Marathon Madness', threshold: 500, description: 'Dedicated weekend binger' },
  { name: 'Season Smasher', threshold: 1200, description: 'Conquer multiple seasons' },
  { name: 'Series Finisher', threshold: 2500, description: 'Complete entire series' },
  { name: 'Stream Scholar', threshold: 5000, description: 'Master of streaming' },
  { name: 'Ultimate Binger', threshold: 10000, description: 'Legendary viewer status' },
];

const BADGE_COLORS: Record<string, { icon: string; bg: string; border: string; glow: string }> = {
  'Pilot Watcher': { icon: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-300 dark:border-gray-600', glow: 'shadow-gray-400/30' },
  'Casual Viewer': { icon: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-300 dark:border-blue-700', glow: 'shadow-blue-500/30' },
  'Marathon Madness': { icon: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-300 dark:border-orange-700', glow: 'shadow-orange-500/30' },
  'Season Smasher': { icon: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-300 dark:border-red-700', glow: 'shadow-red-500/30' },
  'Series Finisher': { icon: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950', border: 'border-purple-300 dark:border-purple-700', glow: 'shadow-purple-500/30' },
  'Stream Scholar': { icon: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-950', border: 'border-teal-300 dark:border-teal-700', glow: 'shadow-teal-500/30' },
  'Ultimate Binger': { icon: 'text-purple-400', bg: 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950 dark:to-pink-950', border: 'border-purple-400', glow: 'shadow-purple-500/50' },
};

export function InteractiveTrophyCase({ bingeScore, currentBadge }: TrophyCaseProps) {
  const [selectedBadge, setSelectedBadge] = useState<typeof BADGE_TIERS[0] | null>(null);
  
  const earnedBadges = BADGE_TIERS.filter(tier => bingeScore >= tier.threshold);
  const earnedCount = earnedBadges.length;

  const getNextThreshold = (badge: typeof BADGE_TIERS[0]) => {
    const index = BADGE_TIERS.findIndex(t => t.name === badge.name);
    return index < BADGE_TIERS.length - 1 ? BADGE_TIERS[index + 1].threshold : null;
  };

  const getProgress = (badge: typeof BADGE_TIERS[0]) => {
    const nextThreshold = getNextThreshold(badge);
    if (!nextThreshold) return 100;
    if (bingeScore >= nextThreshold) return 100;
    if (bingeScore < badge.threshold) return 0;
    return ((bingeScore - badge.threshold) / (nextThreshold - badge.threshold)) * 100;
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Trophy Case ({earnedCount}/{BADGE_TIERS.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            {bingeScore.toLocaleString()} BingeScore
          </span>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {BADGE_TIERS.map((badge) => {
            const isEarned = bingeScore >= badge.threshold;
            const isCurrent = badge.name === currentBadge;
            const colors = BADGE_COLORS[badge.name];
            const isUltimate = badge.name === 'Ultimate Binger';
            
            return (
              <button
                key={badge.name}
                onClick={() => setSelectedBadge(badge)}
                className={cn(
                  "flex-shrink-0 w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all",
                  isEarned ? colors.bg : 'bg-muted/50',
                  isEarned ? colors.border : 'border-border/30',
                  isCurrent && isEarned && `shadow-lg ${colors.glow}`,
                  isEarned ? 'hover:scale-105' : 'opacity-50',
                  isUltimate && isEarned && 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50'
                )}
              >
                {isEarned ? (
                  <Trophy className={cn("h-6 w-6", colors.icon)} />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground/50" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="max-w-sm">
          {selectedBadge && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl border-2 flex items-center justify-center",
                    bingeScore >= selectedBadge.threshold 
                      ? BADGE_COLORS[selectedBadge.name].bg 
                      : 'bg-muted/50',
                    bingeScore >= selectedBadge.threshold 
                      ? BADGE_COLORS[selectedBadge.name].border 
                      : 'border-border/30'
                  )}>
                    {bingeScore >= selectedBadge.threshold ? (
                      <Trophy className={cn("h-6 w-6", BADGE_COLORS[selectedBadge.name].icon)} />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div>
                    <span className="block">{selectedBadge.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {selectedBadge.threshold.toLocaleString()} BingeScore required
                    </span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  {selectedBadge.description}
                </p>
                
                {bingeScore >= selectedBadge.threshold ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Trophy className="h-4 w-4" />
                    <span>Trophy earned!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {bingeScore.toLocaleString()} / {selectedBadge.threshold.toLocaleString()}
                      </span>
                    </div>
                    <Progress 
                      value={(bingeScore / selectedBadge.threshold) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {(selectedBadge.threshold - bingeScore).toLocaleString()} more BingeScore needed
                    </p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground border-t pt-3">
                  <p className="font-medium mb-1">How to earn BingeScore:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Mark shows, seasons, or episodes as watched</li>
                    <li>Log episodes through Earn Binge Points</li>
                    <li>Complete seasons and shows for bonuses</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}