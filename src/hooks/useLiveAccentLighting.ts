import { useEffect, useState } from 'react';
import { extractDominantColor, blendWithTheme } from '@/lib/colorExtractor';

interface LiveAccentColors {
  primary: string;
  secondary: string;
  accent: string;
  backgroundTint: string;
  glowColor: string;
}

/**
 * Hook to enable Live Accent Lighting based on show poster
 */
export const useLiveAccentLighting = (posterUrl: string | null | undefined, enabled: boolean = true) => {
  const [isActive, setIsActive] = useState(false);
  const [colors, setColors] = useState<LiveAccentColors | null>(null);

  useEffect(() => {
    if (!enabled || !posterUrl) {
      resetToDefaultTheme();
      setIsActive(false);
      return;
    }

    let isMounted = true;

    const applyLiveAccent = async () => {
      try {
        const dominantColor = await extractDominantColor(posterUrl);
        const blendedColors = blendWithTheme(dominantColor, 0.35);

        if (!isMounted) return;

        setColors(blendedColors);
        applyColorsToDOM(blendedColors);
        setIsActive(true);
      } catch (error) {
        console.warn('Failed to extract dominant color:', error);
        resetToDefaultTheme();
        setIsActive(false);
      }
    };

    applyLiveAccent();

    return () => {
      isMounted = false;
      resetToDefaultTheme();
    };
  }, [posterUrl, enabled]);

  return { isActive, colors };
};

/**
 * Apply dynamic colors to CSS variables with smooth transition
 */
const applyColorsToDOM = (colors: LiveAccentColors) => {
  const root = document.documentElement;
  
  // Add transition class for smooth color changes
  root.classList.add('live-accent-transition');
  
  // Apply new colors
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--background', colors.backgroundTint);
  root.style.setProperty('--ring', colors.primary);
  
  // Update glow colors
  root.style.setProperty('--glow-lime', `hsl(${colors.glowColor} / 0.25)`);
  root.style.setProperty('--shadow-hover', `0 0 25px hsl(${colors.glowColor} / 0.3)`);
  
  // Remove transition class after animation completes
  setTimeout(() => {
    root.classList.remove('live-accent-transition');
  }, 800);
};

/**
 * Reset to default theme colors
 */
const resetToDefaultTheme = () => {
  const root = document.documentElement;
  
  root.classList.add('live-accent-transition');
  
  // Reset to default Serial Bowl Core colors
  root.style.setProperty('--primary', '150 100% 50%');
  root.style.setProperty('--secondary', '14 100% 62%');
  root.style.setProperty('--accent', '351 100% 77%');
  root.style.setProperty('--background', '0 0% 98%');
  root.style.setProperty('--ring', '150 100% 50%');
  root.style.setProperty('--glow-lime', 'rgba(0, 255, 133, 0.25)');
  root.style.setProperty('--shadow-hover', '0 0 25px rgba(0, 255, 133, 0.25)');
  
  setTimeout(() => {
    root.classList.remove('live-accent-transition');
  }, 800);
};
