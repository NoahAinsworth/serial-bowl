import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Tv, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EarnPointsCardProps {
  bingePoints: number;
  showScore: number;
  dailyPointsEarned: number;
  dailyCap?: number;
}

export function EarnPointsCard({ 
  bingePoints, 
  showScore, 
  dailyPointsEarned,
  dailyCap = 200 
}: EarnPointsCardProps) {
  const navigate = useNavigate();
  const dailyRemaining = Math.max(0, dailyCap - dailyPointsEarned);
  const dailyCapReached = dailyPointsEarned >= dailyCap;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30">
      <div className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Binge Points */}
          <div className="text-center p-3 rounded-xl bg-background/50 border border-border/30">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Binge Points</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {bingePoints.toLocaleString()}
            </div>
          </div>
          
          {/* Show Score */}
          <div className="text-center p-3 rounded-xl bg-background/50 border border-border/30">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Tv className="h-5 w-5 text-amber-500" />
              <span className="text-xs text-muted-foreground font-medium">Show Score</span>
            </div>
            <div className="text-2xl font-bold text-amber-500">
              {showScore.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">episodes watched</div>
          </div>
        </div>

        {/* Daily Progress */}
        <div className="p-3 rounded-xl bg-background/50 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Daily Points</span>
            <span className="text-sm text-muted-foreground">
              {dailyPointsEarned}/{dailyCap}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, (dailyPointsEarned / dailyCap) * 100)}%` }}
            />
          </div>
          {dailyCapReached && (
            <p className="text-xs text-amber-500 mt-2">
              Daily limit reached! Come back tomorrow to earn more.
            </p>
          )}
        </div>

        {/* Earn Points Button */}
        <Button
          onClick={() => navigate('/earn-points')}
          className="w-full h-14 text-lg font-bold rounded-full border-2 border-primary bg-primary hover:bg-primary/90"
          disabled={dailyCapReached}
        >
          <Trophy className="h-6 w-6 mr-2" />
          Earn Binge Points
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Log episodes you've recently watched to earn points!
        </p>
      </div>
    </Card>
  );
}
