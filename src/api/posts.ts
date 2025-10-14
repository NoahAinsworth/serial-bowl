import { supabase } from '@/integrations/supabase/client';

export interface CreateThoughtParams {
  contentId?: string;
  body: string;
  hasSpoilers?: boolean;
  hasMature?: boolean;
}

export interface CreateReviewParams {
  contentId: string;
  body: string;
  ratingPercent: number;
  hasSpoilers?: boolean;
  hasMature?: boolean;
}

export async function createThought(params: CreateThoughtParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('thoughts')
    .insert({
      user_id: user.id,
      text_content: params.body,
      content_id: params.contentId || null,
      is_spoiler: params.hasSpoilers || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createReview(params: CreateReviewParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      user_id: user.id,
      review_text: params.body,
      content_id: params.contentId,
      rating: params.ratingPercent,
      is_spoiler: params.hasSpoilers || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteThought(thoughtId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('thoughts')
    .delete()
    .eq('id', thoughtId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteReview(reviewId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function toggleReaction(thoughtId: string, reactionType: 'like' | 'dislike') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if reaction exists
  const { data: existing } = await supabase
    .from('reactions')
    .select()
    .eq('thought_id', thoughtId)
    .eq('user_id', user.id)
    .eq('reaction_type', reactionType)
    .maybeSingle();

  if (existing) {
    // Remove reaction
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    // Add reaction
    const { error } = await supabase
      .from('reactions')
      .insert({
        thought_id: thoughtId,
        user_id: user.id,
        reaction_type: reactionType,
      });

    if (error) throw error;
  }
}

export async function addComment(thoughtId: string, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('comments')
    .insert({
      thought_id: thoughtId,
      user_id: user.id,
      text_content: body,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
