/**
 * Catalog API - merges Trakt rails with TVDB show data
 */

import * as trakt from './trakt';
import * as tvdb from './tvdb';
import { supabase } from '@/integrations/supabase/client';

export interface CatalogShow {
  tvdbId: number;
  title: string;
  posterUrl?: string;
  traktIds: {
    trakt?: number;
    slug?: string;
    imdb?: string;
  };
}

export interface DiscoverRails {
  trending: CatalogShow[];
  popular: CatalogShow[];
  anticipated: CatalogShow[];
}

/**
 * Cache show data in local DB
 */
async function cacheShow(show: tvdb.TVDBShow) {
  await supabase
    .from('shows')
    .upsert({
      id: show.tvdbId,
      title: show.title,
      poster_url: show.posterUrl,
      year: show.year,
      metadata: { overview: show.overview }
    }, {
      onConflict: 'id'
    });
}

/**
 * Resolve Trakt shows to TVDB data
 */
async function resolveTraktShows(traktShows: trakt.TraktShow[]): Promise<CatalogShow[]> {
  const results: CatalogShow[] = [];
  
  // First check cache
  const tvdbIds = traktShows.map(s => s.tvdbId);
  const { data: cached } = await supabase
    .from('shows')
    .select('id, title, poster_url')
    .in('id', tvdbIds);
  
  const cachedMap = new Map(cached?.map(s => [s.id, s]) || []);
  
  for (const traktShow of traktShows) {
    const cachedShow = cachedMap.get(traktShow.tvdbId);
    
    if (cachedShow) {
      // Use cached data
      results.push({
        tvdbId: cachedShow.id,
        title: cachedShow.title,
        posterUrl: cachedShow.poster_url || undefined,
        traktIds: traktShow.traktIds
      });
    } else {
      // Fetch from TVDB and cache
      const tvdbShow = await tvdb.getShow(traktShow.tvdbId);
      if (tvdbShow) {
        await cacheShow(tvdbShow);
        results.push({
          tvdbId: tvdbShow.tvdbId,
          title: tvdbShow.title,
          posterUrl: tvdbShow.posterUrl,
          traktIds: traktShow.traktIds
        });
      }
    }
  }
  
  return results;
}

/**
 * Get all discover rails (Trakt → TVDB)
 */
export async function getDiscoverRails(): Promise<DiscoverRails> {
  const [trending, popular, anticipated] = await Promise.all([
    trakt.getTrendingShows(1, 20),
    trakt.getPopularShows(1, 20),
    trakt.getAnticipatedShows(1, 20)
  ]);
  
  const [trendingResolved, popularResolved, anticipatedResolved] = await Promise.all([
    resolveTraktShows(trending),
    resolveTraktShows(popular),
    resolveTraktShows(anticipated)
  ]);
  
  return {
    trending: trendingResolved,
    popular: popularResolved,
    anticipated: anticipatedResolved
  };
}

/**
 * Get show cast with images (Trakt)
 */
export async function getShowCast(traktIds: { trakt?: number; slug?: string }): Promise<trakt.ShowPeople> {
  const idOrSlug = traktIds.slug || traktIds.trakt?.toString() || '';
  if (!idOrSlug) return { cast: [], crew: [] };
  
  return trakt.getShowPeopleWithImages(idOrSlug);
}
