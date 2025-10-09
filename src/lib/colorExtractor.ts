/**
 * Color Extraction & Blending Utility
 * Extracts dominant colors from images and blends them with base theme
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Extract dominant color from an image URL
 */
export const extractDominantColor = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Resize to small canvas for faster processing
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);

        const imageData = ctx.getImageData(0, 0, 100, 100);
        const dominant = getDominantColor(imageData.data);
        
        resolve(rgbToHex(dominant));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
};

/**
 * Get dominant color from image data using color quantization
 */
const getDominantColor = (data: Uint8ClampedArray): RGB => {
  const colorMap: Map<string, number> = new Map();
  
  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Skip transparent and very dark/bright pixels
    if (a < 125 || (r + g + b) < 50 || (r + g + b) > 720) continue;
    
    // Reduce color space for better clustering
    const rBucket = Math.round(r / 32) * 32;
    const gBucket = Math.round(g / 32) * 32;
    const bBucket = Math.round(b / 32) * 32;
    
    const key = `${rBucket},${gBucket},${bBucket}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }
  
  // Find most frequent color
  let maxCount = 0;
  let dominantColor = { r: 0, g: 255, b: 133 }; // Fallback to neon green
  
  colorMap.forEach((count, key) => {
    if (count > maxCount) {
      maxCount = count;
      const [r, g, b] = key.split(',').map(Number);
      dominantColor = { r, g, b };
    }
  });
  
  return dominantColor;
};

/**
 * Convert RGB to HSL
 */
export const rgbToHsl = (rgb: RGB): HSL => {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

/**
 * Convert RGB to HEX
 */
const rgbToHex = (rgb: RGB): string => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

/**
 * Convert HEX to RGB
 */
export const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 255, b: 133 };
};

/**
 * Blend show color with base theme
 */
export const blendWithTheme = (showColorHex: string, blendStrength: number = 0.3): {
  primary: string;
  secondary: string;
  accent: string;
  backgroundTint: string;
  glowColor: string;
} => {
  const showRgb = hexToRgb(showColorHex);
  const showHsl = rgbToHsl(showRgb);
  
  // Ensure saturation is vibrant
  const vibrantSaturation = Math.max(showHsl.s, 60);
  
  // Primary: Show color at full vibrancy
  const primary = `${showHsl.h} ${vibrantSaturation}% 50%`;
  
  // Secondary: Complementary harmony
  const secondaryHue = (showHsl.h + 40) % 360;
  const secondary = `${secondaryHue} ${Math.min(vibrantSaturation, 80)}% 58%`;
  
  // Accent: Analogous harmony
  const accentHue = (showHsl.h + 120) % 360;
  const accent = `${accentHue} ${vibrantSaturation}% 65%`;
  
  // Background tint: Very subtle show color
  const backgroundTint = `${showHsl.h} ${Math.min(vibrantSaturation * 0.15, 10)}% 98%`;
  
  // Glow color: Brighter version
  const glowColor = `${showHsl.h} ${vibrantSaturation}% 60%`;
  
  return {
    primary,
    secondary,
    accent,
    backgroundTint,
    glowColor
  };
};
