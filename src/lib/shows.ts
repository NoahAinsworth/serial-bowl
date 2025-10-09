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

export function normalizeSeries(s: any): ShowCard {
  return {
    id: s.id,
    title: s.name ?? s.seriesName ?? "Untitled",
    year: s.year ?? (s.firstAired || s.first_air_time ? String(s.firstAired || s.first_air_time).slice(0, 4) : null),
    firstAired: s.firstAired ?? s.first_air_time ?? null,
    score: typeof s.score === "number" ? s.score : null,
    posterUrl: s.image_url ?? s.image ?? s.artwork_64_url ?? s.artwork_32_url ?? null
  };
}
