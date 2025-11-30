import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Search } from 'lucide-react';
import { UserSearch } from '@/components/UserSearch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DMThread {
  conversationId: string;
  otherUser: {
    id: string;
    handle: string;
    avatar_url?: string;
  };
  lastMessage: {
    text: string;
    created_at: string;
    sender_id: string;
  } | null;
  unreadCount: number;
}

export default function DMsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserSearch, setShowUserSearch] = useState(false);

  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadThreads = async () => {
    if (!user) return;

    try {
      // Get all conversations for this user
      const { data: conversations, error: convError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (convError) throw convError;
      if (!conversations || conversations.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const conversationIds = conversations.map(c => c.conversation_id);

      // Get all participants for these conversations
      const { data: participants, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds);

      if (partError) throw partError;

      // Get other users' profiles
      const otherUserIds = participants
        ?.filter(p => p.user_id !== user.id)
        .map(p => p.user_id) || [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, handle, avatar_url')
        .in('id', otherUserIds);

      if (profilesError) throw profilesError;

      // Get latest messages for each conversation
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('conversation_id, body, created_at, sender_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Build threads
      const threadsArray: DMThread[] = conversationIds.map(convId => {
        // Find other user in this conversation
        const otherParticipant = participants?.find(
          p => p.conversation_id === convId && p.user_id !== user.id
        );
        
        const otherUserProfile = profiles?.find(p => p.id === otherParticipant?.user_id);
        
        // Find latest message
        const latestMessage = messages?.find(m => m.conversation_id === convId);

        return {
          conversationId: convId,
          otherUser: otherUserProfile || { 
            id: otherParticipant?.user_id || '', 
            handle: 'Unknown', 
            avatar_url: undefined 
          },
          lastMessage: latestMessage ? {
            text: latestMessage.body || '',
            created_at: latestMessage.created_at,
            sender_id: latestMessage.sender_id || ''
          } : null,
          unreadCount: 0 // TODO: implement read tracking
        };
      });

      // Filter out threads without messages and sort by latest message
      const sortedThreads = threadsArray
        .filter(t => t.lastMessage !== null)
        .sort((a, b) => {
          if (!a.lastMessage || !b.lastMessage) return 0;
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

      setThreads(sortedThreads);
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-6 px-4">
        <p className="text-center text-muted-foreground">Please sign in to view messages</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <div className="flex justify-end mb-6">
        <Button variant="outline" size="sm" onClick={() => setShowUserSearch(true)} className="btn-glow">
          <Search className="h-4 w-4 mr-2" />
          Search Users
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : threads.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No messages yet. Start a conversation!</p>
        </Card>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {threads.map((thread) => (
            <Card
              key={thread.conversationId}
              className="p-4 cursor-pointer hover:border-primary/50 transition-all card-enhanced group"
              onClick={() => navigate(`/dm-thread/${thread.conversationId}`)}
            >
              <div className="flex gap-3">
                <div className="avatar-ring">
                  <Avatar className="h-12 w-12 flex-shrink-0 transition-transform group-hover:scale-110">
                    <AvatarImage src={thread.otherUser.avatar_url} alt={thread.otherUser.handle} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
                      {thread.otherUser.handle[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{thread.otherUser.handle}</span>
                    {thread.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(thread.lastMessage.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate ${thread.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {thread.lastMessage?.text || 'No messages yet'}
                  </p>
                  {thread.lastMessage && (
                    <div className="flex items-center gap-2 mt-1">
                      {thread.lastMessage.sender_id === user?.id && (
                        <span className="text-xs text-muted-foreground">✓ Sent</span>
                      )}
                    </div>
                  )}
                </div>
                {thread.unreadCount > 0 && (
                  <div className="relative flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50"></div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Search Users to Message</DialogTitle>
          </DialogHeader>
          <UserSearch showMessageButton={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
