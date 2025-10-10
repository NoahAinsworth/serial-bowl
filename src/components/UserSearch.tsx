import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, UserMinus, Loader2, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserSearchProps {
  showMessageButton?: boolean;
}

export function UserSearch({ showMessageButton = false }: UserSearchProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      loadFollowing();
    }
  }, [user]);

  const loadFollowing = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (data) {
      setFollowing(new Set(data.map(f => f.following_id)));
    }
  };

  const searchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, handle, bio, avatar_url')
      .ilike('handle', `%${searchQuery}%`)
      .limit(20);

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    const isFollowing = following.has(userId);

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (!error) {
        setFollowing(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        toast({ title: "Unfollowed" });
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId,
        });

      if (!error) {
        setFollowing(prev => new Set(prev).add(userId));
        toast({ title: "Following" });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleMessage = (userId: string) => {
    navigate(`/dms/${userId}`);
  };

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Search users by handle..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />

      {searchQuery.trim() && users.length === 0 && !loading && (
        <div className="text-center text-muted-foreground py-8">
          No users found
        </div>
      )}

      {!searchQuery.trim() && (
        <div className="text-center text-muted-foreground py-8">
          Search for users by handle
        </div>
      )}

      <div className="space-y-3">
        {users.map((profile) => (
          <Card key={profile.id} className="p-4 group">
            <div className="flex items-center justify-between gap-3">
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => navigate(`/user/${profile.handle}`)}
              >
                <div className="profile-ring">
                  <Avatar className="h-12 w-12 transition-transform active:scale-95">
                    <AvatarImage src={profile.avatar_url} alt={profile.handle} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
                      {profile.handle[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">@{profile.handle}</h3>
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
              {user && user.id !== profile.id && (
                <div className="flex gap-2">
                  {showMessageButton && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMessage(profile.id)}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant={following.has(profile.id) ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleFollow(profile.id)}
                  >
                    {following.has(profile.id) ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-1" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
