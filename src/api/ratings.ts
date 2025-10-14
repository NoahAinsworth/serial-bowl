import { supabase } from "@/integrations/supabase/client";

export interface SaveRatingParams {
  itemType: 'show' | 'season' | 'episode';
  itemId: string;
  percent: number;
}

/**
 * Save a rating directly (for slider on detail pages)
 * This bypasses posts and goes straight to user_ratings
 */
export async function saveRating(params: SaveRatingParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Upsert into user_ratings
  const { error } = await supabase
    .from('user_ratings')
    .upsert({
      user_id: user.id,
      item_type: params.itemType,
      item_id: params.itemId,
      score: params.percent,
      source: 'manual',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,item_type,item_id'
    });

  if (error) throw error;

  // Optional: Update the user's most recent review post for this item
  // to keep UI consistent
  const { data: recentReview } = await supabase
    .from('posts')
    .select('id')
    .eq('author_id', user.id)
    .eq('kind', 'review')
    .eq('item_type', params.itemType)
    .eq('item_id', params.itemId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentReview) {
    await supabase
      .from('posts')
      .update({ rating_percent: params.percent })
      .eq('id', recentReview.id);
  }
}

/**
 * Get user's rating for a specific item
 */
export async function getRating(itemType: string, itemId: string, userId?: string) {
  const uid = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('user_ratings')
    .select('score')
    .eq('user_id', uid)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) throw error;
  return data?.score || null;
}

/**
 * Get all ratings for a user by item type
 */
export async function getUserRatings(itemType: 'show' | 'season' | 'episode', userId?: string) {
  const uid = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('user_ratings')
    .select('*')
    .eq('user_id', uid)
    .eq('item_type', itemType)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
