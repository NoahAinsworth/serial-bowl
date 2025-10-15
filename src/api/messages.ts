import { supabase } from '@/lib/supabase';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

async function checkMutualFollow(userId: string, otherUserId: string): Promise<boolean> {
  // Check if both users follow each other (accepted follows)
  const { data: userFollows } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('following_id', otherUserId)
    .eq('status', 'accepted')
    .maybeSingle();

  const { data: otherFollows } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', otherUserId)
    .eq('following_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  return !!(userFollows && otherFollows);
}

export async function sendMessageRequest(recipientId: string, message: string) {
  const userId = await getUserId();

  const { error } = await supabase
    .from('message_requests')
    .insert({
      sender_id: userId,
      recipient_id: recipientId,
      message,
      status: 'pending',
    });

  if (error) throw error;
}

export async function acceptMessageRequest(requestId: string) {
  const userId = await getUserId();

  // Get the request
  const { data: request, error: fetchError } = await supabase
    .from('message_requests')
    .select('*')
    .eq('id', requestId)
    .eq('recipient_id', userId)
    .single();

  if (fetchError || !request) throw new Error('Request not found');

  // Update request status
  const { error: updateError } = await supabase
    .from('message_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  if (updateError) throw updateError;

  // Create the conversation
  const conversationId = await createConversationDirect(request.sender_id);

  // Send the initial message
  await sendMessage(conversationId, request.message);

  return conversationId;
}

export async function rejectMessageRequest(requestId: string) {
  const userId = await getUserId();

  const { error } = await supabase
    .from('message_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)
    .eq('recipient_id', userId);

  if (error) throw error;
}

async function createConversationDirect(otherUserId: string): Promise<string> {
  const userId = await getUserId();

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

export async function ensureConversation(otherUserId: string): Promise<string | null> {
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

  // Check if users follow each other
  const areMutualFollowers = await checkMutualFollow(userId, otherUserId);
  
  if (!areMutualFollowers) {
    // Return null to indicate a request is needed instead
    return null;
  }

  // Create new conversation (only if mutual followers)
  return await createConversationDirect(otherUserId);
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
  if (!conversationId) {
    throw new Error('Cannot share post. Users must follow each other to message.');
  }
  await sendMessage(conversationId, '', postId);
}
