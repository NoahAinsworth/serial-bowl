import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { UserRatings } from '@/components/UserRatings';
import { UserThoughts } from '@/components/UserThoughts';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [profile, setProfile] = useState({
    handle: '',
    bio: '',
    avatar_url: '',
    showCount: 0,
    seasonCount: 0,
    episodeCount: 0,
    thoughtCount: 0,
    followers: 0,
    following: 0,
  });
  const [thoughts, setThoughts] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      if (user && userId === user.id) {
        navigate('/profile');
        return;
      }
      loadProfile();
      loadThoughts();
      checkFollowing();
    }
  }, [userId, user]);

  const loadProfile = async () => {
    if (!userId) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('handle, bio, avatar_url')
      .eq('id', userId)
      .single();

    if (!profileData) {
      navigate('/');
      return;
    }

    const { data: ratings } = await supabase
      .from('ratings')
      .select('content_id')
      .eq('user_id', userId);

    const { data: allContent } = await supabase
      .from('content')
      .select('id, kind');

    const contentMap = new Map(allContent?.map(c => [c.id, c.kind]));
    
    const showCount = ratings?.filter(r => contentMap.get(r.content_id) === 'show').length || 0;
    const seasonCount = ratings?.filter(r => contentMap.get(r.content_id) === 'season').length || 0;
    const episodeCount = ratings?.filter(r => contentMap.get(r.content_id) === 'episode').length || 0;

    const { count: thoughtCount } = await supabase
      .from('thoughts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    setProfile({
      handle: profileData.handle,
      bio: profileData.bio || '',
      avatar_url: profileData.avatar_url || '',
      showCount,
      seasonCount,
      episodeCount,
      thoughtCount: thoughtCount || 0,
      followers: followers || 0,
      following: following || 0,
    });

    setLoading(false);
  };

  const loadThoughts = async () => {
    if (!userId) return;

    const { data: thoughtsData } = await supabase
      .from('thoughts')
      .select(`
        id,
        user_id,
        text_content,
        content_id,
        created_at,
        content (title)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (thoughtsData) {
      const thoughtsWithCounts = await Promise.all(
        thoughtsData.map(async (thought: any) => {
          const { data: reactions } = await supabase
            .from('reactions')
            .select('reaction_type')
            .eq('thought_id', thought.id);

          const { data: comments } = await supabase
            .from('comments')
            .select('id')
            .eq('thought_id', thought.id);

          let userReaction = undefined;
          if (user) {
            const { data } = await supabase
              .from('reactions')
              .select('reaction_type')
              .eq('thought_id', thought.id)
              .eq('user_id', user.id)
              .single();
            userReaction = data?.reaction_type;
          }

          const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
          const dislikes = reactions?.filter(r => r.reaction_type === 'dislike').length || 0;
          const rethinks = reactions?.filter(r => r.reaction_type === 'rethink').length || 0;

          return {
            id: thought.id,
            user: {
              id: userId,
              handle: profile.handle,
            },
            content: thought.text_content,
            show: thought.content ? { title: thought.content.title } : undefined,
            likes,
            dislikes,
            comments: comments?.length || 0,
            rethinks,
            userReaction,
          };
        })
      );

      setThoughts(thoughtsWithCounts);
    }
  };

  const checkFollowing = async () => {
    if (!user || !userId) return;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .single();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    if (!userId) return;

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (!error) {
        setIsFollowing(false);
        setProfile(prev => ({ ...prev, followers: prev.followers - 1 }));
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
        setIsFollowing(true);
        setProfile(prev => ({ ...prev, followers: prev.followers + 1 }));
        toast({ title: "Following" });
      }
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
    <div className="container max-w-2xl mx-auto py-6 px-4 animate-fade-in">
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url} alt={profile.handle} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl font-bold">
                {profile.handle[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{profile.handle}</h2>
              <p className="text-muted-foreground mt-1">{profile.bio || 'TV enthusiast 📺'}</p>
            </div>
          </div>
          {user && (
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              onClick={handleFollow}
              className="btn-glow"
            >
              {isFollowing ? (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{profile.followers}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{profile.following}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="thoughts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="thoughts">Thoughts ({profile.thoughtCount})</TabsTrigger>
          <TabsTrigger value="shows">Shows ({profile.showCount})</TabsTrigger>
          <TabsTrigger value="seasons">Seasons ({profile.seasonCount})</TabsTrigger>
          <TabsTrigger value="episodes">Eps ({profile.episodeCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="thoughts" className="mt-4">
          <UserThoughts userId={userId} />
        </TabsContent>
        <TabsContent value="shows" className="mt-4">
          <UserRatings userId={userId} contentKind="show" />
        </TabsContent>
        <TabsContent value="seasons" className="mt-4">
          <UserRatings userId={userId} contentKind="season" />
        </TabsContent>
        <TabsContent value="episodes" className="mt-4">
          <UserRatings userId={userId} contentKind="episode" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
