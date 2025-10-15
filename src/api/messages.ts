import { supabase } from '@/lib/supabase';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function ensureConversation(otherUserId: string): Promise<string> {
  const userId = await getUserId();

  // Check if conversation exists
  const { data: existing } = await supabase
    .from('conversations')
    .select(`
      id,
      conversation_participants!inner(user_id)
    `)
    .eq('is_group', false);

  if (existing) {
    for (const conv of existing) {
      const participants = (conv as any).conversation_participants;
      const userIds = participants.map((p: any) => p.user_id);
      if (userIds.includes(userId) && userIds.includes(otherUserId) && userIds.length === 2) {
        return conv.id;
      }
    }
  }

  // Create new conversation
  const { data: newConv, error: convError } = await supabase
    .from('conversations')
    .insert({ is_group: false })
    .select('id')
    .single();

  if (convError || !newConv) throw new Error('Failed to create conversation');

  // Add participants
  await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: newConv.id, user_id: userId },
      { conversation_id: newConv.id, user_id: otherUserId },
    ]);

  return newConv.id;
}

export async function sendMessage(conversationId: string, body: string, postId?: string) {
  const userId = await getUserId();

  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body,
      post_id: postId || null,
    });

  if (error) throw error;
}

export async function sharePost(postId: string, otherUserId: string) {
  const conversationId = await ensureConversation(otherUserId);
  await sendMessage(conversationId, '', postId);
}
