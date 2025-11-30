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
              radial-gradient(ellipse 60% 60% at 10% 20%, rgba(214, 175, 242, 0.4) 0%, transparent 50%),
              radial-gradient(ellipse 70% 70% at 90% 10%, rgba(255, 209, 232, 0.35) 0%, transparent 50%),
              radial-gradient(ellipse 80% 80% at 50% 80%, rgba(207, 233, 255, 0.4) 0%, transparent 60%),
              linear-gradient(135deg, rgba(233, 215, 255, 0.25) 0%, rgba(255, 235, 245, 0.25) 50%, rgba(207, 233, 255, 0.25) 100%)
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
