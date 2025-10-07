import { tvdbClient } from './tvdb';

export interface TMDBShow {
  id: number;
  title: string;
  posterUrl: string | null;
  year: string | null;
  popularity: number;
}

export async function fetchPopularShows(page = 1): Promise<TMDBShow[]> {
  try {
    console.log('[fetchPopularShows] Starting fetch for page:', page);
    
    // Use TVDB trending data from our database cache
    const { supabase } = await import('@/integrations/supabase/client');
    
    const offset = (page - 1) * 20;
    const limit = 20;
    
    console.log('[fetchPopularShows] Query params:', { offset, limit, page });
    
    const { data: trendingShows, error } = await supabase
      .from('tvdb_trending')
      .select('*')
      .eq('category', 'popular')
      .order('position', { ascending: true })
      .range(offset, offset + limit - 1);
    
    console.log('[fetchPopularShows] Database result:', { 
      count: trendingShows?.length || 0, 
      error,
      firstShow: trendingShows?.[0]?.name 
    });
    
    if (error) {
      console.error('[fetchPopularShows] Database error:', error);
      throw error;
    }
    
    if (!trendingShows || trendingShows.length === 0) {
      console.log('[fetchPopularShows] No trending data found');
      return [];
    }
    
    const mappedShows = trendingShows.map((show: any) => ({
      id: show.tvdb_id,
      title: show.name,
      posterUrl: show.image_url || null,
      year: show.first_aired?.split('-')[0] || null,
      popularity: 1000 - show.position,
    }));
    
    console.log('[fetchPopularShows] Returning', mappedShows.length, 'shows');
    return mappedShows;
  } catch (error) {
    console.error('[fetchPopularShows] Fatal error:', error);
    throw new Error('Failed to fetch popular shows from TVDB');
  }
}

export async function fetchNewShows(page = 1): Promise<TMDBShow[]> {
  try {
    // For new shows, we'll search for recent years
    const currentYear = new Date().getFullYear();
    const searchYear = currentYear - (page - 1);
    
    const results = await tvdbClient.searchShows(searchYear.toString());
    
    // Filter for shows that actually aired recently
    const recentShows = results
      .filter((show: any) => {
        const year = show.first_air_time?.split('-')[0] || show.firstAired?.split('-')[0];
        return year && parseInt(year) >= currentYear - 2;
      })
      .slice(0, 20);
    
    return recentShows.map((show: any) => ({
      id: show.tvdb_id || show.id,
      title: show.name,
      posterUrl: show.image_url || show.image || null,
      year: show.first_air_time?.split('-')[0] || show.firstAired?.split('-')[0] || null,
      popularity: Math.random() * 1000,
    }));
  } catch (error) {
    console.error('Error fetching new shows from TVDB:', error);
    throw new Error('Failed to fetch new shows from TVDB');
  }
}
