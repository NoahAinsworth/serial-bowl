import { useState, useEffect } from "react";
import { Database, Film, Sparkles, Loader2 } from "lucide-react";

const loadingPhases = [
  { text: "Searching TV database...", icon: Database },
  { text: "Fetching show details...", icon: Film },
  { text: "Thinking...", icon: Sparkles },
];

export function BingeBotLoadingIndicator() {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % loadingPhases.length);
    }, 1500); // Cycle every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  const currentPhase = loadingPhases[phaseIndex];
  const Icon = currentPhase.icon;

  return (
    <div className="flex items-center gap-2 text-muted-foreground animate-fade-in">
      <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
        <Icon className="h-3.5 w-3.5 animate-pulse" />
        <span className="text-xs font-medium">{currentPhase.text}</span>
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    </div>
  );
}
