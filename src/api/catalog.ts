import * as trakt from './trakt';
import { tvdbFetch } from '@/lib/tvdb';

export interface CatalogShow {
  tvdbId: number;
  title: string;
  posterUrl: string | null;
  traktIds: {
    trakt?: number;
    slug?: string;
    tvdb?: number;
  };
}

async function enrichWithTVDB(traktShows: any[]): Promise<CatalogShow[]> {
  const enriched: CatalogShow[] = [];

  for (const item of traktShows) {
    try {
      const tvdbData = await tvdbFetch(`/series/${item.tvdbId}/extended`);
      enriched.push({
        tvdbId: item.tvdbId,
        title: tvdbData.name || item.title,
        posterUrl: tvdbData.image || null,
        traktIds: item.traktIds,
      });
    } catch (error) {
      console.warn(`Failed to fetch TVDB data for ${item.tvdbId}:`, error);
      enriched.push({
        tvdbId: item.tvdbId,
        title: item.title,
        posterUrl: null,
        traktIds: item.traktIds,
      });
    }
  }

  return enriched;
}

export async function getDiscoverRails() {
  const [trending, popular, anticipated] = await Promise.all([
    trakt.getTrendingShows(1, 20),
    trakt.getPopularShows(1, 20),
    trakt.getAnticipatedShows(1, 20),
  ]);

  const [trendingEnriched, popularEnriched, anticipatedEnriched] = await Promise.all([
    enrichWithTVDB(trending),
    enrichWithTVDB(popular),
    enrichWithTVDB(anticipated),
  ]);

  return {
    trending: trendingEnriched,
    popular: popularEnriched,
    anticipated: anticipatedEnriched,
  };
}

export async function getShowCast(traktIds: { trakt?: number; slug?: string }) {
  const id = traktIds.slug || traktIds.trakt?.toString();
  if (!id) return { cast: [], crew: [] };

  try {
    return await trakt.getShowPeopleWithImages(id);
  } catch (error) {
    console.warn('Failed to fetch cast:', error);
    return { cast: [], crew: [] };
  }
}
