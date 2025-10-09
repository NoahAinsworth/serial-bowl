import { useEffect, useState } from 'react';
import { extractDominantColor, blendWithTheme } from '@/lib/colorExtractor';

interface LiveAccentColors {
  accent: string;
  accentDark: string;
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
  
  // Apply new colors to Serial Bowl tokens
  root.style.setProperty('--sb-accent', colors.accent);
  root.style.setProperty('--sb-accent-dark', colors.accentDark);
  root.style.setProperty('--sb-bg-tint', colors.backgroundTint);
  root.style.setProperty('--sb-shadow', colors.shadow);
  
  // Set data-accent attribute for show-specific styling
  document.body.setAttribute('data-theme', 'show');
};

/**
 * Reset to default theme colors
 */
const resetToDefaultTheme = () => {
  const root = document.documentElement;
  
  // Reset to default emerald theme
  root.style.setProperty('--sb-accent', '152 85% 42%');
  root.style.setProperty('--sb-accent-dark', '152 85% 34%');
  root.style.setProperty('--sb-bg-tint', '144 100% 97%');
  root.style.setProperty('--sb-shadow', '0 0% 0% / 0.08');
  
  // Remove show-specific attribute
  document.body.removeAttribute('data-accent');
};
