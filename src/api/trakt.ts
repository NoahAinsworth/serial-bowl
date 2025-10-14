/**
 * Trakt API client for trending/popular rails and cast
 * Uses TVDB IDs as source of truth
 */

const BASE = "https://api.trakt.tv";

async function traktFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "trakt-api-version": "2",
      "trakt-api-key": import.meta.env.VITE_TRAKT_API_KEY || "",
      "Content-Type": "application/json"
    }
  });
  
  if (!res.ok) throw new Error(`Trakt ${path} -> ${res.status}`);
  return res.json();
}

export interface TraktShow {
  tvdbId: number;
  traktIds: {
    trakt?: number;
    slug?: string;
    imdb?: string;
  };
  title: string;
}

/**
 * Get trending shows (Trakt)
 */
export async function getTrendingShows(page: number = 1, limit: number = 20): Promise<TraktShow[]> {
  const data = await traktFetch(`/shows/trending?page=${page}&limit=${limit}&extended=full`);
  
  return data
    .filter((item: any) => item?.show?.ids?.tvdb)
    .map((item: any) => ({
      tvdbId: item.show.ids.tvdb,
      traktIds: {
        trakt: item.show.ids.trakt,
        slug: item.show.ids.slug,
        imdb: item.show.ids.imdb
      },
      title: item.show.title
    }));
}

/**
 * Get popular shows (Trakt)
 */
export async function getPopularShows(page: number = 1, limit: number = 20): Promise<TraktShow[]> {
  const data = await traktFetch(`/shows/popular?page=${page}&limit=${limit}&extended=full`);
  
  return data
    .filter((item: any) => item?.ids?.tvdb)
    .map((item: any) => ({
      tvdbId: item.ids.tvdb,
      traktIds: {
        trakt: item.ids.trakt,
        slug: item.ids.slug,
        imdb: item.ids.imdb
      },
      title: item.title
    }));
}

/**
 * Get anticipated shows (Trakt)
 */
export async function getAnticipatedShows(page: number = 1, limit: number = 20): Promise<TraktShow[]> {
  const data = await traktFetch(`/shows/anticipated?page=${page}&limit=${limit}&extended=full`);
  
  return data
    .filter((item: any) => item?.show?.ids?.tvdb)
    .map((item: any) => ({
      tvdbId: item.show.ids.tvdb,
      traktIds: {
        trakt: item.show.ids.trakt,
        slug: item.show.ids.slug,
        imdb: item.show.ids.imdb
      },
      title: item.show.title
    }));
}

export interface CastMember {
  name: string;
  character: string;
  headshotUrl?: string;
}

export interface ShowPeople {
  cast: CastMember[];
  crew: any[];
}

/**
 * Get show cast/crew with images (Trakt)
 */
export async function getShowPeopleWithImages(idOrSlug: string): Promise<ShowPeople> {
  try {
    const data = await traktFetch(`/shows/${idOrSlug}/people?extended=images`);
    
    return {
      cast: (data.cast || []).map((item: any) => ({
        name: item.person?.name || '',
        character: item.characters?.[0] || item.character || '',
        headshotUrl: item.person?.images?.headshot?.full || item.person?.images?.headshot?.medium
      })),
      crew: data.crew || []
    };
  } catch (error) {
    console.error('Failed to fetch show people:', error);
    return { cast: [], crew: [] };
  }
}
