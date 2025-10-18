import { cn } from "@/lib/utils";

interface VHSProfileRingProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function VHSProfileRing({ children, size = 'md' }: VHSProfileRingProps) {
  const sizeClasses = {
    sm: 'p-[2px]',
    md: 'p-[3px]',
    lg: 'p-1'
  };
  
  return (
    <div className={cn(
      "rounded-full",
      "bg-gradient-to-br from-[#ff00ff] via-[#00ffff] to-[#ff1493]",
      "shadow-[0_0_20px_rgba(255,0,255,0.6),0_0_40px_rgba(0,255,255,0.3)]",
      "animate-vhs-rgb-drift",
      sizeClasses[size]
    )}>
      <div className="rounded-full overflow-hidden bg-background">
        {children}
      </div>
    </div>
  );
}
