import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Follower {
  id: string;
  follower: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
}

export default function FollowersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadFollowers();
  }, [user, navigate]);

  const loadFollowers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          id,
          follower:profiles!follows_follower_id_fkey(id, handle, avatar_url)
        `)
        .eq('following_id', user.id);

      if (error) throw error;
      setFollowers(data || []);
    } catch (error) {
      console.error('Error loading followers:', error);
      toast.error('Failed to load followers');
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
          <CardTitle className="gradient-text">Followers</CardTitle>
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
          ) : followers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No followers yet
            </div>
          ) : (
            <div className="space-y-2">
              {followers.map(({ id, follower }) => (
                <div
                  key={id}
                  onClick={() => handleUserClick(follower.handle)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <Avatar className="w-12 h-12 avatar-ring">
                    <AvatarImage src={follower.avatar_url || undefined} />
                    <AvatarFallback>
                      {follower.handle.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{follower.handle}</p>
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
