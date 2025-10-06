interface CerealBowlIconProps {
  size?: number;
  className?: string;
}

export const CerealBowlIcon = ({ size = 32, className = '' }: CerealBowlIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gradient Bowl Layers */}
      <path
        d="M25 45 Q25 70 50 78 Q75 70 75 45 Z"
        fill="url(#gradient1)"
        opacity="0.9"
      />
      <path
        d="M28 47 Q28 68 50 75 Q72 68 72 47 Z"
        fill="url(#gradient2)"
        opacity="0.85"
      />
      <path
        d="M31 49 Q31 66 50 72 Q69 66 69 49 Z"
        fill="url(#gradient3)"
        opacity="0.8"
      />
      
      {/* Spoon */}
      <path
        d="M48 25 L48 45"
        stroke="url(#gradient4)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse
        cx="48"
        cy="22"
        rx="5"
        ry="4"
        fill="url(#gradient4)"
      />
      
      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff6b35" />
          <stop offset="50%" stopColor="#f7931e" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f7931e" />
          <stop offset="100%" stopColor="#00d4aa" />
        </linearGradient>
        <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00d4aa" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="gradient4" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
};
