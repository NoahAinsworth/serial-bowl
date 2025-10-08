/**
 * TVDB data fetchers for Discover page
 */

import { tvdbFetch } from "./tvdb";
import { normalizeSeries, ShowCard } from "./shows";

async function getSeriesById(id: number): Promise<any> {
  return tvdbFetch(`/series/${id}/extended`);
}

function uniqueById<T extends { id: number }>(arr: T[]) {
  const seen = new Set<number>();
  return arr.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

export async function fetchPopularShows({ pages = 2 } = {}): Promise<ShowCard[]> {
  console.log('[fetchPopularShows] Starting...');
  
  // Use /updates to get recent activity, then hydrate
  const since = Math.floor((Date.now() - 30 * 24 * 3600 * 1000) / 1000);
  const updates = await tvdbFetch(`/updates?since=${since}&type=series&action=update`);
  console.log('[fetchPopularShows] Updates received:', updates);
  
  const seriesIds: number[] = (Array.isArray(updates) ? updates : updates?.series ?? [])
    .slice(0, 100)
    .map((u: any) => u?.recordId ?? u?.seriesId ?? u?.id)
    .filter(Boolean);

  console.log('[fetchPopularShows] Series IDs:', seriesIds.slice(0, 10));

  // Hydrate with concurrency cap
  const limit = 10;
  const out: any[] = [];
  for (let i = 0; i < Math.min(seriesIds.length, 40) && out.length < 40; i += limit) {
    const chunk = seriesIds.slice(i, i + limit);
    const got = await Promise.allSettled(chunk.map((id) => getSeriesById(id)));
    out.push(...got.filter(r => r.status === "fulfilled").map((r: any) => r.value?.data ?? r.value));
  }
  
  console.log('[fetchPopularShows] Hydrated shows:', out.length);
  const scored = out.filter(Boolean).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const result = uniqueById(scored).slice(0, 40).map(normalizeSeries);
  console.log('[fetchPopularShows] Final result:', result.length);
  return result;
}

export async function fetchTrendingShows(): Promise<ShowCard[]> {
  console.log('[fetchTrendingShows] Starting...');
  
  // Trending = recently updated series (7d) ranked by score
  const since = Math.floor((Date.now() - 7 * 24 * 3600 * 1000) / 1000);
  const updates = await tvdbFetch(`/updates?since=${since}&type=series`);
  console.log('[fetchTrendingShows] Updates received:', updates);
  
  const seriesIds: number[] = (Array.isArray(updates) ? updates : updates?.series ?? [])
    .slice(0, 60)
    .map((u: any) => u?.recordId ?? u?.seriesId ?? u?.id)
    .filter(Boolean);

  console.log('[fetchTrendingShows] Series IDs:', seriesIds.slice(0, 10));

  // Hydrate with concurrency cap
  const limit = 10;
  const out: any[] = [];
  for (let i = 0; i < Math.min(seriesIds.length, 40) && out.length < 40; i += limit) {
    const chunk = seriesIds.slice(i, i + limit);
    const got = await Promise.allSettled(chunk.map((id) => getSeriesById(id)));
    out.push(...got.filter(r => r.status === "fulfilled").map((r: any) => r.value?.data ?? r.value));
  }
  
  console.log('[fetchTrendingShows] Hydrated shows:', out.length);
  const scored = out.filter(Boolean).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const result = uniqueById(scored).slice(0, 40).map(normalizeSeries);
  console.log('[fetchTrendingShows] Final result:', result.length);
  return result;
}

export async function fetchNewShows(): Promise<ShowCard[]> {
  console.log('[fetchNewShows] Starting...');
  
  // Use updates over the last ~90 days and filter by firstAired
  const since = Math.floor((Date.now() - 90 * 24 * 3600 * 1000) / 1000);
  const updates = await tvdbFetch(`/updates?since=${since}&type=series&action=update`);
  console.log('[fetchNewShows] Updates received:', updates);
  
  const seriesIds: number[] = (Array.isArray(updates) ? updates : updates?.series ?? [])
    .slice(0, 120)
    .map((u: any) => u?.recordId ?? u?.seriesId ?? u?.id)
    .filter(Boolean);

  console.log('[fetchNewShows] Series IDs:', seriesIds.slice(0, 10));

  const limit = 10;
  const hydrated: any[] = [];
  for (let i = 0; i < Math.min(seriesIds.length, 80) && hydrated.length < 80; i += limit) {
    const chunk = seriesIds.slice(i, i + limit);
    const got = await Promise.allSettled(chunk.map((id) => getSeriesById(id)));
    hydrated.push(...got.filter(r => r.status === "fulfilled").map((r: any) => r.value?.data ?? r.value));
  }
  
  console.log('[fetchNewShows] Hydrated shows:', hydrated.length);
  const recent = hydrated
    .filter(Boolean)
    .map(normalizeSeries)
    .filter(s => s.firstAired)
    .sort((a, b) => (b.firstAired! > a.firstAired! ? 1 : -1));
  
  const result = uniqueById(recent).slice(0, 40);
  console.log('[fetchNewShows] Final result:', result.length);
  return result;
}

