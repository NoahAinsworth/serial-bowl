import { supabase } from '@/integrations/supabase/client';

export async function tvdbFetch(path: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('tvdb-proxy', {
    body: { path },
  });

  if (error) {
    throw new Error(`TVDB API error: ${error.message}`);
  }

  return data.data;
}

export interface TVShow {
  tvdbId: number;
  title: string;
  year?: number;
  posterUrl?: string;
  overview?: string;
}

export interface TVSeason {
  id: number;
  seasonNumber: number;
  name?: string;
  overview?: string;
  posterUrl?: string;
}

export interface TVEpisode {
  id: number;
  name: string;
  overview?: string;
  aired?: string;
  seasonNumber: number;
  episodeNumber: number;
  posterUrl?: string;
}

export async function searchShows(query: string, page: number = 0): Promise<TVShow[]> {
  const data = await tvdbFetch(`/search?query=${encodeURIComponent(query)}&type=series&limit=20&page=${page}`);
  
  return (data || []).map((item: any) => ({
    tvdbId: item.tvdb_id || item.id,
    title: item.name || item.title,
    year: item.year ? parseInt(item.year) : undefined,
    posterUrl: item.image_url || item.thumbnail,
    overview: item.overview,
  }));
}

export async function getShow(tvdbId: number): Promise<TVShow | null> {
  try {
    const data = await tvdbFetch(`/series/${tvdbId}/extended`);
    
    return {
      tvdbId: data.id,
      title: data.name,
      year: data.year ? parseInt(data.year) : undefined,
      posterUrl: data.image,
      overview: data.overview,
    };
  } catch {
    return null;
  }
}

export async function getSeasons(tvdbId: number): Promise<TVSeason[]> {
  try {
    const data = await tvdbFetch(`/series/${tvdbId}/extended`);
    const seasons = data.seasons || [];
    
    return seasons.map((season: any) => ({
      id: season.id,
      seasonNumber: season.number,
      name: season.name,
      overview: season.overview,
      posterUrl: season.image,
    }));
  } catch {
    return [];
  }
}

export async function getEpisode(episodeId: number): Promise<TVEpisode | null> {
  try {
    const data = await tvdbFetch(`/episodes/${episodeId}/extended`);
    
    return {
      id: data.id,
      name: data.name,
      overview: data.overview,
      aired: data.aired,
      seasonNumber: data.seasonNumber,
      episodeNumber: data.number,
      posterUrl: data.image,
    };
  } catch {
    return null;
  }
}
