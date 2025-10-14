/**
 * Ratings API - unified ledger for shows/seasons/episodes
 */

import { supabase } from '@/integrations/supabase/client';

export interface SaveRatingParams {
  itemType: 'show' | 'season' | 'episode';
  itemId: number;
  percent: number;
}

/**
 * Save a rating to the ledger
 */
export async function saveRating(params: SaveRatingParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Upsert to user_ratings
  const { error } = await supabase
    .from('user_ratings')
    .upsert({
      user_id: user.id,
      item_type: params.itemType,
      item_id: params.itemId.toString(),
      score: params.percent,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,item_type,item_id'
    });
  
  if (error) throw error;
  
  // Update latest review post badge if exists
  const { data: recentReview } = await supabase
    .from('posts')
    .select('id')
    .eq('author_id', user.id)
    .eq('kind', 'review')
    .eq('item_type', params.itemType)
    .eq('item_id', params.itemId.toString())
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
 * Get all ratings for a user grouped by shows
 */
export async function getUserRatingsGrouped(userId?: string) {
  const uid = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return [];
  
  const { data, error } = await supabase
    .from('user_ratings')
    .select('*')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  
  // Group by show
  const showMap = new Map<string, any>();
  
  for (const rating of data || []) {
    // Extract show ID from item_id
    // For shows: item_id is the show ID
    // For seasons: item_id format could be showId or composite
    // For episodes: item_id format could be showId or composite
    // Assuming item_id is just the TVDB ID for now
    
    const showId = rating.item_id; // Simplified for now
    
    if (!showMap.has(showId)) {
      showMap.set(showId, {
        showId,
        showScore: null,
        seasons: new Map()
      });
    }
    
    const show = showMap.get(showId)!;
    
    if (rating.item_type === 'show') {
      show.showScore = rating.score;
    } else if (rating.item_type === 'season') {
      if (!show.seasons.has(rating.item_id)) {
        show.seasons.set(rating.item_id, {
          seasonId: rating.item_id,
          score: rating.score,
          episodes: []
        });
      }
    } else if (rating.item_type === 'episode') {
      // Would need season extraction logic here
    }
  }
  
  return Array.from(showMap.values());
}
