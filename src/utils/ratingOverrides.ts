import { supabase } from '@/lib/supabase';

/**
 * Calculate effective rating with 80% override logic
 * 
 * Episode → Season: User's episode ratings override their season rating 
 * once they've rated ≥80% of released episodes in that season.
 * 
 * Season → Show: User's season ratings override their show rating 
 * once they've rated ≥80% of released seasons.
 */

interface ContentRating {
  content_id: string;
  rating: number;
}

/**
 * Get effective season rating for a user
 * Returns either the direct season rating or average of episode ratings if 80% threshold met
 */
export async function getEffectiveSeasonRating(
  userId: string,
  seasonContentId: string
): Promise<number | null> {
  // Get direct season rating
  const { data: seasonRating } = await supabase
    .from('ratings')
    .select('rating')
    .eq('user_id', userId)
    .eq('content_id', seasonContentId)
    .single();

  // Get all episodes in this season
  const { data: episodes } = await supabase
    .from('content')
    .select('id, air_date')
    .eq('parent_id', seasonContentId)
    .eq('kind', 'episode');

  if (!episodes || episodes.length === 0) {
    return seasonRating?.rating || null;
  }

  // Filter released episodes (air_date <= today)
  const releasedEpisodes = episodes.filter(ep => {
    if (!ep.air_date) return false;
    return new Date(ep.air_date) <= new Date();
  });

  if (releasedEpisodes.length === 0) {
    return seasonRating?.rating || null;
  }

  // Get user's episode ratings
  const { data: episodeRatings } = await supabase
    .from('ratings')
    .select('content_id, rating')
    .eq('user_id', userId)
    .in('content_id', releasedEpisodes.map(ep => ep.id));

  const ratedCount = episodeRatings?.length || 0;
  const threshold = Math.ceil(releasedEpisodes.length * 0.8);

  // If user has rated ≥80% of released episodes, use episode average
  if (ratedCount >= threshold && episodeRatings) {
    const sum = episodeRatings.reduce((acc, r) => acc + r.rating, 0);
    return sum / episodeRatings.length;
  }

  // Otherwise use direct season rating
  return seasonRating?.rating || null;
}

/**
 * Get effective show rating for a user
 * Returns either the direct show rating or average of season ratings if 80% threshold met
 */
export async function getEffectiveShowRating(
  userId: string,
  showContentId: string
): Promise<number | null> {
  // Get direct show rating
  const { data: showRating } = await supabase
    .from('ratings')
    .select('rating')
    .eq('user_id', userId)
    .eq('content_id', showContentId)
    .single();

  // Get all seasons in this show
  const { data: seasons } = await supabase
    .from('content')
    .select('id, air_date')
    .eq('parent_id', showContentId)
    .eq('kind', 'season');

  if (!seasons || seasons.length === 0) {
    return showRating?.rating || null;
  }

  // Filter released seasons
  const releasedSeasons = seasons.filter(s => {
    if (!s.air_date) return false;
    return new Date(s.air_date) <= new Date();
  });

  if (releasedSeasons.length === 0) {
    return showRating?.rating || null;
  }

  // Get effective season ratings
  const seasonRatings: number[] = [];
  for (const season of releasedSeasons) {
    const effectiveRating = await getEffectiveSeasonRating(userId, season.id);
    if (effectiveRating !== null) {
      seasonRatings.push(effectiveRating);
    }
  }

  const threshold = Math.ceil(releasedSeasons.length * 0.8);

  // If user has rated ≥80% of released seasons, use season average
  if (seasonRatings.length >= threshold) {
    const sum = seasonRatings.reduce((acc, r) => acc + r, 0);
    return sum / seasonRatings.length;
  }

  // Otherwise use direct show rating
  return showRating?.rating || null;
}

/**
 * Calculate aggregate score for content with Bayesian smoothing
 */
export async function calculateAggregateScore(contentId: string): Promise<void> {
  const { data: content } = await supabase
    .from('content')
    .select('kind')
    .eq('id', contentId)
    .single();

  if (!content) return;

  let allRatings: number[] = [];

  if (content.kind === 'show') {
    // Get all users who rated this show
    const { data: users } = await supabase
      .from('ratings')
      .select('user_id')
      .eq('content_id', contentId);

    if (!users) return;

    for (const { user_id } of users) {
      const effectiveRating = await getEffectiveShowRating(user_id, contentId);
      if (effectiveRating !== null) {
        allRatings.push(effectiveRating);
      }
    }
  } else if (content.kind === 'season') {
    // Get all users who rated this season
    const { data: users } = await supabase
      .from('ratings')
      .select('user_id')
      .eq('content_id', contentId);

    if (!users) return;

    for (const { user_id } of users) {
      const effectiveRating = await getEffectiveSeasonRating(user_id, contentId);
      if (effectiveRating !== null) {
        allRatings.push(effectiveRating);
      }
    }
  } else {
    // For episodes, just use direct ratings
    const { data: ratings } = await supabase
      .from('ratings')
      .select('rating')
      .eq('content_id', contentId);

    allRatings = ratings?.map(r => r.rating) || [];
  }

  if (allRatings.length === 0) return;

  // Calculate average percentage
  const avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
  const avgPercent = avgRating * 10; // Convert 1-10 to 10-100

  // Bayesian smoothing (base of 25 votes at 75%)
  const baseVotes = 25;
  const basePercent = 75;
  const bayesScore =
    (baseVotes * basePercent + allRatings.length * avgPercent) /
    (baseVotes + allRatings.length);

  // Upsert aggregate
  await supabase
    .from('aggregates')
    .upsert({
      content_id: contentId,
      votes: allRatings.length,
      avg_percent: avgPercent,
      bayes_score: bayesScore,
      updated_at: new Date().toISOString(),
    });
}
