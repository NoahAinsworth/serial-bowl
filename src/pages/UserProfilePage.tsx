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
import { Loader2, UserPlus, UserMinus, TrendingUp, Lock, Trophy } from 'lucide-react';
import { UserRatings } from '@/components/UserRatings';
import { UserPosts } from '@/components/UserPosts';
import { UserThoughts } from '@/components/UserThoughts';
import { UserReviews } from '@/components/UserReviews';
import { FollowRequestButton } from '@/components/FollowRequestButton';
import { ProfileRing } from '@/components/ProfileRing';
import { VHSProfileRing } from '@/components/VHSProfileRing';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { BadgeCollection } from '@/components/BadgeCollection';
import { DynamicBackground } from '@/components/DynamicBackground';
import { AboutMeSection } from '@/components/AboutMeSection';
import { CinematicFavorites } from '@/components/CinematicFavorites';
import { Progress } from '@/components/ui/progress';
import { BingePointsDisplay } from '@/components/BingePointsDisplay';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export default function UserProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
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
    badge_tier: 'Pilot Watcher',
    top3Shows: [] as any[],
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
      'Ultimate Binger': 'text-purple-500',
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
      'Ultimate Binger': 'bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent',
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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, handle, bio, avatar_url, is_private, binge_points, badge_tier, settings')
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

    // Check follow status for current user
    let canViewPrivateContent = !profileData.is_private;
    if (user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('status')
        .eq('follower_id', user.id)
        .eq('following_id', profileData.id)
        .maybeSingle();
      
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
        badge_tier: profileData.badge_tier || 'Pilot Watcher',
        top3Shows: [],
      });
      setLoading(false);
      return;
    }

    const { data: ratings } = await supabase
      .from('user_ratings')
      .select('item_type, item_id')
      .eq('user_id', profileData.id);
    
    const showCount = ratings?.filter(r => r.item_type === 'show').length || 0;
    const seasonCount = ratings?.filter(r => r.item_type === 'season').length || 0;
    const episodeCount = ratings?.filter(r => r.item_type === 'episode').length || 0;

    // Get count of all posts excluding ratings
    const { count: postCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', profileData.id)
      .is('deleted_at', null)
      .neq('kind', 'rating');

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
      badge_tier: profileData.badge_tier || 'Pilot Watcher',
      top3Shows,
    });

    setLoading(false);
  };

  const loadUserRank = async () => {
    if (!userId) return;
    
    // Get the user's current binge points
    const { data: userData } = await supabase
      .from('profiles')
      .select('binge_points')
      .eq('id', userId)
      .single();
    
    if (userData) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('binge_points', userData.binge_points || 0);
      
      setUserRank((count || 0) + 1);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUserRank();
    }
  }, [userId, profile.binge_points]);

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

  const currentBadge = profile.badge_tier || 'Pilot Watcher';
  const bingePoints = profile.binge_points || 0;

  const BADGE_THRESHOLDS = [
    { name: 'Pilot Watcher', min: 0, max: 149 },
    { name: 'Casual Viewer', min: 150, max: 499 },
    { name: 'Marathon Madness', min: 500, max: 1199 },
    { name: 'Season Smasher', min: 1200, max: 2499 },
    { name: 'Series Finisher', min: 2500, max: 4999 },
    { name: 'Stream Scholar', min: 5000, max: 9999 },
    { name: 'Ultimate Binger', min: 10000, max: Infinity },
  ];

  const currentTier = BADGE_THRESHOLDS.find(t => t.name === currentBadge) || BADGE_THRESHOLDS[0];
  const currentIndex = BADGE_THRESHOLDS.findIndex(t => t.name === currentBadge);
  const nextTier = currentIndex < BADGE_THRESHOLDS.length - 1 ? BADGE_THRESHOLDS[currentIndex + 1] : null;

  const progress = nextTier 
    ? ((bingePoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <DynamicBackground badge={currentBadge} />
      <div className="min-h-screen pb-20 relative overflow-x-hidden">
        {/* Profile Card */}
        <div className="px-4 py-8 mb-6 animate-fade-in">
          <div className="flex flex-col items-center gap-6">
            {/* Profile Ring with Badge */}
            <div className="relative inline-flex items-center gap-4">
              <div className="w-48 h-48 relative">
                {theme === 'vhs_mode' ? (
                  <VHSProfileRing size="lg">
                    <Avatar className="w-full h-full border-4 border-background shadow-lg">
                      <AvatarImage src={profile.avatar_url || undefined} alt={profile.handle} />
                      <AvatarFallback className="text-4xl font-bold">
                        {profile.handle[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </VHSProfileRing>
                ) : (
                  <ProfileRing points={bingePoints} badge={currentBadge}>
                    <Avatar className="w-full h-full border-4 border-background shadow-lg">
                      <AvatarImage src={profile.avatar_url || undefined} alt={profile.handle} />
                      <AvatarFallback className="text-4xl font-bold">
                        {profile.handle[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </ProfileRing>
                )}
                
                {/* Follow button attached to profile circle */}
                {user && userId && user.id !== userId && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                    <FollowRequestButton
                      targetUserId={userId}
                      isPrivate={profile.is_private}
                      initialFollowStatus={followStatus}
                      onStatusChange={() => loadProfile()}
                    />
                  </div>
                )}
              </div>
              
              {/* Badge beside ring */}
              <div className="flex-shrink-0">
                <BadgeDisplay badge={currentBadge} size="lg" showGlow={false} />
              </div>
            </div>

            {/* Name and handle */}
            <div className="text-center space-y-3 w-full max-w-md">
              {(profile as any).settings?.displayName && (
                <h1 
                  className="text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                  style={{ 
                    textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 8px rgba(0,0,0,0.9)'
                  }}
                >
                  {(profile as any).settings.displayName}
                </h1>
              )}
              <p 
                className="text-lg text-white font-semibold" 
                style={{ 
                  textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 6px rgba(0,0,0,0.9)'
                }}
              >
                @{profile.handle || 'user'}
              </p>

              {/* Stats */}
              <div className="flex gap-6 text-sm justify-center pt-2 bg-card/60 backdrop-blur-md rounded-lg p-4 border border-border/30">
                <button className="hover:underline group">
                  <span className="font-bold text-foreground text-lg block group-hover:scale-110 transition-transform drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                    {profile.postCount}
                  </span>
                  <span 
                    className="font-semibold text-white text-xs" 
                    style={{ 
                      textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                    }}
                  >
                    Posts
                  </span>
                </button>
                <button 
                  className="hover:underline group"
                  onClick={() => navigate(`/user/${profile.handle}/followers`)}
                >
                  <span className="font-bold text-foreground text-lg block group-hover:scale-110 transition-transform drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                    {profile.followers}
                  </span>
                  <span 
                    className="font-semibold text-white text-xs" 
                    style={{ 
                      textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                    }}
                  >
                    Followers
                  </span>
                </button>
                <button 
                  className="hover:underline group"
                  onClick={() => navigate(`/user/${profile.handle}/following`)}
                >
                  <span className="font-bold text-foreground text-lg block group-hover:scale-110 transition-transform drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                    {profile.following}
                  </span>
                  <span 
                    className="font-semibold text-white text-xs" 
                    style={{ 
                      textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                    }}
                  >
                    Following
                  </span>
                </button>
                <button 
                  className="hover:underline group"
                  onClick={() => navigate('/binge-board')}
                >
                  <span className="font-bold text-foreground text-lg block group-hover:scale-110 transition-transform drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                    #{userRank || '—'}
                  </span>
                  <span 
                    className="font-semibold text-white text-xs flex items-center gap-1" 
                    style={{ 
                      textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                    }}
                  >
                    <Trophy className="w-3 h-3" />
                    Rank
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {flags.BINGE_POINTS && (
          <div className="px-4 mb-6 animate-fade-in">
            <BingePointsDisplay
              points={bingePoints}
              badge={currentBadge}
              showBreakdown={false}
            />
          </div>
        )}

        <div className="px-2 sm:px-4 mb-4 sm:mb-6 animate-fade-in relative z-10">
          <AboutMeSection 
            bio={profile.bio || ''} 
            onSave={async () => {}} 
            isOwner={false}
          />
        </div>

        {/* Progress to next badge - MOVED HERE */}
        {flags.BINGE_POINTS && nextTier && (
          <div className="px-2 sm:px-4 mb-4 sm:mb-6 animate-fade-in relative z-10">
            <div className="space-y-2 bg-card/60 backdrop-blur-md rounded-lg p-4 border border-border/30">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-black dark:text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  {currentBadge}
                </span>
                <div className="flex items-center gap-1 text-black dark:text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-semibold">Next: {nextTier.name}</span>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-black dark:text-white text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] font-semibold">
                {bingePoints} / {nextTier.min} Binge Points
              </div>
            </div>
          </div>
        )}

        {flags.BINGE_POINTS && (
          <div className="px-2 sm:px-4 mb-4 sm:mb-6 animate-fade-in relative z-10">
            <BadgeCollection currentBadge={currentBadge} bingePoints={bingePoints} />
          </div>
        )}

        <div className="px-2 sm:px-4 mb-4 sm:mb-6 animate-fade-in relative z-10">
          <CinematicFavorites
            shows={profile.top3Shows || []}
            onEdit={() => {}}
            onRemove={() => {}}
            badgeColor={currentBadge === 'Ultimate Binger' ? '#a855f7' : '#3b82f6'}
            isOwner={false}
          />
        </div>

        {/* Tabs */}
        {!profile.is_private || (followStatus === 'accepted') ? (
          <div className="max-w-4xl mx-auto px-2 sm:px-4 relative z-10">
            <Tabs defaultValue="posts" className="w-full mt-0">
              <TabsList className="w-full grid grid-cols-4 rounded-t-2xl bg-background/80 backdrop-blur-lg sticky top-0 z-10">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="shows">Shows</TabsTrigger>
                <TabsTrigger value="seasons">Seasons</TabsTrigger>
                <TabsTrigger value="episodes">Episodes</TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/30 p-2 sm:p-4">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="w-full justify-start mb-4 overflow-x-auto">
                    <TabsTrigger value="all" className="text-xs sm:text-sm flex-shrink-0">All</TabsTrigger>
                    <TabsTrigger value="thoughts" className="text-xs sm:text-sm flex-shrink-0">Thoughts</TabsTrigger>
                    <TabsTrigger value="reviews" className="text-xs sm:text-sm flex-shrink-0">Reviews</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <UserPosts userId={userId} />
                  </TabsContent>

                  <TabsContent value="thoughts">
                    <UserThoughts userId={userId} />
                  </TabsContent>

                  <TabsContent value="reviews">
                    <UserReviews userId={userId} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="shows" className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/30 p-2 sm:p-4">
                <UserRatings userId={userId} contentKind="show" />
              </TabsContent>

              <TabsContent value="seasons" className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/30 p-2 sm:p-4">
                <UserRatings userId={userId} contentKind="season" />
              </TabsContent>

              <TabsContent value="episodes" className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/30 p-2 sm:p-4">
                <UserRatings userId={userId} contentKind="episode" />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="px-2 sm:px-4 relative z-10">
            <Card className="p-8 sm:p-12 text-center bg-card/70 backdrop-blur-md border-border/30">
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">This Account is Private</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Follow this account to see their content
              </p>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
