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
    // Search for trending shows - using years like the New tab does
    const searchTerms = ['trending', 'popular', '2024', '2023', '2022'];
    const searchTerm = searchTerms[page % searchTerms.length];
    
    const results = await tvdbClient.searchShows(searchTerm);
    
    // Get a slice based on the page
    const startIdx = ((page - 1) * 20) % results.length;
    const pageResults = results.slice(startIdx, startIdx + 20);
    
    return pageResults.map((show: any) => ({
      id: show.tvdb_id || show.id,
      title: show.name,
      posterUrl: show.image_url || show.image || null,
      year: show.first_air_time?.split('-')[0] || show.firstAired?.split('-')[0] || null,
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
