import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Heart, ThumbsDown, UserPlus } from 'lucide-react';
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

    // Get reactions (likes/dislikes) to user's posts
    const { data: postReactions } = await supabase
      .from('post_reactions')
      .select(`
        created_at,
        kind,
        user_id,
        post_id,
        profiles!post_reactions_user_id_fkey (
          handle,
          avatar_url
        ),
        posts!inner (
          author_id,
          body,
          kind
        )
      `)
      .eq('posts.author_id', user.id)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    // Get new followers
    const { data: follows } = await supabase
      .from('follows')
      .select(`
        id,
        created_at,
        follower_id,
        status,
        profiles!follows_follower_id_fkey (
          handle,
          avatar_url
        )
      `)
      .eq('following_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(30);

    // Combine and sort all notifications
    const allNotifications = [
      ...(postReactions?.map((r: any) => ({
        id: `reaction-${r.post_id}-${r.user_id}`,
        type: r.kind,
        user: r.profiles?.handle || 'Unknown',
        avatarUrl: r.profiles?.avatar_url,
        postId: r.post_id,
        postBody: r.posts?.body || '',
        postKind: r.posts?.kind || '',
        createdAt: r.created_at,
      })) || []),
      ...(follows?.map((f: any) => ({
        id: `follow-${f.id}`,
        type: 'follow',
        user: f.profiles?.handle || 'Unknown',
        avatarUrl: f.profiles?.avatar_url,
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
      case 'dislike':
        return <ThumbsDown className="h-5 w-5 text-muted-foreground" />;
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
        {notif.user}
      </span>
    );

    switch (notif.type) {
      case 'like':
        return <>{userLink} liked your {notif.postKind || 'post'}</>;
      case 'dislike':
        return <>{userLink} disliked your {notif.postKind || 'post'}</>;
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
              onClick={() => {
                if (notif.postId) {
                  navigate(`/post/${notif.postId}`);
                } else if (notif.type === 'follow') {
                  navigate(`/user/${notif.user}`);
                }
              }}
            >
              <div className="flex gap-3 items-start">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={notif.avatarUrl} />
                  <AvatarFallback>{notif.user[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getIcon(notif.type)}
                    <p className="text-sm">{getMessage(notif)}</p>
                  </div>
                  {notif.postBody && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      "{notif.postBody}"
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
