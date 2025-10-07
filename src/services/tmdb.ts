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
    const trending = await tvdbClient.getTrending();
    
    // Get a slice based on the page
    const startIdx = (page - 1) * 20;
    const pageResults = trending.slice(startIdx, startIdx + 20);
    
    return pageResults.map((show: any) => ({
      id: show.id || show.tvdb_id,
      title: show.name || show.seriesName,
      posterUrl: show.image || show.image_url || null,
      year: show.year?.toString() || null,
      popularity: Math.random() * 1000,
    }));
  } catch (error) {
    console.error('Error fetching trending shows from TVDB:', error);
    throw new Error('Failed to fetch trending shows from TVDB');
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
