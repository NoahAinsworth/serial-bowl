import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface DMThread {
  otherUser: {
    id: string;
    handle: string;
    avatar_url?: string;
  };
  lastMessage: {
    text: string;
    created_at: string;
    read: boolean;
  };
  unreadCount: number;
}

export default function DMsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user]);

  const loadThreads = async () => {
    if (!user) return;

    const { data: dms, error } = await supabase
      .from('dms')
      .select(`
        id,
        sender_id,
        recipient_id,
        text_content,
        read,
        created_at,
        sender:profiles!dms_sender_id_fkey(id, handle, avatar_url),
        recipient:profiles!dms_recipient_id_fkey(id, handle, avatar_url)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && dms) {
      // Group by conversation partner
      const threadsMap = new Map<string, DMThread>();
      
      dms.forEach((dm: any) => {
        const isReceived = dm.recipient_id === user.id;
        const otherUser = isReceived ? dm.sender : dm.recipient;
        
        if (!threadsMap.has(otherUser.id)) {
          threadsMap.set(otherUser.id, {
            otherUser,
            lastMessage: {
              text: dm.text_content,
              created_at: dm.created_at,
              read: dm.read,
            },
            unreadCount: isReceived && !dm.read ? 1 : 0,
          });
        } else {
          const thread = threadsMap.get(otherUser.id)!;
          if (isReceived && !dm.read) {
            thread.unreadCount++;
          }
        }
      });
      
      setThreads(Array.from(threadsMap.values()));
    }
    
    setLoading(false);
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
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      
      {loading ? (
        <p className="text-center text-muted-foreground">Loading...</p>
      ) : threads.length === 0 ? (
        <p className="text-center text-muted-foreground">No messages yet</p>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Card
              key={thread.otherUser.id}
              className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/dms/${thread.otherUser.id}`)}
            >
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0">
                  {thread.otherUser.handle[1]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{thread.otherUser.handle}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(thread.lastMessage.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${thread.unreadCount > 0 ? 'font-semibold' : 'text-muted-foreground'}`}>
                    {thread.lastMessage.text}
                  </p>
                </div>
                {thread.unreadCount > 0 && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs text-white font-bold">
                    {thread.unreadCount}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
