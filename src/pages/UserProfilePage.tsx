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
import { FollowRequestButton } from '@/components/FollowRequestButton';

export default function UserProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    handle: '',
    bio: '',
    avatar_url: '',
    is_private: false,
    showCount: 0,
    seasonCount: 0,
    episodeCount: 0,
    thoughtCount: 0,
    followers: 0,
    following: 0,
  });
  const [thoughts, setThoughts] = useState<any[]>([]);

  useEffect(() => {
    if (handle) {
      loadProfile();
    }
  }, [handle, user]);

  useEffect(() => {
    if (userId) {
      loadThoughts();
    }
  }, [userId]);

  const loadProfile = async () => {
    if (!handle) return;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, handle, bio, avatar_url, is_private')
      .eq('handle', handle)
      .single();

    if (profileError || !profileData) {
      toast({
        title: "Profile not found",
        description: "This profile doesn't exist or you don't have permission to view it.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    setUserId(profileData.id);

    // Redirect if viewing own profile
    if (user && profileData.id === user.id) {
      navigate('/profile');
      return;
    }

    // Check if this is a private profile and if current user follows them
    let canViewPrivateContent = !profileData.is_private;
    if (profileData.is_private && user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('status')
        .eq('follower_id', user.id)
        .eq('following_id', profileData.id)
        .eq('status', 'accepted')
        .maybeSingle();
      
      canViewPrivateContent = !!followData;
      setFollowStatus(followData ? 'accepted' : 'none');
    }

    // If private and can't view, show limited profile
    if (profileData.is_private && !canViewPrivateContent) {
      setProfile({
        handle: profileData.handle,
        bio: 'This account is private',
        avatar_url: profileData.avatar_url || '',
        is_private: true,
        showCount: 0,
        seasonCount: 0,
        episodeCount: 0,
        thoughtCount: 0,
        followers: 0,
        following: 0,
      });
      setLoading(false);
      return;
    }

    const { data: ratings } = await supabase
      .from('ratings')
      .select('content_id')
      .eq('user_id', profileData.id);

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
      .eq('user_id', profileData.id);

    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileData.id)
      .eq('status', 'accepted');

    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileData.id)
      .eq('status', 'accepted');

    setProfile({
      handle: profileData.handle,
      bio: profileData.bio || '',
      avatar_url: profileData.avatar_url || '',
      is_private: profileData.is_private || false,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 animate-fade-in">
      <Card className="p-6 mb-6 card-enhanced">
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
          <div className="flex gap-4 flex-1 min-w-0">
            <div className="avatar-ring flex-shrink-0">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url} alt={profile.handle} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl font-bold">
                  {profile.handle[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold">{profile.handle}</h2>
                {user && userId && (
                  <FollowRequestButton
                    targetUserId={userId}
                    isPrivate={profile.is_private}
                    initialFollowStatus={followStatus}
                    onStatusChange={() => {
                      loadProfile();
                    }}
                  />
                )}
              </div>
              <p className="text-muted-foreground mt-1">{profile.bio || 'TV enthusiast 📺'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div 
            className="text-center cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors"
            onClick={() => navigate(`/user/${handle}/followers`)}
          >
            <div className="text-2xl font-bold text-primary">{profile.followers}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div 
            className="text-center cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors"
            onClick={() => navigate(`/user/${handle}/following`)}
          >
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
        {profile.is_private && profile.bio === 'This account is private' ? (
          <div className="mt-8 text-center">
            <Card className="p-8">
              <h3 className="text-xl font-semibold mb-2">This Account is Private</h3>
              <p className="text-muted-foreground">
                Follow this account to see their thoughts and activity
              </p>
            </Card>
          </div>
        ) : (
          <>
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
          </>
        )}
      </Tabs>
    </div>
  );
}
