import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Loader2, Heart, MessageCircle, Repeat2, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    // Get reactions to user's thoughts
    const { data: reactions } = await supabase
      .from('reactions')
      .select(`
        id,
        reaction_type,
        created_at,
        user_id,
        thought_id,
        profiles!reactions_user_id_fkey (
          handle
        ),
        thoughts!inner (
          user_id,
          text_content
        )
      `)
      .eq('thoughts.user_id', user.id)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get comments on user's thoughts
    const { data: comments } = await supabase
      .from('comments')
      .select(`
        id,
        created_at,
        user_id,
        thought_id,
        text_content,
        profiles!comments_user_id_fkey (
          handle
        ),
        thoughts!inner (
          user_id,
          text_content
        )
      `)
      .eq('thoughts.user_id', user.id)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get new followers
    const { data: follows } = await supabase
      .from('follows')
      .select(`
        id,
        created_at,
        follower_id,
        profiles!follows_follower_id_fkey (
          handle
        )
      `)
      .eq('following_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Combine and sort all notifications
    const allNotifications = [
      ...(reactions?.map((r: any) => ({
        id: `reaction-${r.id}`,
        type: r.reaction_type,
        user: r.profiles?.handle || 'Unknown',
        thought: r.thoughts?.text_content || '',
        thoughtId: r.thought_id,
        createdAt: r.created_at,
      })) || []),
      ...(comments?.map((c: any) => ({
        id: `comment-${c.id}`,
        type: 'comment',
        user: c.profiles?.handle || 'Unknown',
        thought: c.thoughts?.text_content || '',
        thoughtId: c.thought_id,
        comment: c.text_content,
        createdAt: c.created_at,
      })) || []),
      ...(follows?.map((f: any) => ({
        id: `follow-${f.id}`,
        type: 'follow',
        user: f.profiles?.handle || 'Unknown',
        createdAt: f.created_at,
      })) || []),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setNotifications(allNotifications);
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'rethink':
        return <Repeat2 className="h-5 w-5 text-green-500" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-primary" />;
      default:
        return null;
    }
  };

  const getMessage = (notif: any) => {
    const userLink = (
      <span 
        className="font-semibold cursor-pointer hover:text-primary transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/user/${notif.user}`);
        }}
      >
        @{notif.user}
      </span>
    );

    switch (notif.type) {
      case 'like':
        return <>{userLink} liked your thought</>;
      case 'dislike':
        return <>{userLink} reacted to your thought</>;
      case 'comment':
        return <>{userLink} commented: "{notif.comment}"</>;
      case 'rethink':
        return <>{userLink} rethought your thought</>;
      case 'follow':
        return <>{userLink} started following you</>;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6 neon-glow">Activity</h1>
      
      {!user ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Sign in to see your notifications</p>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No notifications yet. Start engaging with the community!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className="p-4 cursor-pointer hover:border-primary/50 transition-all hover-scale"
              onClick={() => notif.thoughtId && navigate('/')}
            >
              <div className="flex gap-3 items-start">
                <div className="mt-1">{getIcon(notif.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{getMessage(notif)}</p>
                  {notif.thought && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      "{notif.thought}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
