import { supabase } from "@/integrations/supabase/client";

export interface CreateThoughtParams {
  itemType?: 'show' | 'season' | 'episode';
  itemId?: string;
  item_type?: 'show' | 'season' | 'episode';
  item_id?: string;
  body: string;
  is_spoiler?: boolean;
  hasSpoilers?: boolean;
  hasMature?: boolean;
}

export interface CreateReviewParams {
  itemType?: 'show' | 'season' | 'episode';
  itemId?: string;
  item_type?: 'show' | 'season' | 'episode';
  item_id?: string;
  body?: string;
  rating_percent?: number;
  ratingPercent?: number;
  is_spoiler?: boolean;
  hasSpoilers?: boolean;
  hasMature?: boolean;
}

/**
 * Create a thought post
 */
export async function createThought(params: CreateThoughtParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      kind: 'thought',
      body: params.body,
      item_type: params.item_type || params.itemType,
      item_id: params.item_id || params.itemId,
      is_spoiler: params.is_spoiler || params.hasSpoilers || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a review post with rating
 * The DB trigger will automatically sync rating_percent to user_ratings
 */
export async function createReview(params: CreateReviewParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      kind: 'review',
      body: params.body,
      item_type: params.item_type || params.itemType,
      item_id: params.item_id || params.itemId,
      rating_percent: params.rating_percent || params.ratingPercent,
      is_spoiler: params.is_spoiler || params.hasSpoilers || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft delete a post (sets deleted_at timestamp)
 */
export async function deletePost(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('author_id', user.id);

  if (error) throw error;
}

/**
 * React to a post (like/dislike)
 */
export async function react(postId: string, kind: 'like' | 'dislike') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('post_reactions')
    .upsert({
      user_id: user.id,
      post_id: postId,
      kind,
    }, {
      onConflict: 'user_id,post_id'
    });

  if (error) throw error;
}

/**
 * Remove a reaction from a post
 */
export async function removeReaction(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', postId);

  if (error) throw error;
}

/**
 * React to a post (wrapper for easier component usage)
 */
export async function reactToPost(postId: string, reaction: 'like' | 'dislike' | undefined) {
  if (reaction) {
    await react(postId, reaction);
  } else {
    await removeReaction(postId);
  }
}

/**
 * Add a comment to a post
 */
export async function comment(postId: string, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Note: Current schema has thought_id, need to check if comments are for posts or thoughts
  // Adapting to use thought_id as post_id based on schema
  const { data, error } = await supabase
    .from('comments')
    .insert({
      user_id: user.id,
      thought_id: postId,
      text_content: body,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
