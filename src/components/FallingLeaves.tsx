import React, { useMemo } from "react";

const LEAF_SVG = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'>
  <path d='M32 2c10 7 22 11 22 24 0 13-12 20-22 24-10-4-22-11-22-24C10 13 22 9 32 2z' fill='#E58E26'/>
  <path d='M32 8c6 5 13 7 13 16s-7 13-13 16c-6-3-13-7-13-16S26 13 32 8z' fill='#B96A1E'/>
  <path d='M31 14l2 36' stroke='#5A3825' stroke-width='2' stroke-linecap='round'/>
  <path d='M28 26c2 3 4 5 7 6M26 20c1 2 3 3 5 4' stroke='#5A3825' stroke-width='2' stroke-linecap='round'/>
</svg>`);

type Leaf = { left: number; delay: number; duration: number; size: number; drift: number; rotate: number };

const genLeaf = (): Leaf => ({
  left: Math.random() * 100,
  delay: Math.random() * 4,
  duration: 8 + Math.random() * 8,
  size: 18 + Math.random() * 20,
  drift: (Math.random() * 40) - 20,
  rotate: (Math.random() * 120 - 60)
});

export default function FallingLeaves({ count = 12 }: { count?: number }) {
  const leaves = useMemo(() => Array.from({ length: count }, genLeaf), [count]);
  return (
    <div aria-hidden className="sb-leaves">
      {leaves.map((leaf, i) => (
        <span
          key={i}
          className="sb-leaf"
          style={
            {
              ["--left" as any]: `${leaf.left}vw`,
              ["--delay" as any]: `${leaf.delay}s`,
              ["--duration" as any]: `${leaf.duration}s`,
              ["--size" as any]: `${leaf.size}px`,
              ["--drift" as any]: `${leaf.drift}px`,
              ["--rotate" as any]: `${leaf.rotate}deg`,
              ["--img" as any]: `url("data:image/svg+xml;utf8,${LEAF_SVG}")`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
