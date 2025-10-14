import { supabase } from '@/integrations/supabase/client';

// All feeds now use the unified posts table - using raw queries to bypass type issues

export async function getFollowing() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Direct query to posts table for following feed
  const { data: follows } = await supabase
    .from('follows' as any)
    .select('following_id')
    .eq('follower_id', user.id)
    .eq('status', 'accepted');

  if (!follows || !follows.length) return [];

  const followingIds = follows.map((f: any) => f.following_id);

  const { data: posts } = await supabase
    .from('posts' as any)
    .select('*')
    .in('author_id', followingIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20);

  return posts || [];
}

export async function getNew() {
  const { data: posts } = await supabase
    .from('posts' as any)
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20);

  return posts || [];
}

export async function getTrending() {
  // Get posts from last 48 hours sorted by engagement
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 48);

  const { data: posts } = await supabase
    .from('posts' as any)
    .select('*')
    .is('deleted_at', null)
    .gte('created_at', cutoff.toISOString())
    .order('likes_count', { ascending: false })
    .limit(20);

  return posts || [];
}

export async function getHotTakes() {
  // Get controversial posts from last 72 hours
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 72);

  const { data: posts } = await supabase
    .from('posts' as any)
    .select('*')
    .is('deleted_at', null)
    .gte('created_at', cutoff.toISOString())
    .gt('dislikes_count', 0)
    .order('dislikes_count', { ascending: false })
    .limit(20);

  return posts || [];
}

export async function getForYou() {
  return getNew();
}
