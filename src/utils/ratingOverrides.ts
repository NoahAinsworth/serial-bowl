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
  seasonItemId: string
): Promise<number | null> {
  // Disabled - needs to be rebuilt with new data model
  return null;
}

/**
 * Get effective show rating for a user
 * Returns either the direct show rating or average of season ratings if 80% threshold met
 */
export async function getEffectiveShowRating(
  userId: string,
  showItemId: string
): Promise<number | null> {
  // Disabled - needs to be rebuilt with new data model
  return null;
}

/**
 * Calculate aggregate score for content with Bayesian smoothing
 */
export async function calculateAggregateScore(itemId: string): Promise<void> {
  // Disabled - needs to be rebuilt with new data model
  return;
}
