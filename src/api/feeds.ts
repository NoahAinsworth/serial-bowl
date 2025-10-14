import { supabase } from '@/integrations/supabase/client';

// Use existing hooks/useFeed structure for now
// This will be integrated with the existing feed system

export async function getFollowing(page = 1) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get users I follow
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
    .eq('status', 'accepted');

  if (!follows || !follows.length) return [];

  const followingIds = follows.map(f => f.following_id);

  // Get their thoughts and reviews
  const [thoughts, reviews] = await Promise.all([
    supabase
      .from('thoughts')
      .select('*, profiles(*)')
      .in('user_id', followingIds)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .range((page - 1) * 20, page * 20 - 1),
    supabase
      .from('reviews')
      .select('*, profiles(*)')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .range((page - 1) * 20, page * 20 - 1),
  ]);

  // Merge and sort by created_at
  const merged = [
    ...(thoughts.data || []).map(t => ({ ...t, type: 'thought' as const })),
    ...(reviews.data || []).map(r => ({ ...r, type: 'review' as const })),
  ].sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

  return merged.slice(0, 20);
}

export async function getNew(page = 1) {
  const [thoughts, reviews] = await Promise.all([
    supabase
      .from('thoughts')
      .select('*, profiles(*)')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .range((page - 1) * 20, page * 20 - 1),
    supabase
      .from('reviews')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .range((page - 1) * 20, page * 20 - 1),
  ]);

  const merged = [
    ...(thoughts.data || []).map(t => ({ ...t, type: 'thought' as const })),
    ...(reviews.data || []).map(r => ({ ...r, type: 'review' as const })),
  ].sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

  return merged.slice(0, 20);
}

// For now, these will fall back to the existing feed
export async function getTrending() {
  return getNew();
}

export async function getHotTakes() {
  return getNew();
}

export async function getForYou() {
  return getNew();
}
