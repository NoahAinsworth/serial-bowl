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

  async getTrendingShows(page = 0) {
    await this.ensureAuthenticated();
    const response = await this.client.get('/series/trending', {
      params: { page },
    });
    return response.data.data || [];
  }

  async getPopularShows(page = 0) {
    await this.ensureAuthenticated();
    const response = await this.client.get('/series/popular', {
      params: { page },
    });
    return response.data.data || [];
  }

  async getNewShows(page = 0) {
    await this.ensureAuthenticated();
    const response = await this.client.get('/series/filter', {
      params: { sort: 'firstAired', page },
    });
    return response.data.data || [];
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
    id: show.id || show.tvdb_id,
    title: show.name,
    posterUrl: show.image || show.image_url || show.artwork_32_url || show.artwork_64_url || null,
    year: show.firstAired?.split('-')[0] || show.first_air_time?.split('-')[0] || null,
    popularity: show.score ?? show.popularity ?? null,
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
  const tvdbPage = page - 1; // TVDB is 0-indexed
  const [trending, popular] = await Promise.all([
    tvdbClient.getTrendingShows(tvdbPage),
    tvdbClient.getPopularShows(tvdbPage),
  ]);
  
  // Combine and deduplicate
  const combined = [...trending, ...popular]
    .reduce((acc: any[], item: any) => {
      if (!acc.find((s) => s.id === item.id)) acc.push(item);
      return acc;
    }, [])
    .slice(0, 40);
  
  return combined.map(normalizeShow);
}

export async function fetchNewShows(page = 1) {
  const tvdbPage = page - 1; // TVDB is 0-indexed
  const recent = await tvdbClient.getNewShows(tvdbPage);
  return recent.map(normalizeShow);
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
