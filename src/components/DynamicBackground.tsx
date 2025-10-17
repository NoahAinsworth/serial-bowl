import { cn } from "@/lib/utils";

interface DynamicBackgroundProps {
  badge: string;
}

const BACKGROUND_THEMES: Record<string, { gradient: string; overlay?: string }> = {
  'Pilot Watcher': {
    gradient: 'from-gray-900 via-gray-800 to-gray-900',
  },
  'Casual Viewer': {
    gradient: 'from-blue-950 via-blue-900 to-gray-900',
  },
  'Marathon Madness': {
    gradient: 'from-orange-950 via-pink-950 to-gray-900',
  },
  'Season Smasher': {
    gradient: 'from-red-950 via-orange-950 to-gray-900',
  },
  'Series Finisher': {
    gradient: 'from-purple-950 via-purple-900 to-gray-900',
  },
  'Stream Scholar': {
    gradient: 'from-teal-950 via-blue-950 to-gray-900',
  },
  'Ultimate Binger': {
    gradient: 'from-purple-950 via-pink-950 to-blue-950',
    overlay: 'bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 animate-pulse',
  },
};

export function DynamicBackground({ badge }: DynamicBackgroundProps) {
  const theme = BACKGROUND_THEMES[badge] || BACKGROUND_THEMES['Pilot Watcher'];

  return (
    <>
      {/* Base gradient */}
      <div 
        className={cn(
          "fixed inset-0 -z-20 bg-gradient-to-br transition-all duration-1000",
          theme.gradient
        )}
      />
      
      {/* Film grain overlay */}
      <div 
        className="fixed inset-0 -z-10 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' /%3E%3C/svg%3E")',
        }}
      />

      {/* Chromatic overlay for Ultimate Binger */}
      {theme.overlay && (
        <div className={cn("fixed inset-0 -z-10", theme.overlay)} />
      )}

      {/* Subtle glow lines */}
      <div className="fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -z-10" />
    </>
  );
}
