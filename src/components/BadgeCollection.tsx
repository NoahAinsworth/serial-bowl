import { BadgeDisplay } from "./BadgeDisplay";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";

interface BadgeCollectionProps {
  currentBadge: string;
  bingePoints: number;
}

const BADGE_TIERS = [
  { name: 'Pilot Watcher', threshold: 0 },
  { name: 'Casual Viewer', threshold: 50 },
  { name: 'Marathon Madness', threshold: 150 },
  { name: 'Season Smasher', threshold: 300 },
  { name: 'Series Finisher', threshold: 500 },
  { name: 'Stream Scholar', threshold: 800 },
  { name: 'Ultimate Binger', threshold: 1200 },
];

export function BadgeCollection({ currentBadge, bingePoints }: BadgeCollectionProps) {
  const earnedBadges = BADGE_TIERS.filter(tier => bingePoints >= tier.threshold);

  if (earnedBadges.length === 0) return null;

  return (
    <Card className="p-4 bg-card/70 backdrop-blur-md border-border/30">
      <h3 className="text-sm font-semibold mb-3 text-foreground drop-shadow-sm">
        Trophy Case ({earnedBadges.length}/{BADGE_TIERS.length})
      </h3>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-2">
          {earnedBadges.reverse().map((badge) => (
            <div 
              key={badge.name}
              className="flex-shrink-0 group relative"
            >
              <BadgeDisplay 
                badge={badge.name} 
                size="sm"
                showGlow={badge.name === currentBadge}
              />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-background/98 backdrop-blur-sm px-2 py-1 rounded text-xs border border-border/50 text-foreground shadow-lg">
                {badge.threshold} pts
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
