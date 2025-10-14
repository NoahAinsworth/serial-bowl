/**
 * TVDB v4 API client with token caching and auto-refresh
 * Source of truth for show IDs and posters
 */

const BASE = "https://api4.thetvdb.com/v4";

type TVDBToken = { token: string; issuedAt: number };

function readToken(): TVDBToken | null {
  const raw = localStorage.getItem("tvdb.token");
  return raw ? JSON.parse(raw) : null;
}

function saveToken(t: TVDBToken) {
  localStorage.setItem("tvdb.token", JSON.stringify(t));
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      apikey: import.meta.env.VITE_TVDB_API_KEY
    })
  });
  
  if (!res.ok) throw new Error(`TVDB login failed ${res.status}`);
  
  const data = await res.json();
  const token = data?.data?.token as string;
  saveToken({ token, issuedAt: Date.now() });
  return token;
}

async function getToken(): Promise<string> {
  const cached = readToken();
  // TVDB tokens valid ~1 month; refresh after 27 days
  if (cached && Date.now() - cached.issuedAt < 27 * 24 * 60 * 60 * 1000) {
    return cached.token;
  }
  return login();
}

export async function tvdbFetch(path: string, init?: RequestInit) {
  let token = await getToken();
  let res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 
      ...(init?.headers || {}), 
      Authorization: `Bearer ${token}`, 
      Accept: "application/json" 
    }
  });
  
  // Retry once if token expired
  if (res.status === 401) {
    token = await login();
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 
        ...(init?.headers || {}), 
        Authorization: `Bearer ${token}`, 
        Accept: "application/json" 
      }
    });
  }
  
  if (!res.ok) throw new Error(`TVDB ${path} -> ${res.status}`);
  
  const json = await res.json();
  return json?.data ?? json;
}

export interface TVDBShow {
  tvdbId: number;
  title: string;
  year?: number;
  posterUrl?: string;
  overview?: string;
}

export interface TVDBSeason {
  tvdbId: number;
  showId: number;
  seasonNumber: number;
  posterUrl?: string;
}

export interface TVDBEpisode {
  tvdbId: number;
  showId: number;
  seasonId: number;
  seasonNumber: number;
  episodeNumber: number;
  title?: string;
}

/**
 * Search shows by query
 */
export async function searchShows(query: string, page: number = 1): Promise<TVDBShow[]> {
  const data = await tvdbFetch(`/search?query=${encodeURIComponent(query)}&type=series&limit=20&page=${page - 1}`);
  
  return (data || []).map((item: any) => ({
    tvdbId: item.tvdb_id || item.id,
    title: item.name || item.title || '',
    year: item.year ? parseInt(item.year) : undefined,
    posterUrl: item.image_url || item.thumbnail,
    overview: item.overview
  }));
}

/**
 * Get show details by TVDB ID
 */
export async function getShow(tvdbId: number): Promise<TVDBShow | null> {
  try {
    const data = await tvdbFetch(`/series/${tvdbId}/extended`);
    return {
      tvdbId: data.id,
      title: data.name,
      year: data.year ? parseInt(data.year) : undefined,
      posterUrl: data.image,
      overview: data.overview
    };
  } catch (error) {
    console.error('Failed to fetch show:', error);
    return null;
  }
}

/**
 * Get seasons for a show
 */
export async function getSeasons(showId: number): Promise<TVDBSeason[]> {
  try {
    const data = await tvdbFetch(`/series/${showId}/extended`);
    const seasons = data.seasons || [];
    
    return seasons.map((season: any) => ({
      tvdbId: season.id,
      showId: showId,
      seasonNumber: season.number || 0,
      posterUrl: season.image
    }));
  } catch (error) {
    console.error('Failed to fetch seasons:', error);
    return [];
  }
}

/**
 * Get episode details
 */
export async function getEpisode(episodeId: number): Promise<TVDBEpisode | null> {
  try {
    const data = await tvdbFetch(`/episodes/${episodeId}/extended`);
    return {
      tvdbId: data.id,
      showId: data.series?.id || 0,
      seasonId: data.seasonId || 0,
      seasonNumber: data.seasonNumber || 0,
      episodeNumber: data.number || 0,
      title: data.name
    };
  } catch (error) {
    console.error('Failed to fetch episode:', error);
    return null;
  }
}
