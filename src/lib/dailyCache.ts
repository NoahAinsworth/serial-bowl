/**
 * Daily cache for data that refreshes once per day
 */

const DAY = 24 * 60 * 60 * 1000;

export async function getDaily<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const last = Number(localStorage.getItem(`${key}:ts`) || 0);
  const cached = localStorage.getItem(`${key}:data`);
  
  if (cached && Date.now() - last < DAY) {
    console.log(`[Cache] Using cached data for: ${key}`);
    return JSON.parse(cached);
  }
  
  console.log(`[Cache] Fetching fresh data for: ${key}`);
  const fresh = await fetcher();
  localStorage.setItem(`${key}:data`, JSON.stringify(fresh));
  localStorage.setItem(`${key}:ts`, String(Date.now()));
  return fresh;
}
