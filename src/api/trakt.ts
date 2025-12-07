import { supabase } from '@/integrations/supabase/client';

interface TraktShow {
  show: {
    title: string;
    ids: {
      tvdb?: number;
      trakt?: number;
      slug?: string;
    };
  };
}

interface TraktPerson {
  person: {
    name: string;
    ids: {
      trakt: number;
      slug: string;
    };
    images?: {
      headshot?: {
        full?: string;
        medium?: string;
        thumb?: string;
      };
    };
  };
  character?: string;
  characters?: string[];
  job?: string;
  jobs?: string[];
}

async function traktFetch(path: string) {
  const { data, error } = await supabase.functions.invoke('trakt-proxy', {
    body: { path },
  });

  if (error) {
    throw new Error(`Trakt API error: ${error.message}`);
  }

  return data.data;
}

export async function getTrendingShows(page = 1, limit = 20) {
  const data: TraktShow[] = await traktFetch(`/shows/trending?page=${page}&limit=${limit}`);
  return data
    .filter(item => item.show?.ids?.tvdb)
    .map(item => ({
      tvdbId: item.show.ids.tvdb!,
      traktIds: item.show.ids,
      title: item.show.title,
    }));
}

export async function getPopularShows(page = 1, limit = 20) {
  const data: TraktShow[] = await traktFetch(`/shows/popular?page=${page}&limit=${limit}`);
  return data
    .filter(item => item.show?.ids?.tvdb)
    .map(item => ({
      tvdbId: item.show.ids.tvdb!,
      traktIds: item.show.ids,
      title: item.show.title,
    }));
}

export async function getAnticipatedShows(page = 1, limit = 20) {
  const data: TraktShow[] = await traktFetch(`/shows/anticipated?page=${page}&limit=${limit}`);
  return data
    .filter(item => item.show?.ids?.tvdb)
    .map(item => ({
      tvdbId: item.show.ids.tvdb!,
      traktIds: item.show.ids,
      title: item.show.title,
    }));
}

export async function getShowPeopleWithImages(idOrSlug: string) {
  const data = await traktFetch(`/shows/${idOrSlug}/people?extended=images`);
  
  const cast = (data.cast || []).map((item: TraktPerson) => ({
    name: item.person.name,
    character: item.character || item.characters?.[0] || '',
    headshotUrl: item.person.images?.headshot?.medium || item.person.images?.headshot?.full || null,
  }));

  const crew = (data.crew?.production || []).map((item: TraktPerson) => ({
    name: item.person.name,
    job: item.job || item.jobs?.[0] || '',
    headshotUrl: item.person.images?.headshot?.medium || item.person.images?.headshot?.full || null,
  }));

  return { cast, crew };
}
