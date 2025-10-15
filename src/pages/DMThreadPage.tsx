import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Send, Pencil, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DMReactions } from '@/components/DMReactions';
import { EditDMDialog } from '@/components/EditDMDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string;
  text_content: string;
  post_id?: string;
  created_at: string;
  read: boolean;
  edited_at?: string | null;
}

export default function DMThreadPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<{ handle: string; avatar_url: string | null } | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [editHistories, setEditHistories] = useState<Record<string, any[]>>({});
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
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'dms',
          },
          (payload) => {
            const updatedMsg = payload.new as Message;
            setMessages(prev => 
              prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg)
            );
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
      .select('handle, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    
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

  const loadEditHistory = async (dmId: string) => {
    if (editHistories[dmId]) return;
    
    const { data } = await supabase
      .from('dm_edit_history')
      .select('*')
      .eq('dm_id', dmId)
      .order('edited_at', { ascending: false });
    
    if (data) {
      setEditHistories(prev => ({ ...prev, [dmId]: data }));
    }
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
                      {message.text_content && (
                        <div>
                          <p className="break-words">{message.text_content}</p>
                          {message.edited_at && (
                            <Collapsible 
                              open={expandedHistory === message.id} 
                              onOpenChange={(open) => {
                                setExpandedHistory(open ? message.id : null);
                                if (open) loadEditHistory(message.id);
                              }}
                            >
                              <CollapsibleTrigger className={`text-xs mt-1 hover:underline cursor-pointer flex items-center gap-1 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                <Clock className="h-3 w-3" />
                                Edited
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2">
                                <div className={`space-y-2 pl-3 border-l-2 ${isSent ? 'border-primary-foreground/20' : 'border-border'}`}>
                                  {editHistories[message.id]?.map((edit) => (
                                    <div key={edit.id} className="text-sm">
                                      <div className={`text-xs mb-1 ${isSent ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                        {new Date(edit.edited_at).toLocaleString()}
                                      </div>
                                      <div className={`whitespace-pre-wrap ${isSent ? 'text-primary-foreground/80' : 'opacity-80'}`}>{edit.previous_text_content}</div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {isSent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => {
                          setEditingMessage(message);
                          setShowEditDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Emoji reactions */}
                  <DMReactions 
                    dmId={message.id} 
                    senderId={message.sender_id}
                    recipientId={message.recipient_id || userId || ''}
                  />
                  
                  {isSent && isLastMessage && (
                    <span className={`text-xs mt-1 ${isSent ? 'text-right text-muted-foreground' : ''}`}>
                      {message.read ? '✓ Read' : '✓ Sent'}
                    </span>
                  )}
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

      {editingMessage && (
        <EditDMDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          dm={editingMessage}
          onSuccess={loadMessages}
        />
      )}
    </div>
  );
}
