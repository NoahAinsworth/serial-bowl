import { useState, useCallback } from 'react';
import { searchShows, getShow, getSeasons, getEpisodes } from '@/services/tvdb';
import { supabase } from '@/integrations/supabase/client';

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
      console.error('Search error:', err);
      setError('Failed to search shows. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShow = useCallback(async (id: number): Promise<TVShow | null> => {
    setLoading(true);
    setError(null);
    
    // Retry logic for robustness
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        const show = await getShow(id);
        return show;
      } catch (err) {
        attempts++;
        console.error(`Fetch show attempt ${attempts} failed:`, err);
        
        if (attempts >= maxAttempts) {
          setError('Show not found. Please try another show.');
          return null;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      } finally {
        if (attempts >= maxAttempts) {
          setLoading(false);
        }
      }
    }
    
    return null;
  }, []);

  const fetchSeasons = useCallback(async (showId: number): Promise<TVSeason[]> => {
    setLoading(true);
    setError(null);
    try {
      const seasons = await getSeasons(showId);
      
      // Cache show counts for binge points calculation
      const allEpisodes = await getEpisodes(showId);
      await supabase.rpc('update_show_counts', {
        p_show_external_id: showId.toString(),
        p_season_count: seasons.length,
        p_total_episode_count: allEpisodes.length,
      });
      
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
      const seasonEpisodes = episodes.filter(ep => ep.seasonNumber === seasonNumber);
      
      // Cache episode count for this season for binge points calculation
      await supabase.rpc('update_season_episode_count', {
        p_season_external_id: `${seriesId}:${seasonNumber}`,
        p_episode_count: seasonEpisodes.length,
      });
      
      return seasonEpisodes;
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
