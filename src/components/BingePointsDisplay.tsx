import { Trophy, Star, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BingePointsDisplayProps {
  points: number;
  badge: string;
  episodePoints?: number;
  seasonBonuses?: number;
  showBonuses?: number;
  completedSeasons?: number;
  completedShows?: number;
  showBreakdown?: boolean;
}

const getBadgeColor = (badge: string) => {
  switch (badge) {
    case 'Ultimate Binger':
      return 'text-purple-500';
    case 'Stream Scholar':
      return 'text-blue-500';
    case 'Series Finisher':
      return 'text-green-500';
    case 'Season Smasher':
      return 'text-yellow-500';
    case 'Marathon Madness':
      return 'text-orange-500';
    case 'Casual Viewer':
      return 'text-teal-500';
    default:
      return 'text-muted-foreground';
  }
};

const getBadgeThresholds = () => [
  { name: 'Pilot Watcher', min: 0, max: 149 },
  { name: 'Casual Viewer', min: 150, max: 499 },
  { name: 'Marathon Madness', min: 500, max: 1199 },
  { name: 'Season Smasher', min: 1200, max: 2499 },
  { name: 'Series Finisher', min: 2500, max: 4999 },
  { name: 'Stream Scholar', min: 5000, max: 9999 },
  { name: 'Ultimate Binger', min: 10000, max: Infinity },
];

const getNextBadge = (currentPoints: number) => {
  const thresholds = getBadgeThresholds();
  const currentTier = thresholds.find(t => currentPoints >= t.min && currentPoints <= t.max);
  const currentIndex = thresholds.findIndex(t => t.name === currentTier?.name);
  
  if (currentIndex === thresholds.length - 1) return null;
  
  const nextTier = thresholds[currentIndex + 1];
  const progress = ((currentPoints - currentTier!.min) / (nextTier.min - currentTier!.min)) * 100;
  
  return {
    name: nextTier.name,
    pointsNeeded: nextTier.min - currentPoints,
    progress: Math.min(progress, 100),
  };
};

export function BingePointsDisplay({
  points,
  badge,
  episodePoints,
  seasonBonuses,
  showBonuses,
  completedSeasons,
  completedShows,
  showBreakdown = false,
}: BingePointsDisplayProps) {
  const nextBadge = getNextBadge(points);
  const badgeColor = getBadgeColor(badge);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Trophy className={`h-6 w-6 ${badgeColor}`} />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{points}</span>
            <span className="text-sm text-muted-foreground">Binge Points</span>
          </div>
          <div className={`text-sm font-semibold ${badgeColor}`}>
            {badge}
          </div>
        </div>
      </div>

      {nextBadge && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Next: {nextBadge.name}
            </span>
            <span>{nextBadge.pointsNeeded} points to go</span>
          </div>
          <Progress value={nextBadge.progress} className="h-2" />
        </div>
      )}

      {showBreakdown && (
        <Card className="p-4">
          <div className="space-y-2 text-sm">
            <div className="font-semibold flex items-center gap-2 mb-3">
              <Star className="h-4 w-4" />
              Points Breakdown
            </div>
            {episodePoints !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Episodes watched</span>
                <span className="font-medium">+{episodePoints}</span>
              </div>
            )}
            {seasonBonuses !== undefined && completedSeasons !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Seasons completed ({completedSeasons})
                </span>
                <span className="font-medium">+{seasonBonuses}</span>
              </div>
            )}
            {showBonuses !== undefined && completedShows !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Shows completed ({completedShows})
                </span>
                <span className="font-medium">+{showBonuses}</span>
              </div>
            )}
            <div className="pt-2 mt-2 border-t flex justify-between font-bold">
              <span>Total</span>
              <span>{points}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
