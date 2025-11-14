import { supabase } from './supabase';
import { z } from 'zod';
import { replaceProfanity } from '@/utils/profanityFilter';

// Validation schemas
const postBodySchema = z.string().trim().min(1, 'Content is required').max(1000, 'Content must be less than 1000 characters');
const commentBodySchema = z.string().trim().min(1, 'Comment cannot be empty').max(500, 'Comment must be less than 500 characters');

export interface CreateThoughtParams {
  body: string;
  hasSpoilers?: boolean;
  hasMature?: boolean;
  itemType?: string;
  itemId?: string;
}

export async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createThought(params: CreateThoughtParams) {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  // Validate input
  const validatedBody = postBodySchema.parse(params.body);
  
  // Replace profanity with (BLEEP) before sending to database
  const cleanedBody = replaceProfanity(validatedBody);

  const { data, error } = await supabase
    .from('posts')
    .insert([{
      author_id: userId,
      kind: 'thought',
      body: cleanedBody,
      has_spoilers: params.hasSpoilers || false,
      has_mature: params.hasMature || false,
      item_type: params.itemType || null,
      item_id: params.itemId || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.rpc('soft_delete_post' as any, {
    p_post_id: postId
  });

  if (error) {
    console.error('Delete post error:', error);
    throw error;
  }
}

export async function react(postId: string, kind: 'like' | 'dislike') {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('post_reactions')
    .select()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // If same reaction, remove it; if different, replace it
    if (existing.kind === kind) {
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('post_reactions')
        .update({ kind })
        .eq('post_id', postId)
        .eq('user_id', userId);
    }
  } else {
    await supabase
      .from('post_reactions')
      .insert({
        post_id: postId,
        user_id: userId,
        kind,
      });
  }
}

export async function comment(postId: string, body: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  // Validate input
  const validatedBody = commentBodySchema.parse(body);
  
  // Replace profanity with (BLEEP) before sending to database
  const cleanedBody = replaceProfanity(validatedBody);

  const { data, error } = await supabase
    .from('comments')
    .insert([{
      user_id: userId,
      thought_id: postId,
      text_content: cleanedBody,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
