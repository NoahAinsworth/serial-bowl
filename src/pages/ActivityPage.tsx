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

    // Fetch comment replies from notifications table
    const { data: commentReplies } = await supabase
      .from('notifications')
      .select(`
        id,
        created_at,
        read,
        actor:actor_id (
          id,
          handle,
          avatar_url
        ),
        comment:comment_id (
          id,
          text_content,
          post_id
        ),
        post:post_id (
          id
        )
      `)
      .eq('user_id', user.id)
      .eq('type', 'comment_reply')
      .order('created_at', { ascending: false })
      .limit(30);

    // Fetch post reactions - first get user's post IDs
    const { data: userPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', user.id);

    const postIds = userPosts?.map(p => p.id) || [];

    const { data: postReactions } = await supabase
      .from('post_reactions')
      .select(`
        post_id,
        user_id,
        kind,
        created_at,
        profiles!post_reactions_user_id_fkey (
          id,
          handle,
          avatar_url
        )
      `)
      .neq('user_id', user.id)
      .in('post_id', postIds)
      .order('created_at', { ascending: false })
      .limit(30);

    // Fetch new followers
    const { data: newFollowers } = await supabase
      .from('follows')
      .select(`
        follower_id,
        created_at,
        profiles!follows_follower_id_fkey (
          id,
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
      ...(commentReplies?.map((n: any) => ({
        id: n.id,
        type: 'comment_reply',
        user: n.actor,
        comment: n.comment,
        postId: n.post?.id,
        createdAt: n.created_at,
        read: n.read,
      })) || []),
      ...(postReactions?.map((r: any) => ({
        id: `reaction-${r.post_id}-${r.user_id}`,
        type: r.kind === 'like' ? 'like' : 'dislike',
        user: r.profiles,
        postId: r.post_id,
        createdAt: r.created_at,
      })) || []),
      ...(newFollowers?.map((f: any) => ({
        id: `follow-${f.follower_id}`,
        type: 'follow',
        user: f.profiles,
        createdAt: f.created_at,
      })) || [])
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setNotifications(allNotifications);
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-primary fill-primary" />;
      case 'dislike':
        return <ThumbsDown className="h-5 w-5 text-destructive" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-secondary" />;
      case 'comment_reply':
        return <Heart className="h-5 w-5 text-accent" />;
      default:
        return null;
    }
  };

  const getMessage = (notif: any) => {
    const handle = notif.user?.handle?.startsWith('@') 
      ? notif.user.handle 
      : `@${notif.user?.handle || 'someone'}`;

    switch (notif.type) {
      case 'like':
        return (
          <>
            <a 
              href={`/profile/${notif.user?.id}`}
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/profile/${notif.user?.id}`);
              }}
            >
              {handle}
            </a>
            {' liked your post'}
          </>
        );
      case 'dislike':
        return (
          <>
            <a 
              href={`/profile/${notif.user?.id}`}
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/profile/${notif.user?.id}`);
              }}
            >
              {handle}
            </a>
            {' disliked your post'}
          </>
        );
      case 'follow':
        return (
          <>
            <a 
              href={`/profile/${notif.user?.id}`}
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/profile/${notif.user?.id}`);
              }}
            >
              {handle}
            </a>
            {' started following you'}
          </>
        );
      case 'comment_reply':
        return (
          <>
            <a 
              href={`/profile/${notif.user?.id}`}
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/profile/${notif.user?.id}`);
              }}
            >
              {handle}
            </a>
            {' replied to your comment'}
          </>
        );
      default:
        return 'New notification';
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
                  <AvatarImage src={notif.user?.avatar_url} />
                  <AvatarFallback>{notif.user?.handle?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getIcon(notif.type)}
                    <p className="text-sm">{getMessage(notif)}</p>
                  </div>
                  {notif.comment && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      "{notif.comment.text_content}"
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
