import { useEffect, useState } from 'react';
import { extractDominantColor, blendWithTheme } from '@/lib/colorExtractor';

interface LiveAccentColors {
  accent: string;
  accentGlow: string;
  backgroundTint: string;
  shadow: string;
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
  
  // Apply new colors to Serial Bowl tokens
  root.style.setProperty('--sb-accent', colors.accent);
  root.style.setProperty('--sb-bg-tint', colors.backgroundTint);
  root.style.setProperty('--sb-shadow', colors.shadow);
  root.style.setProperty('--sb-glow', colors.accentGlow);
  
  // Update legacy variables for compatibility
  root.style.setProperty('--primary', colors.accent);
  root.style.setProperty('--secondary', colors.accent);
  root.style.setProperty('--ring', colors.accent);
  root.style.setProperty('--accent', colors.accent);
  
  // Remove transition class after animation completes
  setTimeout(() => {
    root.classList.remove('live-accent-transition');
  }, 850);
};

/**
 * Reset to default theme colors
 */
const resetToDefaultTheme = () => {
  const root = document.documentElement;
  
  root.classList.add('live-accent-transition');
  
  // Reset to default Serial Bowl Core colors
  root.style.setProperty('--sb-accent', '23 100% 58%');
  root.style.setProperty('--sb-bg-tint', '0 0% 98%');
  root.style.setProperty('--sb-shadow', '0 0% 0% / 0.12');
  root.style.setProperty('--sb-glow', '23 100% 58% / 0.22');
  root.style.setProperty('--primary', '23 100% 58%');
  root.style.setProperty('--secondary', '23 100% 58%');
  root.style.setProperty('--ring', '23 100% 58%');
  root.style.setProperty('--accent', '23 100% 58%');
  
  setTimeout(() => {
    root.classList.remove('live-accent-transition');
  }, 850);
};
