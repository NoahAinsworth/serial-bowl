/**
 * TVDB data fetchers for Discover page
 */

import { tvdbFetch } from "./tvdb";
import { normalizeSeries, ShowCard } from "./shows";

async function getSeriesById(id: number): Promise<any> {
  const data = await tvdbFetch(`/series/${id}/extended`);
  return data;
}

function uniqueById<T extends { id: number }>(arr: T[]) {
  const seen = new Set<number>();
  return arr.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

export async function fetchPopularShows(): Promise<ShowCard[]> {
  console.log('[fetchPopularShows] Starting...');
  
  // Search for popular terms to get diverse, actual shows
  const searchTerms = ['the', 'new', 'star', 'game', 'house'];
  const allShows: any[] = [];
  
  for (const term of searchTerms) {
    try {
      const results = await tvdbFetch(`/search?query=${term}&type=series&limit=10`);
      const shows = Array.isArray(results) ? results : [];
      allShows.push(...shows);
    } catch (error) {
      console.error(`[fetchPopularShows] Error searching "${term}":`, error);
    }
  }
  
  console.log('[fetchPopularShows] Total search results:', allShows.length);
  
  // Deduplicate and sort by score
  const unique = uniqueById(allShows);
  const sorted = unique.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const result = sorted.slice(0, 40).map(normalizeSeries);
  
  console.log('[fetchPopularShows] Final result:', result.length);
  return result;
}

export async function fetchNewShows(): Promise<ShowCard[]> {
  console.log('[fetchNewShows] Starting...');
  
  // Get recent year shows
  const currentYear = new Date().getFullYear();
  const allShows: any[] = [];
  
  // Search for current and previous year
  for (const year of [currentYear, currentYear - 1]) {
    try {
      const results = await tvdbFetch(`/search?query=${year}&type=series&limit=20`);
      const shows = Array.isArray(results) ? results : [];
      allShows.push(...shows);
    } catch (error) {
      console.error(`[fetchNewShows] Error searching year ${year}:`, error);
    }
  }
  
  console.log('[fetchNewShows] Total search results:', allShows.length);
  
  // Filter to shows with recent first air date
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const recentShows = allShows.filter(show => {
    const firstAired = show.first_air_time || show.firstAired;
    if (!firstAired) return false;
    return new Date(firstAired) >= oneYearAgo;
  });
  
  console.log('[fetchNewShows] Recent shows:', recentShows.length);
  
  // Sort by first aired date (newest first)
  const sorted = recentShows.sort((a, b) => {
    const dateA = new Date(a.first_air_time || a.firstAired || 0);
    const dateB = new Date(b.first_air_time || b.firstAired || 0);
    return dateB.getTime() - dateA.getTime();
  });
  
  const unique = uniqueById(sorted);
  const result = unique.slice(0, 40).map(normalizeSeries);
  
  console.log('[fetchNewShows] Final result:', result.length);
  return result;
}

