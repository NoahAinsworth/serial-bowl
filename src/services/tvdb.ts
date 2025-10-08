import axios, { AxiosInstance } from 'axios';
import { env } from '@/lib/env';

class TVDBClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: env.TVDB_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async ensureAuthenticated() {
    const now = Date.now();
    if (this.token && this.tokenExpiry > now) {
      return;
    }

    try {
      const response = await this.client.post('/login', {
        apikey: env.TVDB_API_KEY,
      });
      this.token = response.data.data.token;
      this.tokenExpiry = now + 24 * 60 * 60 * 1000; // 24 hours
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    } catch (error) {
      console.error('TVDB authentication failed:', error);
      throw error;
    }
  }

  async searchShows(query: string) {
    await this.ensureAuthenticated();
    const response = await this.client.get('/search', {
      params: { query, type: 'series' },
    });
    return response.data.data;
  }

  async getShow(seriesId: number) {
    await this.ensureAuthenticated();
    const response = await this.client.get(`/series/${seriesId}`);
    return response.data.data;
  }

  async getEpisodes(seriesId: number) {
    await this.ensureAuthenticated();
    const response = await this.client.get(`/series/${seriesId}/episodes/default`);
    return response.data.data;
  }

  async getArtworks(seriesId: number) {
    await this.ensureAuthenticated();
    const response = await this.client.get(`/series/${seriesId}/artworks`);
    return response.data.data;
  }
}

export const tvdbClient = new TVDBClient();

// Normalize show data
function normalizeShow(show: any) {
  return {
    id: show.tvdb_id || show.id,
    title: show.name,
    posterUrl: show.image_url || show.image || null,
    year: show.first_air_time?.split('-')[0] || show.firstAired?.split('-')[0] || null,
  };
}

// Export convenience functions
export async function searchShows(query: string) {
  const results = await tvdbClient.searchShows(query);
  return results.map((show: any) => ({
    id: show.tvdb_id,
    name: show.name,
    overview: show.overview || '',
    image: show.image_url || '',
    firstAired: show.first_air_time || '',
  }));
}

export async function fetchBrowseShows(page = 1) {
  // Use a mix of popular search terms to get diverse results
  const searchTerms = [
    'Breaking Bad', 'Game of Thrones', 'Stranger Things', 'The Office', 
    'Friends', 'The Walking Dead', 'The Boys', 'Wednesday', 'Succession',
    'The Last of Us', 'House of the Dragon', 'The Witcher', 'Peaky Blinders',
    'Better Call Saul', 'The Crown', 'Dark', 'Narcos', 'Ozark'
  ];
  
  const searchTerm = searchTerms[(page - 1) % searchTerms.length];
  console.log('[fetchBrowseShows] Page:', page, 'Searching for:', searchTerm);
  
  const results = await tvdbClient.searchShows(searchTerm);
  console.log('[fetchBrowseShows] Raw results:', results.length, 'shows');
  console.log('[fetchBrowseShows] First result:', results[0]);
  
  // Take first 20 results
  const normalized = results.slice(0, 20).map(normalizeShow);
  console.log('[fetchBrowseShows] Normalized:', normalized.length, 'shows');
  console.log('[fetchBrowseShows] First normalized:', normalized[0]);
  
  return normalized;
}

export async function fetchNewShows(page = 1) {
  // Search for shows from the current year
  const currentYear = new Date().getFullYear();
  const results = await tvdbClient.searchShows(currentYear.toString());
  
  // Filter to only shows that actually premiered recently (within last year)
  const recentDate = new Date();
  recentDate.setFullYear(recentDate.getFullYear() - 1);
  
  const recentShows = results
    .filter((show: any) => {
      const airDate = show.first_air_time || show.firstAired;
      if (!airDate) return false;
      
      const showDate = new Date(airDate);
      return showDate >= recentDate;
    })
    .slice(0, 20);
  
  return recentShows.map(normalizeShow);
}

export async function getShow(id: number) {
  const show = await tvdbClient.getShow(id);
  return {
    id: show.id,
    name: show.name,
    overview: show.overview || '',
    image: show.image || '',
    firstAired: show.firstAired || '',
  };
}

export async function getSeasons(showId: number) {
  const episodes = await tvdbClient.getEpisodes(showId);
  const seasonsMap = new Map();
  
  episodes.episodes?.forEach((ep: any) => {
    if (!seasonsMap.has(ep.seasonNumber)) {
      seasonsMap.set(ep.seasonNumber, {
        id: ep.seasonNumber,
        number: ep.seasonNumber,
        name: `Season ${ep.seasonNumber}`,
        overview: '',
        image: ep.image || '',
      });
    }
  });
  
  return Array.from(seasonsMap.values()).sort((a, b) => a.number - b.number);
}

export async function getEpisodes(seriesId: number) {
  const data = await tvdbClient.getEpisodes(seriesId);
  return (data.episodes || []).map((ep: any) => ({
    id: ep.id,
    name: ep.name,
    overview: ep.overview || '',
    aired: ep.aired || '',
    seasonNumber: ep.seasonNumber,
    number: ep.number,
    image: ep.image || '',
  }));
}
