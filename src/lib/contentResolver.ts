import { supabase } from '@/lib/supabase';

/**
 * Resolves a TVDB show ID to the internal content ID.
 * This ensures ALL features use the unified TVDB content model.
 * 
 * @param tvdbId - The TVDB show ID
 * @param showData - Optional show data to avoid extra API call
 * @returns The internal content UUID
 */
export async function resolveShowToContent(
  tvdbId: string | number,
  showData?: {
    name?: string;
    title?: string;
    image?: string;
    poster?: string;
    overview?: string;
    [key: string]: any;
  }
): Promise<string | null> {
  const tvdbIdStr = tvdbId.toString();

  try {
    // Check if content already exists
    const { data: existing } = await supabase
      .from('content')
      .select('id')
      .eq('external_id', tvdbIdStr)
      .eq('external_src', 'tvdb')
      .eq('kind', 'show')
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    // If we don't have show data, we need it to create the content
    if (!showData) {
      console.warn('No show data provided for new content creation');
      return null;
    }

    // Insert new content
    const title = showData.name || showData.title || 'Unknown Show';
    const posterUrl = showData.image || showData.poster || null;
    const metadata = {
      overview: showData.overview,
      ...showData,
    };

    const { data: newContent, error } = await supabase
      .from('content')
      .insert({
        external_src: 'tvdb',
        external_id: tvdbIdStr,
        kind: 'show',
        title,
        poster_url: posterUrl,
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating content:', error);
      return null;
    }

    return newContent.id;
  } catch (error) {
    console.error('Error resolving show to content:', error);
    return null;
  }
}

/**
 * Batch resolve multiple TVDB IDs to content IDs
 */
export async function batchResolveShowsToContent(
  shows: Array<{
    tvdbId: string | number;
    data?: {
      name?: string;
      title?: string;
      image?: string;
      poster?: string;
      overview?: string;
      [key: string]: any;
    };
  }>
): Promise<Array<{ tvdbId: string; contentId: string | null }>> {
  const results = await Promise.all(
    shows.map(async (show) => ({
      tvdbId: show.tvdbId.toString(),
      contentId: await resolveShowToContent(show.tvdbId, show.data),
    }))
  );

  return results;
}

/**
 * Get or create content from TVDB search result
 */
export async function contentFromTVDBResult(tvdbResult: {
  tvdb_id: number;
  name: string;
  image_url?: string;
  overview?: string;
  first_air_date?: string;
  [key: string]: any;
}): Promise<string | null> {
  return resolveShowToContent(tvdbResult.tvdb_id, {
    name: tvdbResult.name,
    image: tvdbResult.image_url,
    overview: tvdbResult.overview,
    ...tvdbResult,
  });
}
