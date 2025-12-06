import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Trophy } from 'lucide-react';
import { UserRatings } from '@/components/UserRatings';
import { UserPosts } from '@/components/UserPosts';
import { UserThoughts } from '@/components/UserThoughts';
import { UserReviews } from '@/components/UserReviews';
import { FollowRequestButton } from '@/components/FollowRequestButton';
import { ProfileRing } from '@/components/ProfileRing';
import { VHSProfileRing } from '@/components/VHSProfileRing';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { CinematicFavorites } from '@/components/CinematicFavorites';
import { InteractiveTrophyCase } from '@/components/InteractiveTrophyCase';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const BADGE_TIERS = [
  { name: 'Pilot Watcher', threshold: 0 },
  { name: 'Casual Viewer', threshold: 150 },
  { name: 'Marathon Madness', threshold: 500 },
  { name: 'Season Smasher', threshold: 1200 },
  { name: 'Series Finisher', threshold: 2500 },
  { name: 'Stream Scholar', threshold: 5000 },
  { name: 'Ultimate Binger', threshold: 10000 },
];

export default function UserProfilePage() {
  const {
    handle
  } = useParams<{
    handle: string;
  }>();
  const {
    user
  } = useAuth();
  const {
    theme
  } = useTheme();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const flags = useFeatureFlags(); // Move hook to top
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    id: '',
    handle: '',
    bio: '',
    avatar_url: '',
    is_private: false,
    showCount: 0,
    seasonCount: 0,
    episodeCount: 0,
    postCount: 0,
    followers: 0,
    following: 0,
    binge_points: 0,
    binge_score: 0,
    badge_tier: 'Pilot Watcher',
    top3Shows: [] as any[],
    settings: null as any
  });
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const getBadgeTextColor = (badge: string) => {
    const colorMap: Record<string, string> = {
      'Pilot Watcher': 'text-gray-400',
      'Casual Viewer': 'text-blue-400',
      'Marathon Madness': 'text-orange-400',
      'Season Smasher': 'text-red-500',
      'Series Finisher': 'text-purple-500',
      'Stream Scholar': 'text-teal-400',
      'Ultimate Binger': 'text-purple-500'
    };
    return colorMap[badge] || 'text-gray-400';
  };
  const getBadgeGradientText = (badge: string) => {
    const gradientMap: Record<string, string> = {
      'Pilot Watcher': 'bg-gradient-to-r from-gray-400 to-gray-500 bg-clip-text text-transparent',
      'Casual Viewer': 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
      'Marathon Madness': 'bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent',
      'Season Smasher': 'bg-gradient-to-r from-red-500 to-orange-600 bg-clip-text text-transparent',
      'Series Finisher': 'bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent',
      'Stream Scholar': 'bg-gradient-to-r from-teal-400 to-cyan-600 bg-clip-text text-transparent',
      'Ultimate Binger': 'bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent'
    };
    return gradientMap[badge] || 'bg-gradient-to-r from-gray-400 to-gray-500 bg-clip-text text-transparent';
  };
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
    const {
      data: profileData,
      error: profileError
    } = await supabase.from('profiles').select('id, handle, bio, avatar_url, is_private, binge_points, binge_score, badge_tier, settings').eq('handle', handle).single();
    if (profileError || !profileData) {
      toast({
        title: "Profile not found",
        description: "This profile doesn't exist or you don't have permission to view it.",
        variant: "destructive"
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

    // Check follow status for current user
    let canViewPrivateContent = !profileData.is_private;
    if (user) {
      const {
        data: followData
      } = await supabase.from('follows').select('status').eq('follower_id', user.id).eq('following_id', profileData.id).maybeSingle();
      if (followData) {
        const status = followData.status === 'accepted' ? 'accepted' : followData.status === 'pending' ? 'pending' : 'none';
        setFollowStatus(status);
        canViewPrivateContent = followData.status === 'accepted' || !profileData.is_private;
      } else {
        setFollowStatus('none');
      }
    }

    // If private and can't view, show limited profile
    if (profileData.is_private && !canViewPrivateContent) {
      setProfile({
        id: profileData.id,
        handle: profileData.handle,
        bio: 'This account is private',
        avatar_url: profileData.avatar_url || '',
        is_private: true,
        showCount: 0,
        seasonCount: 0,
        episodeCount: 0,
        postCount: 0,
        followers: 0,
        following: 0,
        binge_points: profileData.binge_points || 0,
        binge_score: profileData.binge_score || 0,
        badge_tier: profileData.badge_tier || 'Pilot Watcher',
        top3Shows: [],
        settings: profileData.settings
      });
      setLoading(false);
      return;
    }
    const {
      data: ratings
    } = await supabase.from('user_ratings').select('item_type, item_id').eq('user_id', profileData.id);
    const showCount = ratings?.filter(r => r.item_type === 'show').length || 0;
    const seasonCount = ratings?.filter(r => r.item_type === 'season').length || 0;
    const episodeCount = ratings?.filter(r => r.item_type === 'episode').length || 0;

    // Get count of all posts excluding ratings
    const {
      count: postCount
    } = await supabase.from('posts').select('*', {
      count: 'exact',
      head: true
    }).eq('author_id', profileData.id).is('deleted_at', null).neq('kind', 'rating');
    const {
      count: followers
    } = await supabase.from('follows').select('*', {
      count: 'exact',
      head: true
    }).eq('following_id', profileData.id).eq('status', 'accepted');
    const {
      count: following
    } = await supabase.from('follows').select('*', {
      count: 'exact',
      head: true
    }).eq('follower_id', profileData.id).eq('status', 'accepted');
    const settings = profileData.settings as any;
    const top3Shows = settings?.top3Shows || [];
    setProfile({
      id: profileData.id,
      handle: profileData.handle,
      bio: profileData.bio || '',
      avatar_url: profileData.avatar_url || '',
      is_private: profileData.is_private || false,
      showCount,
      seasonCount,
      episodeCount,
      postCount,
      followers: followers || 0,
      following: following || 0,
      binge_points: profileData.binge_points || 0,
      binge_score: profileData.binge_score || 0,
      badge_tier: profileData.badge_tier || 'Pilot Watcher',
      top3Shows,
      settings: profileData.settings
    });
    setLoading(false);
  };
  const loadUserRank = async () => {
    if (!userId) return;

    // Get the user's current binge score
    const {
      data: userData
    } = await supabase.from('profiles').select('binge_score').eq('id', userId).single();
    if (userData) {
      const {
        count
      } = await supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      }).gt('binge_score', userData.binge_score || 0);
      setUserRank((count || 0) + 1);
    }
  };
  useEffect(() => {
    if (userId) {
      loadUserRank();
    }
  }, [userId, profile.binge_score]);
  const loadThoughts = async () => {
    if (!userId) return;
    const {
      data: thoughtsData
    } = await supabase.from('thoughts').select(`
        id,
        user_id,
        text_content,
        content_id,
        created_at,
        content (title)
      `).eq('user_id', userId).order('created_at', {
      ascending: false
    }).limit(20);
    if (thoughtsData) {
      const thoughtsWithCounts = await Promise.all(thoughtsData.map(async (thought: any) => {
        const {
          data: reactions
        } = await supabase.from('reactions').select('reaction_type').eq('thought_id', thought.id);
        const {
          data: comments
        } = await supabase.from('comments').select('id').eq('thought_id', thought.id);
        let userReaction = undefined;
        if (user) {
          const {
            data
          } = await supabase.from('reactions').select('reaction_type').eq('thought_id', thought.id).eq('user_id', user.id).single();
          userReaction = data?.reaction_type;
        }
        const likes = reactions?.filter(r => r.reaction_type === 'like').length || 0;
        const dislikes = reactions?.filter(r => r.reaction_type === 'dislike').length || 0;
        const rethinks = reactions?.filter(r => r.reaction_type === 'rethink').length || 0;
        return {
          id: thought.id,
          user: {
            id: userId,
            handle: profile.handle
          },
          content: thought.text_content,
          show: thought.content ? {
            title: thought.content.title
          } : undefined,
          likes,
          dislikes,
          comments: comments?.length || 0,
          rethinks,
          userReaction
        };
      }));
      setThoughts(thoughtsWithCounts);
    }
  };
  const currentBadge = profile.badge_tier || 'Pilot Watcher';
  const bingeScore = profile.binge_score || 0;
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <>
      <div className="min-h-screen pb-20 relative overflow-x-hidden">
        {/* Profile Card */}
        <div className="px-3 py-6 mb-4 animate-fade-in relative">
          <div className="flex flex-col items-center mb-6">
            {/* Handle above profile pic */}
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-medium">
                {profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`}
              </p>
              <BadgeDisplay badge={currentBadge} size="sm" showGlow={false} />
            </div>

            {/* Profile Picture */}
            <div className="w-24 h-24 mb-3">
              {theme === 'dark' ? (
                <VHSProfileRing size="md">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.handle} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                      {profile.handle[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </VHSProfileRing>
              ) : (
                <ProfileRing points={bingeScore} badge={currentBadge}>
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.handle} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                      {profile.handle[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </ProfileRing>
              )}
            </div>

            {/* Name centered under profile pic */}
            {profile.settings?.displayName && (
              <h1 className="text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight mb-4">
                {profile.settings.displayName}
              </h1>
            )}

            {/* Stats with subtle shadow underneath */}
            <div className="flex gap-8 justify-center text-center mb-4">
              <button 
                className="flex flex-col items-center hover:opacity-80 transition-all drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] !border-none !rounded-none !shadow-none"
                style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}
              >
                <span className="text-base font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {profile.postCount}
                </span>
                <span className="text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Posts</span>
              </button>
              <button 
                className="flex flex-col items-center hover:opacity-80 transition-all drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] !border-none !rounded-none !shadow-none"
                onClick={() => navigate(`/user/${profile.handle}/followers`)}
                style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}
              >
                <span className="text-base font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {profile.followers}
                </span>
                <span className="text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Followers</span>
              </button>
              <button 
                className="flex flex-col items-center hover:opacity-80 transition-all drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] !border-none !rounded-none !shadow-none"
                onClick={() => navigate(`/user/${profile.handle}/following`)}
                style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}
              >
                <span className="text-base font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {profile.following}
                </span>
                <span className="text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Following</span>
              </button>
            </div>

            {/* Follow Button */}
            {user && userId && user.id !== userId && (
              <div className="flex justify-center w-full">
                <FollowRequestButton 
                  targetUserId={userId} 
                  isPrivate={profile.is_private} 
                  initialFollowStatus={followStatus} 
                  onStatusChange={() => loadProfile()} 
                />
              </div>
            )}
          </div>

          {/* Bio - inline display */}
          {profile.bio && (
            <div className="text-center px-4">
              <p className="text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-relaxed">
                {profile.bio}
              </p>
            </div>
          )}
        </div>

          <div className="px-4 mb-5 animate-fade-in relative z-10">
            <Card className="rounded-2xl border-2 border-border/30 p-4 bg-card/30 backdrop-blur-sm">
              <CinematicFavorites 
                shows={profile.top3Shows || []} 
                onEdit={() => {}} 
                onRemove={() => {}} 
                badgeColor={currentBadge === 'Ultimate Binger' ? '#a855f7' : '#3b82f6'} 
                isOwner={false} 
              />
            </Card>
          </div>

        {/* Tabs */}
        {!profile.is_private || followStatus === 'accepted' ? <div className="max-w-4xl mx-auto relative z-10 px-4">
            <Tabs defaultValue="posts" className="w-full space-y-4">
              <TabsList className="w-full grid grid-cols-2 rounded-full bg-muted/30 p-1.5 h-14 border-2 border-border/50">
                <TabsTrigger value="posts" className="rounded-full text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  Posts
                </TabsTrigger>
                <TabsTrigger value="ratings" className="rounded-full text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  Ratings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="space-y-4 rounded-2xl border-2 border-border/20 p-4 bg-card/50">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-4 h-9 rounded-full bg-muted/20 p-0.5 border border-border/30">
                    <TabsTrigger value="all" className="text-xs rounded-full">All</TabsTrigger>
                    <TabsTrigger value="thoughts" className="text-xs rounded-full">Thoughts</TabsTrigger>
                    <TabsTrigger value="reviews" className="text-xs rounded-full">Reviews</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-0">
                    <UserPosts userId={userId} />
                  </TabsContent>

                  <TabsContent value="thoughts" className="mt-0">
                    <UserThoughts userId={userId} />
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-0">
                    <UserReviews userId={userId} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

            <TabsContent value="ratings" className="space-y-4 rounded-2xl border-2 border-border/20 p-4 bg-card/50">
              <Tabs defaultValue="shows" className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-4 h-9 rounded-full bg-muted/20 p-0.5 border border-border/30">
                  <TabsTrigger value="shows" className="text-xs rounded-full">Shows</TabsTrigger>
                  <TabsTrigger value="seasons" className="text-xs rounded-full">Seasons</TabsTrigger>
                  <TabsTrigger value="episodes" className="text-xs rounded-full">Episodes</TabsTrigger>
                </TabsList>
                  <TabsContent value="shows" className="mt-0 py-4">
                    <UserRatings userId={userId} contentKind="show" />
                  </TabsContent>
                  <TabsContent value="seasons" className="mt-0 py-4">
                    <UserRatings userId={userId} contentKind="season" />
                  </TabsContent>
                  <TabsContent value="episodes" className="mt-0 py-4">
                    <UserRatings userId={userId} contentKind="episode" />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>

            {/* Binge Stats Section - Match ProfilePage styling exactly */}
            {flags.BINGE_POINTS && (
              <div className="px-4 mb-6 animate-fade-in">
                <Card className="rounded-2xl border-2 border-border/30 p-5 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">Trophy Case</h3>
                    {userRank && (
                      <button 
                        className="px-3 py-1 bg-primary/10 rounded-full text-xs font-medium border border-primary/30 flex items-center gap-1.5 hover:bg-primary/20 transition-colors"
                        onClick={() => navigate('/binge-board')}
                      >
                        <Trophy className="h-3 w-3 text-primary" />
                        <span className="text-primary">Rank #{userRank}</span>
                      </button>
                    )}
                  </div>
                  <InteractiveTrophyCase 
                    bingeScore={bingeScore} 
                    currentBadge={currentBadge}
                  />
                </Card>
              </div>
            )}
          </div> : <div className="px-2 sm:px-4 relative z-10">
            <Card className="p-8 sm:p-12 text-center bg-card/70 backdrop-blur-md border-border/30">
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">This Account is Private</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Follow this account to see their content
              </p>
            </Card>
          </div>}
      </div>
    </>;
}