import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import { FollowRequestButton } from '@/components/FollowRequestButton';

interface Following {
  id: string;
  following_id: string;
  status: string;
  following: {
    id: string;
    handle: string;
    avatar_url: string | null;
    is_private: boolean;
  };
}

export default function FollowingPage() {
  const navigate = useNavigate();
  const { userId: handleParam } = useParams();
  const { user } = useAuth();
  const [following, setFollowing] = useState<Following[]>([]);
  const [filteredFollowing, setFilteredFollowing] = useState<Following[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [profileHandle, setProfileHandle] = useState<string>('');

  useEffect(() => {
    const loadUserAndFollowing = async () => {
      if (handleParam) {
        // Load user by handle
        const { data } = await supabase
          .from('profiles')
          .select('id, handle')
          .eq('handle', handleParam)
          .single();
        
        if (data) {
          setTargetUserId(data.id);
          setProfileHandle(data.handle);
          loadFollowing(data.id);
        }
      } else if (user) {
        setTargetUserId(user.id);
        loadFollowing(user.id);
      }
    };
    
    loadUserAndFollowing();
  }, [handleParam, user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = following.filter(f =>
        f.following.handle.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFollowing(filtered);
    } else {
      setFilteredFollowing(following);
    }
  }, [searchQuery, following]);

  const loadFollowing = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          id,
          following_id,
          status,
          following:profiles!follows_following_id_fkey(id, handle, avatar_url, is_private)
        `)
        .eq('follower_id', targetUserId);

      if (error) throw error;
      setFollowing(data || []);
      setFilteredFollowing(data || []);
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
        onClick={() => navigate(handleParam ? `/user/${handleParam}` : '/profile')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>

      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="gradient-text">Following</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search following..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

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
          ) : filteredFollowing.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No users found' : 'Not following anyone yet'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFollowing.map(({ id, following: followingUser, following_id, status }) => (
                <div
                  key={id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigate(`/user/${followingUser.handle}`)}
                  >
                    <Avatar className="w-12 h-12 avatar-ring">
                      <AvatarImage src={followingUser.avatar_url || undefined} />
                      <AvatarFallback>
                        {followingUser.handle.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{followingUser.handle}</p>
                        {status === 'pending' && (
                          <Badge variant="outline" className="text-xs">Pending</Badge>
                        )}
                      </div>
                      {followingUser.is_private && (
                        <Badge variant="outline" className="text-xs">Private</Badge>
                      )}
                    </div>
                  </div>
                  {user && targetUserId && user.id === targetUserId && (
                    <FollowRequestButton
                      targetUserId={following_id}
                      isPrivate={followingUser.is_private}
                      initialFollowStatus={status as 'pending' | 'accepted'}
                      onStatusChange={() => targetUserId && loadFollowing(targetUserId)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
