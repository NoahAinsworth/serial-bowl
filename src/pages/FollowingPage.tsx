import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Following {
  id: string;
  following: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
}

export default function FollowingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadFollowing();
  }, [user, navigate]);

  const loadFollowing = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          id,
          following:profiles!follows_following_id_fkey(id, handle, avatar_url)
        `)
        .eq('follower_id', user.id);

      if (error) throw error;
      setFollowing(data || []);
    } catch (error) {
      console.error('Error loading following:', error);
      toast.error('Failed to load following');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (handle: string) => {
    navigate(`/user/${handle}`);
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/profile')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>

      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="gradient-text">Following</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : following.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Not following anyone yet
            </div>
          ) : (
            <div className="space-y-2">
              {following.map(({ id, following: followingUser }) => (
                <div
                  key={id}
                  onClick={() => handleUserClick(followingUser.handle)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <Avatar className="w-12 h-12 avatar-ring">
                    <AvatarImage src={followingUser.avatar_url || undefined} />
                    <AvatarFallback>
                      {followingUser.handle.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{followingUser.handle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
