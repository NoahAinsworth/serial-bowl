import React, { useMemo } from "react";

const CLOUD_SVG = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 64' fill='none'>
  <path d='M20 44c-9 0-16-7-16-16 0-7 5-13 12-15 2-7 9-12 17-12 7 0 13 4 16 10 2-1 5-2 8-2 9 0 16 7 16 16 0 0 0 1 0 1h3c7 0 12 5 12 12s-5 12-12 12H20z' fill='white'/>
</svg>`);

type Cloud = { top: number; delay: number; duration: number; scale: number; opacity: number };

const mk = (): Cloud => ({
  top: Math.random() * 70,        // vh
  delay: Math.random() * 6,       // s
  duration: 25 + Math.random() * 25, // s
  scale: 0.6 + Math.random() * 0.9,
  opacity: 0.45 + Math.random() * 0.3
});

export default function SkyClouds({ count = 8 }: { count?: number }) {
  const clouds = useMemo(() => Array.from({ length: count }, mk), [count]);
  return (
    <div aria-hidden className="sb-clouds">
      {clouds.map((c, i) => (
        <span
          key={i}
          className="sb-cloud"
          style={
            {
              ["--top" as any]: `${c.top}vh`,
              ["--delay" as any]: `${c.delay}s`,
              ["--duration" as any]: `${c.duration}s`,
              ["--scale" as any]: c.scale,
              ["--opacity" as any]: c.opacity,
              ["--img" as any]: `url("data:image/svg+xml;utf8,${CLOUD_SVG}")`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
