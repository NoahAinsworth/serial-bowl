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

interface Follower {
  id: string;
  follower_id: string;
  status: string;
  follower: {
    id: string;
    handle: string;
    avatar_url: string | null;
    is_private: boolean;
  };
}

export default function FollowersPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user } = useAuth();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [filteredFollowers, setFilteredFollowers] = useState<Follower[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [followStatuses, setFollowStatuses] = useState<Record<string, 'none' | 'pending' | 'accepted'>>({});

  useEffect(() => {
    const targetUserId = userId || user?.id;
    if (targetUserId) {
      loadFollowers(targetUserId);
      if (user) loadFollowStatuses();
    }
  }, [userId, user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = followers.filter(f =>
        f.follower.handle.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFollowers(filtered);
    } else {
      setFilteredFollowers(followers);
    }
  }, [searchQuery, followers]);

  const loadFollowers = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          id,
          follower_id,
          status,
          follower:profiles!follows_follower_id_fkey(id, handle, avatar_url, is_private)
        `)
        .eq('following_id', targetUserId)
        .eq('status', 'accepted');

      if (error) throw error;
      setFollowers(data || []);
      setFilteredFollowers(data || []);
    } catch (error) {
      console.error('Error loading followers:', error);
      toast.error('Failed to load followers');
    } finally {
      setLoading(false);
    }
  };

  const loadFollowStatuses = async () => {
    if (!user) return;

    const followerIds = followers.map(f => f.follower_id);
    if (followerIds.length === 0) return;

    const { data } = await supabase
      .from('follows')
      .select('following_id, status')
      .eq('follower_id', user.id)
      .in('following_id', followerIds);

    if (data) {
      const statuses: Record<string, 'none' | 'pending' | 'accepted'> = {};
      data.forEach(follow => {
        statuses[follow.following_id] = follow.status as 'pending' | 'accepted';
      });
      setFollowStatuses(statuses);
    }
  };

  const handleUserClick = (handle: string) => {
    navigate(`/user/${handle}`);
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate(userId ? `/user/${userId}` : '/profile')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>

      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="gradient-text">Followers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search followers..."
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
          ) : filteredFollowers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No followers found' : 'No followers yet'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFollowers.map(({ id, follower, follower_id }) => (
                <div
                  key={id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigate(`/user/${follower.handle}`)}
                  >
                    <Avatar className="w-12 h-12 avatar-ring">
                      <AvatarImage src={follower.avatar_url || undefined} />
                      <AvatarFallback>
                        {follower.handle.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{follower.handle}</p>
                      {follower.is_private && (
                        <Badge variant="outline" className="text-xs">Private</Badge>
                      )}
                    </div>
                  </div>
                  <FollowRequestButton
                    targetUserId={follower_id}
                    isPrivate={follower.is_private}
                    initialFollowStatus={followStatuses[follower_id] || 'none'}
                    onStatusChange={loadFollowStatuses}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
