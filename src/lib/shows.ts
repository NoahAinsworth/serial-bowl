/**
 * Show data normalization
 */

export type ShowCard = {
  id: number;
  title: string;
  year: string | null;
  firstAired: string | null;
  score?: number | null;
  posterUrl: string | null;
};

/**
 * Extract numeric ID from various formats (e.g., "series-123" or 123)
 */
function extractNumericId(id: any): number {
  if (typeof id === 'number') return id;
  if (typeof id === 'string') {
    // Remove any non-numeric prefix like "series-"
    const match = id.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }
  return 0;
}

export function normalizeSeries(s: any): ShowCard {
  return {
    id: extractNumericId(s.id || s.tvdb_id || s.seriesId),
    title: s.name ?? s.seriesName ?? "Untitled",
    year: s.year ?? (s.firstAired || s.first_air_time ? String(s.firstAired || s.first_air_time).slice(0, 4) : null),
    firstAired: s.firstAired ?? s.first_air_time ?? null,
    score: typeof s.score === "number" ? s.score : null,
    posterUrl: s.image_url ?? s.image ?? s.artwork_64_url ?? s.artwork_32_url ?? null
  };
}
