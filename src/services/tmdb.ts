import { env } from '@/lib/env';

const TMDB_BASE = env.TMDB_BASE_URL;
const TMDB_IMG = env.TMDB_IMAGE_BASE_URL;
const API_KEY = env.TMDB_API_KEY;

export interface TMDBShow {
  id: number;
  title: string;
  posterUrl: string | null;
  year: string | null;
  popularity: number;
}

export async function fetchPopularShows(page = 1): Promise<TMDBShow[]> {
  const res = await fetch(`${TMDB_BASE}/tv/popular?api_key=${API_KEY}&page=${page}`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch popular shows from TMDB');
  }
  
  const data = await res.json();
  
  return data.results.map((show: any) => ({
    id: show.id,
    title: show.name,
    posterUrl: show.poster_path ? `${TMDB_IMG}${show.poster_path}` : null,
    year: show.first_air_date?.split('-')[0] ?? null,
    popularity: show.popularity,
  }));
}

export async function fetchNewShows(page = 1): Promise<TMDBShow[]> {
  const res = await fetch(
    `${TMDB_BASE}/discover/tv?api_key=${API_KEY}&sort_by=first_air_date.desc&page=${page}`
  );
  
  if (!res.ok) {
    throw new Error('Failed to fetch new shows from TMDB');
  }
  
  const data = await res.json();
  
  return data.results.map((show: any) => ({
    id: show.id,
    title: show.name,
    posterUrl: show.poster_path ? `${TMDB_IMG}${show.poster_path}` : null,
    year: show.first_air_date?.split('-')[0] ?? null,
    popularity: show.popularity,
  }));
}
