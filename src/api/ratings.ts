import { supabase } from './supabase';

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
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
