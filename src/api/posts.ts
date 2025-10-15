import { supabase, getUserId } from './supabase';

export interface CreateThoughtParams {
  body: string;
  hasSpoilers?: boolean;
  hasMature?: boolean;
}

export interface CreateReviewParams {
  itemType: 'show' | 'season' | 'episode';
  itemId: number;
  ratingPercent: number;
  body?: string;
  hasSpoilers?: boolean;
  hasMature?: boolean;
}

export async function createThought(params: CreateThoughtParams) {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('posts')
    .insert([{
      author_id: userId,
      kind: 'thought' as any,
      body: params.body,
      has_spoilers: params.hasSpoilers || false,
      has_mature: params.hasMature || false,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createReview(params: CreateReviewParams) {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('posts')
    .insert([{
      author_id: userId,
      kind: 'review' as any,
      item_type: params.itemType,
      item_id: String(params.itemId),
      rating_percent: params.ratingPercent,
      body: params.body || null,
      has_spoilers: params.hasSpoilers || false,
      has_mature: params.hasMature || false,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(postId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  // Soft delete
  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('author_id', userId);

  if (error) throw error;
}

export async function react(postId: string, kind: 'like' | 'dislike') {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  // Check if reaction exists
  const { data: existing } = await supabase
    .from('post_reactions')
    .select()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('kind', kind)
    .maybeSingle();

  if (existing) {
    // Remove reaction
    const { error } = await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('kind', kind);

    if (error) throw error;
  } else {
    // Add reaction
    const { error } = await supabase
      .from('post_reactions')
      .insert({
        post_id: postId,
        user_id: userId,
        kind,
      });

    if (error) throw error;
  }
}

export async function comment(postId: string, body: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  // Comments table still uses thought_id from old schema
  // We'll insert using the thought_id column for backwards compatibility
  const { data: commentData, error: commentError } = await supabase
    .from('comments')
    .select()
    .limit(0);
  
  // Check if comments table has post_id or thought_id
  const hasPostId = commentData !== null;
  
  const insertData: any = {
    user_id: userId,
    body,
  };
  
  // Use thought_id if that's what the table has
  insertData.thought_id = postId;

  const { data, error } = await supabase
    .from('comments')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;

  return data;
}
