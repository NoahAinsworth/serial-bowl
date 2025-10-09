/**
 * Extract dominant color from an image
 */
export async function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve('152 100% 40%'); // Default emerald
          return;
        }
        
        // Use smaller canvas for performance
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        
        const imageData = ctx.getImageData(0, 0, 50, 50);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0, count = 0;
        
        // Calculate average color, skipping very dark and very light pixels
        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          const brightness = (red + green + blue) / 3;
          
          // Skip very dark or very light pixels
          if (brightness > 30 && brightness < 225) {
            r += red;
            g += green;
            b += blue;
            count++;
          }
        }
        
        if (count === 0) {
          resolve('152 100% 40%'); // Default emerald
          return;
        }
        
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        // Convert RGB to HSL
        const hsl = rgbToHsl(r, g, b);
        
        // Boost saturation and adjust lightness for better visibility
        const h = Math.round(hsl.h);
        const s = Math.min(Math.round(hsl.s * 100), 100);
        const l = Math.min(Math.max(Math.round(hsl.l * 100), 35), 55); // Keep in mid range
        
        resolve(`${h} ${s}% ${l}%`);
      } catch (error) {
        console.error('Error extracting color:', error);
        resolve('152 100% 40%'); // Default emerald
      }
    };
    
    img.onerror = () => {
      resolve('152 100% 40%'); // Default emerald
    };
    
    img.src = imageUrl;
  });
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: h * 360,
    s: s,
    l: l,
  };
}
