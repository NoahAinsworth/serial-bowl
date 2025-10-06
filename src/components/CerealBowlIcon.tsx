import { HTMLAttributes } from 'react';

interface CerealBowlIconProps extends HTMLAttributes<SVGElement> {
  size?: number;
}

export const CerealBowlIcon = ({ size = 24, className = '', ...props }: CerealBowlIconProps) => {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        {/* Bowl */}
        <path d="M4 12c0 4.5 3.5 8 8 8s8-3.5 8-8" />
        {/* Bowl rim */}
        <path d="M4 12h16" />
        {/* Cereal pieces */}
        <circle cx="8" cy="9" r="1.5" fill="currentColor" />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" />
        <circle cx="16" cy="9" r="1.5" fill="currentColor" />
        <circle cx="10" cy="10.5" r="1.2" fill="currentColor" />
        <circle cx="14" cy="10.5" r="1.2" fill="currentColor" />
        {/* Spoon - positioned on the right side */}
        <ellipse cx="19" cy="8" rx="1.2" ry="1.8" />
        <path d="M19 9.5 L19 18" strokeWidth="1.5" />
      </svg>
      {/* Retro color stripes */}
      <div className="flex gap-0.5">
        <div className="w-1 h-1 rounded-sm bg-[hsl(var(--cherry))]" />
        <div className="w-1 h-1 rounded-sm bg-[hsl(var(--accent-yellow))]" />
        <div className="w-1 h-1 rounded-sm bg-[hsl(var(--cyan-glow))]" />
        <div className="w-1 h-1 rounded-sm bg-[hsl(var(--neon-violet))]" />
      </div>
    </div>
  );
};
