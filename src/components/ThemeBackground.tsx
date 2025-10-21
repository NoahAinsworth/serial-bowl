import { useTheme } from '@/contexts/ThemeContext';

export function ThemeBackground() {
  const { theme } = useTheme();

  // Only render for themes that need special backgrounds
  if (theme !== 'light' && theme !== 'donut_mode') {
    return null;
  }

  if (theme === 'light') {
    return (
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 80% at 0% 0%, rgba(189, 147, 224, 0.7) 0%, transparent 50%),
              radial-gradient(ellipse 70% 70% at 100% 0%, rgba(240, 184, 169, 0.6) 0%, transparent 50%),
              radial-gradient(ellipse 90% 90% at 50% 100%, rgba(169, 207, 224, 0.65) 0%, transparent 55%),
              linear-gradient(135deg, rgba(230, 215, 240, 0.4) 0%, rgba(240, 230, 235, 0.4) 50%, rgba(215, 235, 245, 0.4) 100%)
            `
          }}
        />
      </div>
    );
  }

  if (theme === 'donut_mode') {
    return (
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              180deg,
              rgba(135, 206, 250, 0.3) 0%,
              rgba(173, 216, 230, 0.2) 50%,
              rgba(255, 255, 255, 0.1) 100%
            )`
          }}
        />
        {/* Sprinkle vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at top left, rgba(255,111,174,0.06), transparent 40%),
              radial-gradient(ellipse at bottom right, rgba(255,217,15,0.05), transparent 45%)
            `
          }}
        />
      </div>
    );
  }

  return null;
}
