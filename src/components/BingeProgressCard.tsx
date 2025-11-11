import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface BingeProgressCardProps {
  points: number;
  badge: string;
  trophiesEarned: number;
  totalTrophies: number;
  userRank?: number | null;
  nextBadge?: {
    name: string;
    pointsNeeded: number;
    progress: number;
  } | null;
}

const BADGE_TIERS = [
  { name: 'Pilot Watcher', threshold: 0 },
  { name: 'Casual Viewer', threshold: 150 },
  { name: 'Marathon Madness', threshold: 500 },
  { name: 'Season Smasher', threshold: 1200 },
  { name: 'Series Finisher', threshold: 2500 },
  { name: 'Stream Scholar', threshold: 5000 },
  { name: 'Ultimate Binger', threshold: 10000 },
];

export function BingeProgressCard({
  points,
  badge,
  trophiesEarned,
  totalTrophies,
  userRank,
  nextBadge
}: BingeProgressCardProps) {
  return (
    <Card className="p-6 bg-card/70 backdrop-blur-md border-border/30 transition-all hover:border-primary/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span>{trophiesEarned} of {totalTrophies} Trophies</span>
          </div>
          <div className="text-3xl font-bold text-foreground">
            {points.toLocaleString()} Points
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Rank: <span className="font-semibold text-primary">{badge}</span>
          </div>
        </div>
        
        {userRank && (
          <div className="text-right">
            <div className="text-4xl font-bold text-primary">
              #{userRank}
            </div>
            <div className="text-xs text-muted-foreground">
              on Binge Board
            </div>
          </div>
        )}
      </div>

      {nextBadge && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Next: <span className="font-semibold text-foreground">{nextBadge.name}</span>
            </span>
            <span className="text-muted-foreground">
              {nextBadge.pointsNeeded} to go
            </span>
          </div>
          <Progress 
            value={nextBadge.progress} 
            className="h-2"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)'
            }}
          />
        </div>
      )}
    </Card>
  );
}
