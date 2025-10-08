/**
 * TVDB data fetchers for Discover page
 */

import { tvdbFetch } from "./tvdb";
import { normalizeSeries, ShowCard } from "./shows";

async function getSeriesPage(page = 0): Promise<any[]> {
  const data = await tvdbFetch(`/series?page=${page}`);
  return Array.isArray(data) ? data : data?.series ?? [];
}

async function getSeriesById(id: number): Promise<any> {
  return tvdbFetch(`/series/${id}`);
}

function uniqueById<T extends { id: number }>(arr: T[]) {
  const seen = new Set<number>();
  return arr.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

export async function fetchPopularShows({ pages = 2 } = {}): Promise<ShowCard[]> {
  // Grab a couple of pages and sort by score
  const batches = await Promise.all([...Array(pages)].map((_, i) => getSeriesPage(i)));
  const flat = batches.flat().filter(Boolean);
  const sorted = flat.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return uniqueById(sorted).slice(0, 40).map(normalizeSeries);
}

export async function fetchTrendingShows(): Promise<ShowCard[]> {
  // Trending = recently updated series (7d) ranked by score
  const since = Math.floor((Date.now() - 7 * 24 * 3600 * 1000) / 1000);
  const updates = await tvdbFetch(`/updates?since=${since}`);
  const seriesIds: number[] = (Array.isArray(updates) ? updates : updates?.records ?? [])
    .filter((u: any) => (u?.recordType ?? u?.type) === "series")
    .map((u: any) => u?.recordId ?? u?.id)
    .filter(Boolean);

  // Hydrate with concurrency cap
  const limit = 12;
  const out: any[] = [];
  for (let i = 0; i < seriesIds.length && out.length < 60; i += limit) {
    const chunk = seriesIds.slice(i, i + limit);
    const got = await Promise.allSettled(chunk.map((id) => getSeriesById(id)));
    out.push(...got.filter(r => r.status === "fulfilled").map((r: any) => r.value));
  }
  const scored = out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return uniqueById(scored).slice(0, 40).map(normalizeSeries);
}

export async function fetchNewShows(): Promise<ShowCard[]> {
  // Try series/filter by firstAired desc (if it 4xx/5xx, fallback)
  try {
    const filtered = await tvdbFetch(`/series/filter?sort=firstAired&order=desc&page=0`);
    const arr = Array.isArray(filtered) ? filtered : filtered?.series ?? [];
    const normalized = arr.map(normalizeSeries)
      .filter(s => s.firstAired)
      .sort((a, b) => (b.firstAired! > a.firstAired! ? 1 : -1));
    if (normalized.length) return normalized.slice(0, 40);
  } catch (_) {
    // Fall through to fallback
  }

  // Fallback: use updates over the last ~180 days and filter by firstAired desc
  const since = Math.floor((Date.now() - 180 * 24 * 3600 * 1000) / 1000);
  const updates = await tvdbFetch(`/updates?since=${since}`);
  const seriesIds: number[] = (Array.isArray(updates) ? updates : updates?.records ?? [])
    .filter((u: any) => (u?.recordType ?? u?.type) === "series")
    .map((u: any) => u?.recordId ?? u?.id)
    .filter(Boolean);

  const limit = 12;
  const hydrated: any[] = [];
  for (let i = 0; i < seriesIds.length && hydrated.length < 120; i += limit) {
    const chunk = seriesIds.slice(i, i + limit);
    const got = await Promise.allSettled(chunk.map((id) => getSeriesById(id)));
    hydrated.push(...got.filter(r => r.status === "fulfilled").map((r: any) => r.value));
  }
  const recent = hydrated
    .map(normalizeSeries)
    .filter(s => s.firstAired)
    .sort((a, b) => (b.firstAired! > a.firstAired! ? 1 : -1));
  return uniqueById(recent).slice(0, 40);
}
