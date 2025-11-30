import { Flame } from 'lucide-react';

interface WatchStreakProps {
  currentStreak: number;
  longestStreak: number;
}

export function WatchStreak({ currentStreak, longestStreak }: WatchStreakProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Current Streak</span>
        </div>
        <p className="text-4xl font-bold">
          {currentStreak}
          <span className="text-xl text-muted-foreground ml-1">days</span>
        </p>
      </div>

      <div className="p-6 bg-muted rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Longest Streak</span>
        </div>
        <p className="text-4xl font-bold">
          {longestStreak}
          <span className="text-xl text-muted-foreground ml-1">days</span>
        </p>
      </div>
    </div>
  );
}
