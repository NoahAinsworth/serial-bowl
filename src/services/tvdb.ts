import { tvdbFetch } from '@/lib/tvdb';

/**
 * Unified TVDB service using the modern tvdbFetch client
 * This ensures consistency with the discover page and binge points system
 */

// Normalize show data
function normalizeShow(show: any) {
  return {
    id: show.tvdb_id || show.id,
    title: show.name,
    posterUrl: show.image_url || show.image || null,
    year: show.first_air_time?.split('-')[0] || show.firstAired?.split('-')[0] || null,
  };
}

// Export convenience functions using unified client
export async function searchShows(query: string) {
  try {
    const results = await tvdbFetch(`/search?query=${encodeURIComponent(query)}&type=series&limit=20`);
    const showsData = Array.isArray(results) ? results : [];
    
    return showsData.map((show: any) => ({
      id: show.tvdb_id || show.id,
      tvdb_id: show.tvdb_id || show.id,
      name: show.name || 'Untitled',
      overview: show.overview || '',
      image: show.image_url || show.image || '',
      image_url: show.image_url || show.image || '',
      firstAired: show.first_air_time || show.firstAired || '',
      year: show.year || (show.first_air_time || show.firstAired)?.split('-')[0] || '',
    }));
  } catch (error) {
    console.error('Search shows error:', error);
    return [];
  }
}

export async function fetchBrowseShows(page = 1) {
  try {
    const results = await tvdbFetch(`/series/filter?page=${page - 1}&sort=score&sortType=desc`);
    const showsData = Array.isArray(results) ? results : [];
    return showsData.slice(0, 20).map(normalizeShow);
  } catch (error) {
    console.error('Fetch browse shows error:', error);
    return [];
  }
}

export async function fetchNewShows(page = 1) {
  try {
    const currentYear = new Date().getFullYear();
    const results = await tvdbFetch(`/search?query=${currentYear}&type=series&limit=20&page=${page - 1}`);
    const showsData = Array.isArray(results) ? results : [];
    
    // Filter to recently aired shows
    const recentDate = new Date();
    recentDate.setFullYear(recentDate.getFullYear() - 1);
    
    return showsData
      .filter((show: any) => {
        const airDate = show.first_air_time || show.firstAired;
        if (!airDate) return false;
        return new Date(airDate) >= recentDate;
      })
      .slice(0, 20)
      .map(normalizeShow);
  } catch (error) {
    console.error('Fetch new shows error:', error);
    return [];
  }
}

export async function getShow(id: number) {
  try {
    const show = await tvdbFetch(`/series/${id}/extended`);
    return {
      id: show.id,
      name: show.name || 'Untitled',
      overview: show.overview || '',
      image: show.image || '',
      firstAired: show.firstAired || show.first_air_time || '',
    };
  } catch (error) {
    console.error(`Get show ${id} error:`, error);
    throw new Error('Show not found');
  }
}

export async function getSeasons(showId: number) {
  try {
    const show = await tvdbFetch(`/series/${showId}/extended`);
    const seasons = show.seasons || [];
    
    // Filter out season 0 (specials) and map to expected format
    return seasons
      .filter((season: any) => season.number > 0)
      .map((season: any) => ({
        id: season.id || season.number,
        number: season.number,
        name: season.name || `Season ${season.number}`,
        overview: season.overview || '',
        image: season.image || '',
      }))
      .sort((a: any, b: any) => a.number - b.number);
  } catch (error) {
    console.error(`Get seasons for show ${showId} error:`, error);
    return [];
  }
}

export async function getEpisodes(seriesId: number) {
  try {
    const show = await tvdbFetch(`/series/${seriesId}/extended`);
    const allEpisodes: any[] = [];
    
    // Extract episodes from all seasons
    if (show.seasons) {
      for (const season of show.seasons) {
        if (season.episodes) {
          allEpisodes.push(...season.episodes);
        }
      }
    }
    
    // Filter out specials (season 0) and map to expected format
    return allEpisodes
      .filter((ep: any) => ep.seasonNumber > 0)
      .map((ep: any) => ({
        id: ep.id,
        name: ep.name || 'Untitled Episode',
        overview: ep.overview || '',
        aired: ep.aired || '',
        seasonNumber: ep.seasonNumber,
        number: ep.number || ep.episodeNumber,
        image: ep.image || '',
      }));
  } catch (error) {
    console.error(`Get episodes for series ${seriesId} error:`, error);
    return [];
  }
}
