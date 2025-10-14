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
export async function getTrending(page = 1) {
  // Trending: Sorted by likes + comments in last 48 hours
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 48);

  const [thoughts, reviews] = await Promise.all([
    supabase
      .from('thoughts')
      .select('*, profiles(*)')
      .eq('moderation_status', 'approved')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .range((page - 1) * 100, page * 100 - 1),
    supabase
      .from('reviews')
      .select('*, profiles(*)')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .range((page - 1) * 100, page * 100 - 1),
  ]);

  // Get reaction counts for each
  const thoughtIds = (thoughts.data || []).map(t => t.id);
  const reviewIds = (reviews.data || []).map(r => r.id);

  const [thoughtLikes, thoughtComments, reviewLikes] = await Promise.all([
    thoughtIds.length ? supabase.from('reactions').select('thought_id').in('thought_id', thoughtIds).eq('reaction_type', 'like') : { data: [] },
    thoughtIds.length ? supabase.from('comments').select('thought_id').in('thought_id', thoughtIds) : { data: [] },
    reviewIds.length ? supabase.from('review_likes').select('review_id').in('review_id', reviewIds) : { data: [] },
  ]);

  // Calculate scores
  const thoughtsWithScore = (thoughts.data || []).map(t => {
    const likes = (thoughtLikes.data || []).filter(l => l.thought_id === t.id).length;
    const comments = (thoughtComments.data || []).filter(c => c.thought_id === t.id).length;
    return { ...t, type: 'thought' as const, score: likes + comments };
  });

  const reviewsWithScore = (reviews.data || []).map(r => {
    const likes = (reviewLikes.data || []).filter(l => l.review_id === r.id).length;
    return { ...r, type: 'review' as const, score: likes };
  });

  const merged = [...thoughtsWithScore, ...reviewsWithScore]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return merged;
}

export async function getHotTakes(page = 1) {
  // Hot Takes: High comment-to-like ratio (controversial)
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 72);

  const [thoughts, reviews] = await Promise.all([
    supabase
      .from('thoughts')
      .select('*, profiles(*)')
      .eq('moderation_status', 'approved')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .range((page - 1) * 100, page * 100 - 1),
    supabase
      .from('reviews')
      .select('*, profiles(*)')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .range((page - 1) * 100, page * 100 - 1),
  ]);

  const thoughtIds = (thoughts.data || []).map(t => t.id);
  const reviewIds = (reviews.data || []).map(r => r.id);

  const [thoughtLikes, thoughtDislikes, thoughtComments, reviewLikes, reviewDislikes] = await Promise.all([
    thoughtIds.length ? supabase.from('reactions').select('thought_id').in('thought_id', thoughtIds).eq('reaction_type', 'like') : { data: [] },
    thoughtIds.length ? supabase.from('thought_dislikes').select('thought_id').in('thought_id', thoughtIds) : { data: [] },
    thoughtIds.length ? supabase.from('comments').select('thought_id').in('thought_id', thoughtIds) : { data: [] },
    reviewIds.length ? supabase.from('review_likes').select('review_id').in('review_id', reviewIds) : { data: [] },
    reviewIds.length ? supabase.from('review_dislikes').select('review_id').in('review_id', reviewIds) : { data: [] },
  ]);

  const thoughtsWithScore = (thoughts.data || []).map(t => {
    const likes = (thoughtLikes.data || []).filter(l => l.thought_id === t.id).length;
    const dislikes = (thoughtDislikes.data || []).filter(d => d.thought_id === t.id).length;
    const comments = (thoughtComments.data || []).filter(c => c.thought_id === t.id).length;
    const total = likes + dislikes;
    const engagement = comments + total;
    const controversy = total > 0 ? (engagement / Math.max(1, Math.abs(likes - dislikes))) : 0;
    return { ...t, type: 'thought' as const, score: controversy };
  });

  const reviewsWithScore = (reviews.data || []).map(r => {
    const likes = (reviewLikes.data || []).filter(l => l.review_id === r.id).length;
    const dislikes = (reviewDislikes.data || []).filter(d => d.review_id === r.id).length;
    const total = likes + dislikes;
    const controversy = total > 0 ? (total / Math.max(1, Math.abs(likes - dislikes))) : 0;
    return { ...r, type: 'review' as const, score: controversy };
  });

  const merged = [...thoughtsWithScore, ...reviewsWithScore]
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return merged;
}

export async function getForYou() {
  return getNew();
}
