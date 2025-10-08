import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string;
  text_content: string;
  created_at: string;
  read: boolean;
}

export default function DMThreadPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<{ handle: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && userId) {
      loadMessages();
      loadOtherUser();
      markAsRead();
      
      // Set up realtime subscription for new messages
      const channel = supabase
        .channel(`dm-thread-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'dms',
          },
          (payload) => {
            const newMsg = payload.new as Message;
            // Only add if it's part of this conversation
            if (
              (newMsg.sender_id === userId && newMsg.recipient_id === user.id) ||
              (newMsg.sender_id === user.id && newMsg.recipient_id === userId)
            ) {
              setMessages(prev => [...prev, newMsg]);
              if (newMsg.sender_id === userId) {
                markAsRead();
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadOtherUser = async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('handle')
      .eq('id', userId)
      .single();
    
    if (data) {
      setOtherUser(data);
    }
  };

  const loadMessages = async () => {
    if (!user || !userId) return;

    const { data, error } = await supabase
      .from('dms')
      .select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const markAsRead = async () => {
    if (!user || !userId) return;

    await supabase
      .from('dms')
      .update({ read: true })
      .eq('sender_id', userId)
      .eq('recipient_id', user.id)
      .eq('read', false);
  };

  const handleSend = async () => {
    if (!user || !userId || !newMessage.trim()) return;

    const optimisticMessage = {
      id: 'temp-' + Date.now(),
      sender_id: user.id,
      recipient_id: userId,
      text_content: newMessage.trim(),
      created_at: new Date().toISOString(),
      read: false,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    const { error } = await supabase
      .from('dms')
      .insert({
        sender_id: user.id,
        recipient_id: userId,
        text_content: optimisticMessage.text_content,
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
        <h1 
          className="text-2xl font-bold mb-4 cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate(`/user/${otherUser.handle}`)}
        >
          {otherUser.handle}
        </h1>
      )}
      
      <Card className="flex-1 p-4 mb-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => {
            const isSent = message.sender_id === user.id;
            return (
              <div
                key={message.id}
                className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-scale-in`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isSent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="break-words">{message.text_content}</p>
                  <p className={`text-xs mt-1 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
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
