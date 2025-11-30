import { useMemo } from 'react';

interface GenreBreakdownProps {
  data: { genre: string; count: number }[];
}

export function GenreBreakdown({ data }: GenreBreakdownProps) {
  const total = useMemo(() => 
    data.reduce((sum, item) => sum + item.count, 0), 
    [data]
  );

  const sortedData = useMemo(() => 
    [...data].sort((a, b) => b.count - a.count).slice(0, 8),
    [data]
  );

  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Genre Distribution</h3>
      
      <div className="space-y-3">
        {sortedData.map((item, index) => {
          const percentage = ((item.count / total) * 100).toFixed(1);
          
          return (
            <div key={item.genre} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: colors[index] }}
                  />
                  <span className="font-medium">{item.genre}</span>
                </div>
                <span className="text-muted-foreground">
                  {item.count} ({percentage}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: colors[index]
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
