import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Send, Pencil, Clock, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DMReactions } from '@/components/DMReactions';
import { EditDMDialog } from '@/components/EditDMDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Message {
  id: string;
  sender_id: string;
  body: string;
  post_id?: string;
  created_at: string;
  edited_at?: string | null;
}

export default function DMThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<{ id: string; handle: string; avatar_url: string | null } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && conversationId) {
      loadMessages();
      loadOtherUser();
      
      // Set up realtime subscription for new messages
      const channel = supabase
        .channel(`conversation-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as Message;
              setMessages(prev => [...prev, newMsg]);
            } else if (payload.eventType === 'UPDATE') {
              const updatedMsg = payload.new as Message;
              setMessages(prev => 
                prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg)
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadOtherUser = async () => {
    if (!conversationId || !user) return;
    
    // Get other participant in this conversation
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId);
    
    if (!participants) return;
    
    const otherUserId = participants.find(p => p.user_id !== user.id)?.user_id;
    if (!otherUserId) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, handle, avatar_url')
      .eq('id', otherUserId)
      .maybeSingle();
    
    if (data) {
      setOtherUser(data);
    }
  };

  const loadMessages = async () => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleSend = async () => {
    if (!user || !conversationId || !newMessage.trim()) return;

    const optimisticMessage = {
      id: 'temp-' + Date.now(),
      sender_id: user.id,
      body: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: newMessage.trim(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
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
    <div className="container max-w-2xl mx-auto py-6 px-4 flex flex-col h-[calc(100vh-200px)] animate-fade-in">
      {otherUser && (
        <div 
          className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate(`/user/${otherUser.handle}`)}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser.avatar_url || ''} alt={otherUser.handle} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
              {otherUser.handle[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">
            {otherUser.handle}
          </h1>
        </div>
      )}
      
      <Card className="flex-1 p-4 mb-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const isSent = message.sender_id === user.id;
            const isLastMessage = index === messages.length - 1;
            return (
              <div
                key={message.id}
                className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-scale-in`}
              >
                <div className="flex flex-col">
                  <div className="relative group">
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isSent
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.post_id && (
                        <div className="mb-2 p-2 bg-background/20 rounded border border-border/50">
                          <p className="text-xs opacity-80">Shared a post</p>
                        </div>
                      )}
                      {message.body && (
                        <div>
                          <p className="break-words">{message.body}</p>
                          {message.edited_at && (
                            <p className={`text-xs mt-1 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              <Clock className="h-3 w-3 inline mr-1" />
                              Edited
                            </p>
                          )}
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button onClick={handleSend} disabled={!newMessage.trim()} className="btn-glow">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
