import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, UserMinus, TrendingUp, Lock } from 'lucide-react';
import { UserRatings } from '@/components/UserRatings';
import { UserPosts } from '@/components/UserPosts';
import { UserThoughts } from '@/components/UserThoughts';
import { UserReviews } from '@/components/UserReviews';
import { FollowRequestButton } from '@/components/FollowRequestButton';
import { ProfileRing } from '@/components/ProfileRing';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { BadgeCollection } from '@/components/BadgeCollection';
import { DynamicBackground } from '@/components/DynamicBackground';
import { AboutMeSection } from '@/components/AboutMeSection';
import { CinematicFavorites } from '@/components/CinematicFavorites';
import { Progress } from '@/components/ui/progress';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export default function UserProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();
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

    // Get count of both thoughts and reviews for total post count
    const { count: thoughtCount } = await supabase
      .from('thoughts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileData.id);

    const { count: reviewCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', profileData.id)
      .eq('kind', 'review');

    const postCount = (thoughtCount || 0) + (reviewCount || 0);

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
    { name: 'Pilot Watcher', min: 0, max: 49 },
    { name: 'Casual Viewer', min: 50, max: 149 },
    { name: 'Marathon Madness', min: 150, max: 299 },
    { name: 'Season Smasher', min: 300, max: 499 },
    { name: 'Series Finisher', min: 500, max: 799 },
    { name: 'Stream Scholar', min: 800, max: 1199 },
    { name: 'Ultimate Binger', min: 1200, max: Infinity },
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
        <Card className="p-4 sm:p-6 mb-4 sm:mb-6 mx-2 sm:mx-4 bg-card/70 backdrop-blur-md border-border/30 relative z-10">
          <div className="flex flex-col items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
              <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
                <ProfileRing points={bingePoints} badge={currentBadge}>
                  <Avatar className="w-full h-full border-2 sm:border-4 border-background shadow-lg">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.handle} />
                    <AvatarFallback className="text-2xl sm:text-3xl font-bold">
                      {profile.handle[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </ProfileRing>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <BadgeDisplay badge={currentBadge} size="md" />
              </div>
            </div>

            <div className="text-center w-full">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground drop-shadow-sm mb-1">
                @{profile.handle}
              </h1>
              
              {flags.BINGE_POINTS && (
                <div className="flex items-center justify-center gap-2 text-foreground/90 drop-shadow-sm mb-2">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold text-sm sm:text-base">{bingePoints.toLocaleString()} Binge Points</span>
                </div>
              )}

              {nextTier && flags.BINGE_POINTS && (
                <div className="w-full max-w-xs mx-auto space-y-1">
                  <div className="flex items-center justify-between text-xs text-foreground/70 drop-shadow-sm">
                    <span>{bingePoints} pts</span>
                    <span>{nextTier.min} pts to {nextTier.name}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>

            <div className="flex gap-3 sm:gap-4 text-center w-full justify-center">
              <div 
                className="cursor-pointer hover:opacity-80 transition-opacity bg-background/90 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg border border-border/50"
                onClick={() => navigate(`/user/${profile.handle}/followers`)}
              >
                <p className="font-bold text-foreground text-sm sm:text-base">{profile.followers}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Followers</p>
              </div>
              <div 
                className="cursor-pointer hover:opacity-80 transition-opacity bg-background/90 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg border border-border/50"
                onClick={() => navigate(`/user/${profile.handle}/following`)}
              >
                <p className="font-bold text-foreground text-sm sm:text-base">{profile.following}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Following</p>
              </div>
            </div>

            {user && userId && user.id !== userId && (
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
        </Card>

        {flags.BINGE_POINTS && (
          <div className="px-2 sm:px-4 mb-4 sm:mb-6 animate-fade-in relative z-10">
            <BadgeCollection currentBadge={currentBadge} bingePoints={bingePoints} />
          </div>
        )}

        <div className="px-2 sm:px-4 mb-4 sm:mb-6 animate-fade-in relative z-10">
          <AboutMeSection 
            bio={profile.bio || ''} 
            onSave={async () => {}} 
            isOwner={false}
          />
        </div>

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
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="w-full justify-start mb-4 bg-card/50 backdrop-blur-md border-2 border-border/30 overflow-x-auto">
                <TabsTrigger value="posts" className="text-xs sm:text-sm flex-shrink-0">Posts</TabsTrigger>
                <TabsTrigger value="shows" className="text-xs sm:text-sm flex-shrink-0">Shows ({profile.showCount})</TabsTrigger>
                <TabsTrigger value="seasons" className="text-xs sm:text-sm flex-shrink-0">Seasons ({profile.seasonCount})</TabsTrigger>
                <TabsTrigger value="episodes" className="text-xs sm:text-sm flex-shrink-0">Episodes ({profile.episodeCount})</TabsTrigger>
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
