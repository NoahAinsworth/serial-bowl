interface SpoonIconProps {
  size?: number;
  className?: string;
}

export const SpoonIcon = ({ size = 32, className = '' }: SpoonIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Spoon bowl - flat ellipse */}
      <ellipse
        cx="50"
        cy="30"
        rx="20"
        ry="15"
        fill="hsl(var(--primary))"
        stroke="black"
        strokeWidth="3"
      />
      
      {/* Spoon handle - flat rectangle with rounded end */}
      <rect
        x="45"
        y="42"
        width="10"
        height="50"
        rx="5"
        fill="hsl(var(--primary))"
        stroke="black"
        strokeWidth="3"
      />
    </svg>
  );
};
