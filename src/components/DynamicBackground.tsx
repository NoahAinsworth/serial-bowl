import { cn } from "@/lib/utils";

interface DynamicBackgroundProps {
  badge: string;
}

const BACKGROUND_THEMES: Record<string, { gradient: string; overlay?: string }> = {
  'Pilot Watcher': {
    gradient: 'from-gray-800 via-gray-700 to-gray-800',
  },
  'Casual Viewer': {
    gradient: 'from-blue-900 via-blue-800 to-gray-800',
  },
  'Marathon Madness': {
    gradient: 'from-orange-900 via-pink-900 to-gray-800',
  },
  'Season Smasher': {
    gradient: 'from-red-900 via-orange-900 to-gray-800',
  },
  'Series Finisher': {
    gradient: 'from-purple-900 via-purple-800 to-gray-800',
  },
  'Stream Scholar': {
    gradient: 'from-teal-900 via-blue-900 to-gray-800',
  },
  'Ultimate Binger': {
    gradient: 'from-purple-900 via-pink-900 to-blue-900',
    overlay: 'bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 animate-pulse',
  },
};

export function DynamicBackground({ badge }: DynamicBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base yellow background */}
      <div 
        className="absolute inset-0 bg-yellow-400 transition-all duration-1000"
      />
    </div>
  );
}
