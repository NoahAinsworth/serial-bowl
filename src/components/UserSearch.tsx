import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserSearchProps {
  query: string;
}

export function UserSearch({ query }: UserSearchProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [query]);

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
      .select('id, handle, bio')
      .ilike('handle', `%${query}%`)
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

  if (!query.trim()) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Search for users by handle
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No users found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((profile) => (
        <Card key={profile.id} className="p-4">
          <div className="flex items-center justify-between">
            <div
              className="flex-1 cursor-pointer"
              onClick={() => navigate(`/user/${profile.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                  {profile.handle[1]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold">{profile.handle}</h3>
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {user && user.id !== profile.id && (
              <Button
                variant={following.has(profile.id) ? 'outline' : 'default'}
                size="sm"
                onClick={() => handleFollow(profile.id)}
                className="btn-glow"
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
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
