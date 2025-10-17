import { useState, useCallback } from 'react';
import { searchShows, getShow, getSeasons, getEpisodes } from '@/services/tvdb';

export interface TVShow {
  id: number;
  name: string;
  overview: string;
  image: string;
  firstAired: string;
}

export interface TVSeason {
  id: number;
  number: number;
  name: string;
  overview: string;
  image: string;
}

export interface TVEpisode {
  id: number;
  name: string;
  overview: string;
  aired: string;
  seasonNumber: number;
  number: number;
  image: string;
  runtime?: number;
}

export function useTVDB() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string): Promise<TVShow[]> => {
    if (!query.trim()) return [];
    
    setLoading(true);
    setError(null);
    try {
      const results = await searchShows(query);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShow = useCallback(async (id: number): Promise<TVShow | null> => {
    setLoading(true);
    setError(null);
    try {
      const show = await getShow(id);
      return show;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch show');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSeasons = useCallback(async (showId: number): Promise<TVSeason[]> => {
    setLoading(true);
    setError(null);
    try {
      const seasons = await getSeasons(showId);
      return seasons;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch seasons');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEpisodes = useCallback(async (seriesId: number, seasonNumber: number): Promise<TVEpisode[]> => {
    setLoading(true);
    setError(null);
    try {
      const episodes = await getEpisodes(seriesId);
      // Filter by season number
      return episodes.filter(ep => ep.seasonNumber === seasonNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch episodes');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    search,
    fetchShow,
    fetchSeasons,
    fetchEpisodes,
  };
}
