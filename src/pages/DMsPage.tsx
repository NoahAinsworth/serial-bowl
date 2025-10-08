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
      .channel('dms_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dms',
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold gradient-text">Messages</h1>
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
              key={thread.otherUser.id}
              className="p-4 cursor-pointer hover:border-primary/50 transition-all card-enhanced group"
              onClick={() => navigate(`/dms/${thread.otherUser.id}`)}
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
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(thread.lastMessage.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${thread.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {thread.lastMessage.text}
                  </p>
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
