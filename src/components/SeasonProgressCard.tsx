import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SeasonProgressCardProps {
  watchedCount: number;
  totalCount: number;
  seasonName: string;
  onMarkWatched?: () => void;
  isLoading?: boolean;
}

const calculateSeasonBonus = (episodeCount: number) => {
  if (episodeCount >= 14) return 15;
  if (episodeCount >= 7) return 10;
  if (episodeCount >= 1) return 5;
  return 0;
};

export function SeasonProgressCard({
  watchedCount,
  totalCount,
  seasonName,
  onMarkWatched,
  isLoading = false,
}: SeasonProgressCardProps) {
  const isComplete = watchedCount === totalCount && totalCount > 0;
  const progress = totalCount > 0 ? (watchedCount / totalCount) * 100 : 0;
  const bonus = calculateSeasonBonus(totalCount);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold">{seasonName}</h4>
          <div className="text-sm text-muted-foreground mt-1">
            {watchedCount}/{totalCount} episodes
          </div>
        </div>
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </div>

      <Progress value={progress} className="h-2" />

      <div className="flex items-center justify-between text-xs">
        {isComplete ? (
          <span className="text-green-500 font-medium">✓ Season complete!</span>
        ) : (
          <span className="text-muted-foreground">
            +{bonus} Binge Points when complete
          </span>
        )}
        {onMarkWatched && !isComplete && (
          <button
            onClick={onMarkWatched}
            disabled={isLoading}
            className="text-primary hover:underline disabled:opacity-50"
          >
            {isLoading ? 'Marking...' : 'Mark watched'}
          </button>
        )}
      </div>
    </Card>
  );
}
