import { cn } from "@/lib/utils";

interface VHSProfileRingProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  rankColor?: string;
}

export function VHSProfileRing({ children, size = 'md', rankColor }: VHSProfileRingProps) {
  const sizeClasses = {
    sm: 'p-[2px]',
    md: 'p-[3px]',
    lg: 'p-1'
  };
  
  const gradientStyle = rankColor 
    ? { background: `linear-gradient(135deg, ${rankColor} 0%, ${rankColor}CC 100%)` }
    : {};
  
  return (
    <div 
      className={cn(
        "rounded-full",
        !rankColor && "bg-gradient-to-br from-[#ff00ff] via-[#00ffff] to-[#ff1493]",
        sizeClasses[size]
      )}
      style={{
        ...gradientStyle,
        boxShadow: rankColor 
          ? `0 0 20px ${rankColor}99, 0 0 40px ${rankColor}66`
          : '0 0 20px rgba(255,0,255,0.6), 0 0 40px rgba(0,255,255,0.3)'
      }}
    >
      <div className="rounded-full overflow-hidden bg-background">
        {children}
      </div>
    </div>
  );
}
