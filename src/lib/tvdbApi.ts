/**
 * TheTVDB API v4 Integration
 */

import { env } from './env';

const BASE = 'https://api4.thetvdb.com/v4';

let tvdbToken = '';
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: env.TVDB_API_KEY }),
  });
  
  if (!res.ok) {
    throw new Error('TVDB authentication failed');
  }
  
  const data = await res.json();
  return data.data.token;
}

async function ensureToken(): Promise<string> {
  const now = Date.now();
  
  // Refresh token if expired or doesn't exist
  if (!tvdbToken || tokenExpiry < now) {
    tvdbToken = await getToken();
    tokenExpiry = now + 23 * 60 * 60 * 1000; // 23 hours
  }
  
  return tvdbToken;
}

async function fetchTVDB(endpoint: string): Promise<any[]> {
  const token = await ensureToken();
  const url = `${BASE}${endpoint}`;
  
  console.log('[fetchTVDB] Fetching:', url);
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  console.log('[fetchTVDB] Response status:', res.status);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('[fetchTVDB] Error response:', errorText);
    throw new Error(`TVDB API error: ${res.status} - ${errorText}`);
  }
  
  const data = await res.json();
  console.log('[fetchTVDB] Response data:', data);
  
  return data.data ?? [];
}

function normalizeShow(show: any) {
  return {
    id: show.id,
    title: show.name,
    posterUrl: show.image || show.artwork_32_url || show.artwork_64_url || null,
    year: show.firstAired?.split('-')[0] ?? null,
    popularity: show.score ?? show.popularity ?? null,
  };
}

export async function fetchBrowseShows(page = 1): Promise<any[]> {
  try {
    const [trending, popular] = await Promise.all([
      fetchTVDB(`/series/trending?page=${page}`),
      fetchTVDB(`/series/popular?page=${page}`),
    ]);
    
    // Combine and deduplicate
    const combined = [...trending, ...popular]
      .reduce((acc: any[], item: any) => {
        if (!acc.find((s) => s.id === item.id)) acc.push(item);
        return acc;
      }, [])
      .slice(0, 40);
    
    return combined.map(normalizeShow);
  } catch (error) {
    console.error('[fetchBrowseShows] Error:', error);
    throw error;
  }
}

export async function fetchNewShows(page = 1): Promise<any[]> {
  try {
    const recent = await fetchTVDB(`/series/filter?sort=firstAired&page=${page}`);
    return recent.map(normalizeShow);
  } catch (error) {
    console.error('[fetchNewShows] Error:', error);
    throw error;
  }
}

export async function searchShows(query: string): Promise<any[]> {
  try {
    const results = await fetchTVDB(`/search?query=${encodeURIComponent(query)}&type=series`);
    return results.map(normalizeShow);
  } catch (error) {
    console.error('[searchShows] Error:', error);
    throw error;
  }
}
