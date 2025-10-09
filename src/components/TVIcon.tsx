interface TVIconProps {
  size?: number;
  className?: string;
}

export const TVIcon = ({ size = 32, className = '' }: TVIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* TV Body */}
      <rect
        x="15"
        y="25"
        width="70"
        height="50"
        rx="8"
        fill="hsl(var(--primary))"
        stroke="black"
        strokeWidth="3"
      />
      
      {/* TV Screen */}
      <rect
        x="22"
        y="32"
        width="56"
        height="36"
        rx="4"
        fill="hsl(var(--accent))"
        stroke="black"
        strokeWidth="3"
      />
      
      {/* Antenna left */}
      <line
        x1="35"
        y1="25"
        x2="25"
        y2="10"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Antenna right */}
      <line
        x1="65"
        y1="25"
        x2="75"
        y2="10"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Stand base */}
      <rect
        x="40"
        y="75"
        width="20"
        height="8"
        rx="4"
        fill="hsl(var(--primary))"
        stroke="black"
        strokeWidth="3"
      />
    </svg>
  );
};
