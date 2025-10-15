interface CerealBowlLogoProps {
  size?: number;
  className?: string;
}

export const CerealBowlLogo = ({ size = 80, className = '' }: CerealBowlLogoProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bowl - using gradient from theme */}
      <path
        d="M 60 80 Q 60 140 100 155 Q 140 140 140 80 Z"
        fill="url(#bowlGradient)"
      />
      
      {/* Cereal pieces (curves inside bowl) */}
      <path
        d="M 75 100 Q 80 105 85 100"
        stroke="hsl(var(--foreground))"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <path
        d="M 75 115 Q 85 122 95 115"
        stroke="hsl(var(--foreground))"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <path
        d="M 80 130 Q 85 133 90 130"
        stroke="hsl(var(--foreground))"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      
      {/* Spoon */}
      <path
        d="M 120 50 L 135 85"
        stroke="hsl(var(--foreground))"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <ellipse
        cx="118"
        cy="45"
        rx="12"
        ry="10"
        fill="hsl(var(--foreground))"
      />
      
      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="bowlGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--cartoon-yellow))" />
          <stop offset="100%" stopColor="hsl(var(--cartoon-orange))" />
        </linearGradient>
      </defs>
    </svg>
  );
};
