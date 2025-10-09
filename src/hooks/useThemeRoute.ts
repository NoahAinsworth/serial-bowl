import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Maps routes to theme identifiers for dynamic styling
 */
export const useThemeRoute = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    
    // Determine theme based on route
    if (path === '/' || path === '/home') {
      setTheme('home');
    } else if (path.startsWith('/discover')) {
      setTheme('discover');
    } else if (path.startsWith('/messages') || path.startsWith('/dm')) {
      setTheme('messages');
    } else if (path.startsWith('/binge')) {
      setTheme('ai');
    } else if (path.startsWith('/show/')) {
      // Show pages use dynamic accent from poster - handled by useLiveAccentLighting
      setTheme('show');
    } else {
      setTheme('home');
    }
  }, [location.pathname]);
};

/**
 * Set theme on document body
 */
export const setTheme = (theme: string) => {
  document.body.setAttribute('data-theme', theme);
  if (theme !== 'show') {
    document.body.removeAttribute('data-accent');
  }
};

/**
 * Set show-specific accent color from poster
 */
export const setShowAccent = (hex: string) => {
  document.body.setAttribute('data-theme', 'show');
  document.body.setAttribute('data-accent', hex);
};

/**
 * Reset to default theme
 */
export const resetTheme = () => {
  setTheme('home');
};
