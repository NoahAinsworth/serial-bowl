/**
 * Cache helper for TVDB data with 24-hour refresh
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getCached<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  try {
    const cached = localStorage.getItem(key);
    const stamp = localStorage.getItem(`${key}_stamp`);
    const fresh = !stamp || Date.now() - Number(stamp) > DAY_MS;

    // Return cached data if it's still fresh
    if (cached && !fresh) {
      console.log(`[Cache] Using cached data for: ${key}`);
      return JSON.parse(cached);
    }

    console.log(`[Cache] Fetching fresh data for: ${key}`);
    
    // Fetch new data
    const data = await fetchFn();
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`${key}_stamp`, String(Date.now()));
    return data;
  } catch (error) {
    // If fetch fails, try to return stale cache
    const cached = localStorage.getItem(key);
    if (cached) {
      console.warn(`[Cache] Using stale cache for ${key} due to error:`, error);
      return JSON.parse(cached);
    }
    throw error;
  }
}

export function clearCache(key?: string) {
  if (key) {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_stamp`);
  } else {
    // Clear all TVDB caches
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.includes('tvdb_')) {
        localStorage.removeItem(k);
      }
    });
  }
}
