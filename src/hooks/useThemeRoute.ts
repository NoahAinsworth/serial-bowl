import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export type ThemeRoute = 'home' | 'discover' | 'messages' | 'ai' | 'show' | 'default';

export function useThemeRoute(theme?: ThemeRoute, accentColor?: string) {
  const location = useLocation();

  useEffect(() => {
    const body = document.body;
    
    // If explicit theme provided, use it
    if (theme) {
      body.setAttribute('data-theme', theme);
      if (theme === 'show' && accentColor) {
        body.setAttribute('data-accent', accentColor);
      } else {
        body.removeAttribute('data-accent');
      }
      return;
    }

    // Auto-detect theme from route
    const path = location.pathname;
    
    if (path === '/' || path === '/home' || path === '/activity') {
      body.setAttribute('data-theme', 'home');
      body.removeAttribute('data-accent');
    } else if (path === '/discover' || path === '/search') {
      body.setAttribute('data-theme', 'discover');
      body.removeAttribute('data-accent');
    } else if (path.startsWith('/messages') || path.startsWith('/dms')) {
      body.setAttribute('data-theme', 'messages');
      body.removeAttribute('data-accent');
    } else if (path === '/binge') {
      body.setAttribute('data-theme', 'ai');
      body.removeAttribute('data-accent');
    } else if (path.startsWith('/show/')) {
      body.setAttribute('data-theme', 'show');
      // Show pages set their own accent color
    } else {
      body.setAttribute('data-theme', 'default');
      body.removeAttribute('data-accent');
    }
  }, [location.pathname, theme, accentColor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.removeAttribute('data-theme');
      document.body.removeAttribute('data-accent');
    };
  }, []);
}

export function setShowAccent(hex: string) {
  document.body.setAttribute('data-theme', 'show');
  document.body.setAttribute('data-accent', hex);
}

export function resetTheme() {
  document.body.removeAttribute('data-theme');
  document.body.removeAttribute('data-accent');
}
