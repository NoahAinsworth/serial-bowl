import { supabase, getUserId } from './supabase';

export interface SaveRatingParams {
  itemType: 'show' | 'season' | 'episode';
  itemId: number;
  percent: number;
}

export async function saveRating(params: SaveRatingParams) {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  // Upsert rating
  const { data, error } = await supabase
    .from('user_ratings')
    .upsert([{
      user_id: userId,
      item_type: params.itemType,
      item_id: String(params.itemId),
      score: params.percent,
      updated_at: new Date().toISOString(),
    }], {
      onConflict: 'user_id,item_type,item_id'
    })
    .select()
    .single();

  if (error) throw error;

  // Find latest review for this item and update its rating_percent
  const { data: latestReview } = await supabase
    .from('posts')
    .select()
    .eq('author_id', userId)
    .eq('kind', 'review')
    .eq('item_type', params.itemType)
    .eq('item_id', String(params.itemId))
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestReview) {
    await supabase
      .from('posts')
      .update({ rating_percent: params.percent })
      .eq('id', latestReview.id);
  }

  return data;
}

export async function getRating(params: { itemType: string; itemId: number }) {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('user_ratings')
    .select()
    .eq('user_id', userId)
    .eq('item_type', params.itemType)
    .eq('item_id', String(params.itemId))
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUserRatings(targetUserId?: string) {
  const userId = targetUserId || (await getUserId());
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_ratings')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
