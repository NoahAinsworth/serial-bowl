import { supabase } from './supabase';

export interface CreateThoughtParams {
  body: string;
  hasSpoilers?: boolean;
  hasMature?: boolean;
}

export async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createThought(params: CreateThoughtParams) {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('posts')
    .insert([{
      author_id: userId,
      kind: 'thought',
      body: params.body,
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

  const { data, error } = await supabase
    .from('comments')
    .insert([{
      user_id: userId,
      thought_id: postId,
      text_content: body,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
