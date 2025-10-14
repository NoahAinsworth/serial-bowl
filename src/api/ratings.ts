import { supabase } from '@/integrations/supabase/client';

export interface SaveRatingParams {
  contentId: string;
  percent: number;
}

export async function saveRating(params: SaveRatingParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Use the ratings table
  const { data, error } = await supabase
    .from('ratings')
    .upsert({
      user_id: user.id,
      content_id: params.contentId,
      rating: params.percent,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRating(contentId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('ratings')
    .select()
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUserRatings(userId?: string) {
  const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!targetUserId) return [];

  const { data, error } = await supabase
    .from('ratings')
    .select('*, content(*)')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
