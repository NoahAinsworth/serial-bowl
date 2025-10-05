import axios, { AxiosInstance } from 'axios';

const TVDB_BASE_URL = import.meta.env.VITE_TVDB_BASE_URL;
const TVDB_API_KEY = import.meta.env.VITE_TVDB_API_KEY;

class TVDBClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: TVDB_BASE_URL,
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
        apikey: TVDB_API_KEY,
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
