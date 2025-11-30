import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function FollowSuggestions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadSuggestions();
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

  const loadSuggestions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get users with similar watch history
      const { data: myWatched } = await supabase
        .from('watched')
        .select('content_id')
        .eq('user_id', user.id)
        .limit(50);

      const myContentIds = myWatched?.map(w => w.content_id) || [];

      if (myContentIds.length === 0) {
        // If no watch history, show popular users
        const { data: popularUsers } = await supabase
          .from('profiles')
          .select('id, handle, avatar_url, bio')
          .neq('id', user.id)
          .order('binge_points', { ascending: false })
          .limit(5);

        setSuggestions(popularUsers || []);
      } else {
        // Find users who watched similar content
        const { data: similarUsers } = await supabase
          .from('watched')
          .select('user_id, profiles!watched_user_id_fkey(id, handle, avatar_url, bio)')
          .in('content_id', myContentIds)
          .neq('user_id', user.id)
          .limit(100);

        // Count overlapping content and sort by similarity
        const userCounts = new Map<string, { count: number; profile: any }>();
        
        similarUsers?.forEach((item: any) => {
          const userId = item.user_id;
          const profile = item.profiles;
          
          if (!userCounts.has(userId)) {
            userCounts.set(userId, { count: 0, profile });
          }
          userCounts.get(userId)!.count++;
        });

        const sortedSuggestions = Array.from(userCounts.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5)
          .map(([_, data]) => data.profile);

        setSuggestions(sortedSuggestions);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId,
        });

      if (!error) {
        setFollowing(prev => new Set(prev).add(userId));
        toast.success('Following user');
      }
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
    }
  };

  if (!user || loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Suggested for you</h3>
      <div className="space-y-3">
        {suggestions.map((profile) => (
          <div key={profile.id} className="flex items-center justify-between gap-3">
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => navigate(`/user/${profile.handle}`)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>
                  {profile.handle[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{profile.handle}</p>
                {profile.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
            {!following.has(profile.id) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleFollow(profile.id)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
