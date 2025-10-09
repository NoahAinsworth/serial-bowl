/**
 * Extract multiple dominant colors from an image
 */
export async function extractColorPalette(imageUrl: string): Promise<{
  primary: string;
  secondary: string;
  accent: string;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve({
            primary: '152 100% 40%',
            secondary: '14 100% 62%',
            accent: '351 100% 77%',
          });
          return;
        }
        
        // Use smaller canvas for performance
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);
        
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        
        // Collect all non-dark, non-light pixels
        const pixels: Array<[number, number, number]> = [];
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          
          // Skip very dark or very light pixels
          if (brightness > 40 && brightness < 215) {
            pixels.push([r, g, b]);
          }
        }
        
        if (pixels.length === 0) {
          resolve({
            primary: '152 100% 40%',
            secondary: '14 100% 62%',
            accent: '351 100% 77%',
          });
          return;
        }
        
        // K-means clustering to find 3 dominant colors
        const clusters = kMeansClustering(pixels, 3);
        
        // Convert to HSL and boost saturation
        const colors = clusters.map(([r, g, b]) => {
          const hsl = rgbToHsl(r, g, b);
          const h = Math.round(hsl.h);
          const s = Math.min(Math.round(hsl.s * 150), 100); // Boost saturation
          const l = Math.min(Math.max(Math.round(hsl.l * 100), 40), 60); // Keep vibrant
          return `${h} ${s}% ${l}%`;
        });
        
        resolve({
          primary: colors[0] || '152 100% 40%',
          secondary: colors[1] || '14 100% 62%',
          accent: colors[2] || '351 100% 77%',
        });
      } catch (error) {
        console.error('Error extracting colors:', error);
        resolve({
          primary: '152 100% 40%',
          secondary: '14 100% 62%',
          accent: '351 100% 77%',
        });
      }
    };
    
    img.onerror = () => {
      resolve({
        primary: '152 100% 40%',
        secondary: '14 100% 62%',
        accent: '351 100% 77%',
      });
    };
    
    img.src = imageUrl;
  });
}

/**
 * Simple k-means clustering for color quantization
 */
function kMeansClustering(
  pixels: Array<[number, number, number]>,
  k: number,
  maxIterations: number = 10
): Array<[number, number, number]> {
  // Initialize centroids randomly
  let centroids: Array<[number, number, number]> = [];
  const step = Math.floor(pixels.length / k);
  for (let i = 0; i < k; i++) {
    centroids.push(pixels[i * step]);
  }
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign pixels to nearest centroid
    const clusters: Array<Array<[number, number, number]>> = Array(k).fill(null).map(() => []);
    
    for (const pixel of pixels) {
      let minDist = Infinity;
      let closestCluster = 0;
      
      for (let i = 0; i < k; i++) {
        const dist = colorDistance(pixel, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestCluster = i;
        }
      }
      
      clusters[closestCluster].push(pixel);
    }
    
    // Update centroids
    const newCentroids: Array<[number, number, number]> = [];
    for (const cluster of clusters) {
      if (cluster.length === 0) {
        newCentroids.push(centroids[newCentroids.length]);
        continue;
      }
      
      const sum = cluster.reduce(
        (acc, pixel) => [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]],
        [0, 0, 0] as [number, number, number]
      );
      
      newCentroids.push([
        Math.round(sum[0] / cluster.length),
        Math.round(sum[1] / cluster.length),
        Math.round(sum[2] / cluster.length),
      ]);
    }
    
    centroids = newCentroids;
  }
  
  return centroids;
}

/**
 * Calculate Euclidean distance between two RGB colors
 */
function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
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
