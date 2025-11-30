import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CalendarHeatmapProps {
  data: { date: string; count: number }[];
}

export function CalendarHeatmap({ data }: CalendarHeatmapProps) {
  const heatmapData = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364); // Last 365 days

    const dateMap = new Map(data.map(d => [d.date, d.count]));
    const days: { date: Date; count: number }[] = [];

    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date,
        count: dateMap.get(dateStr) || 0
      });
    }

    return days;
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted';
    if (count <= 2) return 'bg-primary/30';
    if (count <= 4) return 'bg-primary/50';
    if (count <= 6) return 'bg-primary/70';
    return 'bg-primary';
  };

  const weeks = useMemo(() => {
    const result: typeof heatmapData[] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      result.push(heatmapData.slice(i, i + 7));
    }
    return result;
  }, [heatmapData]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Activity</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-primary/30" />
            <div className="w-3 h-3 rounded-sm bg-primary/50" />
            <div className="w-3 h-3 rounded-sm bg-primary/70" />
            <div className="w-3 h-3 rounded-sm bg-primary" />
          </div>
          <span>More</span>
        </div>
      </div>

      <TooltipProvider>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1">
              {week.map((day, dayIdx) => (
                <Tooltip key={dayIdx}>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-colors cursor-pointer hover:ring-2 hover:ring-primary`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {day.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs font-semibold">
                      {day.count} {day.count === 1 ? 'episode' : 'episodes'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
