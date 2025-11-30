import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Edit, Loader2, Share2, X, TrendingUp, Trophy, Plus, Search, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserPosts } from '@/components/UserPosts';
import { UserRatings } from '@/components/UserRatings';
import { UserThoughts } from '@/components/UserThoughts';
import { UserReviews } from '@/components/UserReviews';
import { FollowRequestsList } from '@/components/FollowRequestsList';
import { VideoPostCard } from '@/components/VideoPostCard';
import { UserVideos } from '@/components/UserVideos';
import { Input } from '@/components/ui/input';
import { useTVDB } from '@/hooks/useTVDB';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { ProfileRing } from '@/components/ProfileRing';
import { VHSProfileRing } from '@/components/VHSProfileRing';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { BadgeCollection } from '@/components/BadgeCollection';
import { DynamicBackground } from '@/components/DynamicBackground';
import { AboutMeSection } from '@/components/AboutMeSection';
import { CinematicFavorites } from '@/components/CinematicFavorites';
import { Progress } from '@/components/ui/progress';
import { BingePointsDisplay } from '@/components/BingePointsDisplay';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { search: searchTVDB } = useTVDB();
  const flags = useFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    thoughtsCount: 0,
    followersCount: 0,
    followingCount: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showTop3Dialog, setShowTop3Dialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [top3Shows, setTop3Shows] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingShows, setSearchingShows] = useState(false);
  const [bingeBreakdown, setBingeBreakdown] = useState<{
    episode_points: number;
    season_bonuses: number;
    show_bonuses: number;
    completed_seasons: number;
    completed_shows: number;
  } | null>(null);
  const [addShowsQuery, setAddShowsQuery] = useState('');
  const [addShowsResults, setAddShowsResults] = useState<any[]>([]);
  const [searchingAddShows, setSearchingAddShows] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadProfile();
    loadTop3Shows();
    loadUserRank();
  }, [user]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (showTop3Dialog) {
        searchShows(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, showTop3Dialog]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (addShowsQuery.trim()) {
        searchAddShows(addShowsQuery);
      } else {
        setAddShowsResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [addShowsQuery]);

  const loadProfile = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('handle, bio, avatar_url, settings, binge_points, badge_tier')
      .eq('id', user.id)
      .maybeSingle();

    const [thoughtsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id).is('deleted_at', null).neq('kind', 'rating'),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);

    setProfile(profileData);
    setStats({
      thoughtsCount: thoughtsRes.count || 0,
      followersCount: followersRes.count || 0,
      followingCount: followingRes.count || 0,
    });

    // Fetch binge points breakdown
    if (flags.BINGE_POINTS) {
      const { data: breakdown } = await supabase
        .rpc('calculate_binge_points', { p_user_id: user.id });
      
      if (breakdown && breakdown.length > 0) {
        setBingeBreakdown(breakdown[0]);
      }
    }

    setLoading(false);
  };

  const loadTop3Shows = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle();

    const settings = data?.settings as any;
    if (settings?.top3Shows) {
      setTop3Shows(settings.top3Shows);
    }
  };

  const loadUserRank = async () => {
    if (!user) return;

    const { data: currentUser } = await supabase
      .from('profiles')
      .select('binge_points')
      .eq('id', user.id)
      .maybeSingle();

    if (currentUser) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('binge_points', currentUser.binge_points);
      
      setUserRank((count || 0) + 1);
    }
  };

  const searchShows = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingShows(true);
    try {
      const results = await searchTVDB(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching shows:', error);
      toast({
        title: "Search failed",
        description: "Unable to search for shows. Please try again.",
        variant: "destructive",
      });
    }
    setSearchingShows(false);
  };

  const searchAddShows = async (query: string) => {
    if (!query.trim()) {
      setAddShowsResults([]);
      return;
    }

    setSearchingAddShows(true);
    try {
      const results = await searchTVDB(query);
      setAddShowsResults(results);
    } catch (error) {
      console.error('Error searching shows:', error);
    }
    setSearchingAddShows(false);
  };

  const addToWatched = async (show: any) => {
    if (!user) return;

    try {
      const { data: existingContent } = await supabase
        .from('content')
        .select('id')
        .eq('external_src', 'thetvdb')
        .eq('external_id', show.id.toString())
        .eq('kind', 'show')
        .maybeSingle();

      let contentId = existingContent?.id;

      if (!contentId) {
        const { data: newContent, error: contentError } = await supabase
          .from('content')
          .insert({
            external_src: 'thetvdb',
            external_id: show.id.toString(),
            kind: 'show',
            title: show.name,
            poster_url: show.image,
            metadata: { overview: show.overview },
          })
          .select('id')
          .single();

        if (contentError) throw contentError;
        contentId = newContent.id;
      }

      const { error } = await supabase
        .from('watched')
        .insert({
          user_id: user.id,
          content_id: contentId,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already marked as watched",
            description: `${show.name} is already in your watched list`,
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Marked as watched",
          description: `${show.name} has been added`,
        });
        
        // Reload profile to update binge points
        loadProfile();
        loadUserRank();
        setAddShowsQuery('');
        setAddShowsResults([]);
      }
    } catch (error) {
      console.error('Error adding to watched:', error);
      toast({
        title: "Error",
        description: "Failed to add show to watched list",
        variant: "destructive",
      });
    }
  };

  const addToTop3 = async (show: any, slotIndex: number) => {
    const existingIndex = top3Shows.findIndex(s => s && s.id === show.id.toString());
    if (existingIndex !== -1 && existingIndex !== slotIndex) {
      toast({
        title: "Already added",
        description: "This show is already in another slot",
        variant: "destructive",
      });
      return;
    }

    const showData = {
      id: show.id.toString(),
      external_id: show.id.toString(),
      title: show.name,
      poster_url: show.image || '',
    };

    const newTop3 = [...top3Shows];
    while (newTop3.length < 3) {
      newTop3.push(null);
    }
    newTop3[slotIndex] = showData;

    setTop3Shows(newTop3);

    await supabase
      .from('profiles')
      .update({
        settings: {
          ...profile?.settings,
          top3Shows: newTop3,
        },
      })
      .eq('id', user!.id);

    toast({
      title: "Added to Favorites",
      description: `${show.name} added to slot #${slotIndex + 1}`,
    });

    setShowTop3Dialog(false);
    setSelectedSlot(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFromTop3 = async (slotIndex: number) => {
    const newTop3 = [...top3Shows];
    newTop3[slotIndex] = null;
    setTop3Shows(newTop3);

    await supabase
      .from('profiles')
      .update({
        settings: {
          ...profile?.settings,
          top3Shows: newTop3,
        },
      })
      .eq('id', user!.id);

    toast({
      title: "Removed from Favorites",
      description: `Show removed from slot #${slotIndex + 1}`,
    });
  };

  const openSlotDialog = (slotIndex: number) => {
    setSelectedSlot(slotIndex);
    setShowTop3Dialog(true);
  };

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/user/${user?.id}`;
    
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Profile link copied!",
        description: "Share your profile with others",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Failed to copy link",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleBioSave = async (newBio: string) => {
    await supabase
      .from('profiles')
      .update({ bio: newBio })
      .eq('id', user!.id);

    setProfile({ ...profile, bio: newBio });
    
    toast({
      title: "Bio updated",
      description: "Your profile bio has been saved",
    });
  };

  const currentBadge = profile?.badge_tier || 'Pilot Watcher';
  const bingePoints = profile?.binge_points || 0;

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
      <div className="max-w-4xl mx-auto relative pb-12">
        <div className="px-4 mb-6 animate-fade-in">
          <FollowRequestsList />
        </div>

        <div className="px-3 py-6 mb-4 animate-fade-in relative">
          {/* Profile Picture and Name Section */}
          <div className="flex flex-col items-center mb-6">
            {/* Handle above profile pic */}
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-medium">
                {profile?.handle?.startsWith('@') ? profile.handle : `@${profile?.handle || 'user'}`}
              </p>
              <BadgeDisplay badge={currentBadge} size="sm" showGlow={false} />
            </div>

            {/* Profile Picture */}
            <div className="w-24 h-24 mb-3">
              {theme === 'dark' ? (
                <VHSProfileRing size="md">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.handle} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                      {profile?.handle?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </VHSProfileRing>
              ) : (
                <ProfileRing points={bingePoints} badge={currentBadge}>
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.handle} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                      {profile?.handle?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </ProfileRing>
              )}
            </div>

            {/* Name centered under profile pic */}
            {profile?.settings?.displayName && (
              <h1 className="text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight mb-4">
                {profile.settings.displayName}
              </h1>
            )}

            {/* Stats with subtle shadow underneath */}
            <div className="flex gap-8 justify-center text-center mb-4">
              <button 
                className="flex flex-col items-center hover:opacity-80 transition-all drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] !border-none !rounded-none !shadow-none"
                onClick={() => toast({ title: "Coming soon", description: "Thoughts list will be shown here" })}
                style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}
              >
                <span className="text-base font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {stats.thoughtsCount}
                </span>
                <span className="text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Posts</span>
              </button>
              <button 
                className="flex flex-col items-center hover:opacity-80 transition-all drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] !border-none !rounded-none !shadow-none"
                onClick={() => navigate('/followers')}
                style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}
              >
                <span className="text-base font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {stats.followersCount}
                </span>
                <span className="text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Followers</span>
              </button>
              <button 
                className="flex flex-col items-center hover:opacity-80 transition-all drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] !border-none !rounded-none !shadow-none"
                onClick={() => navigate('/following')}
                style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}
              >
                <span className="text-base font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {stats.followingCount}
                </span>
                <span className="text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Following</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full max-w-xs">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/profile/edit')} 
                className="flex-1 h-9 font-semibold bg-white/10 backdrop-blur-sm hover:bg-white/20"
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleShare}
                className="flex-1 h-9 font-semibold bg-white/10 backdrop-blur-sm hover:bg-white/20"
              >
                <Share2 className="h-4 w-4 mr-1.5" />
                Share
              </Button>
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <div className="text-center px-4">
              <p className="text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-relaxed">
                {profile.bio}
              </p>
            </div>
          )}
        </div>


        <div className="px-3 mb-5 animate-fade-in">
          <CinematicFavorites
            shows={top3Shows}
            onEdit={openSlotDialog}
            onRemove={removeFromTop3}
            badgeColor={currentBadge === 'Ultimate Binger' ? '#a855f7' : '#3b82f6'}
            isOwner={true}
          />
        </div>

        <Dialog open={showTop3Dialog} onOpenChange={(open) => {
          setShowTop3Dialog(open);
          if (!open) {
            setSelectedSlot(null);
            setSearchQuery('');
            setSearchResults([]);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedSlot !== null ? `Edit Slot #${selectedSlot + 1}` : 'Add to Favorites'}
              </DialogTitle>
              <DialogDescription>
                {selectedSlot !== null 
                  ? `Select a show for position #${selectedSlot + 1}` 
                  : 'Search and add a show to your favorites'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search for a show..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {searchingShows ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </div>
                ) : (
                  searchResults.map((show) => (
                    <Card
                      key={show.id}
                      className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => selectedSlot !== null && addToTop3(show, selectedSlot)}
                    >
                      {show.image && (
                        <img src={show.image} alt={show.name} className="w-12 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{show.name}</p>
                        {show.firstAired && (
                          <p className="text-xs text-muted-foreground">{new Date(show.firstAired).getFullYear()}</p>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="posts" className="w-full mt-0">
          <TabsList className="w-full grid grid-cols-4 rounded-t-2xl bg-background/80 backdrop-blur-lg sticky top-0 z-10 h-12">
            <TabsTrigger value="posts" className="text-xs sm:text-sm">Posts</TabsTrigger>
            <TabsTrigger value="shows" className="text-xs sm:text-sm">Shows</TabsTrigger>
            <TabsTrigger value="seasons" className="text-xs sm:text-sm">Seasons</TabsTrigger>
            <TabsTrigger value="episodes" className="text-xs sm:text-sm">Episodes</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0 px-3 sm:px-4 bg-card/50 rounded-b-2xl border-x border-b border-border/20">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4 h-10">
                <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                <TabsTrigger value="thoughts" className="text-xs sm:text-sm">Thoughts</TabsTrigger>
                <TabsTrigger value="reviews" className="text-xs sm:text-sm">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <UserPosts userId={user!.id} />
              </TabsContent>

              <TabsContent value="thoughts" className="mt-0">
                <UserThoughts userId={user!.id} />
              </TabsContent>

              <TabsContent value="reviews" className="mt-0">
                <UserReviews userId={user!.id} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="shows" className="mt-0 px-3 sm:px-4 bg-card/50 rounded-b-2xl border-x border-b border-border/20 py-4">
            <UserRatings userId={user!.id} contentKind="show" />
          </TabsContent>

          <TabsContent value="seasons" className="mt-0 px-3 sm:px-4 bg-card/50 rounded-b-2xl border-x border-b border-border/20 py-4">
            <UserRatings userId={user!.id} contentKind="season" />
          </TabsContent>

          <TabsContent value="episodes" className="mt-0 px-3 sm:px-4 bg-card/50 rounded-b-2xl border-x border-b border-border/20 py-4">
            <UserRatings userId={user!.id} contentKind="episode" />
          </TabsContent>
        </Tabs>


        {flags.BINGE_POINTS && (
          <div className="px-4 mb-6 animate-fade-in">
            <Card className="p-6 bg-card/70 backdrop-blur-md border-border/30">
              <Tabs defaultValue="stats" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                  <TabsTrigger value="add-shows">Add Shows</TabsTrigger>
                </TabsList>

                <TabsContent value="stats" className="space-y-4">
                  {/* Trophy Case */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-foreground/90">
                        Trophy Case ({BADGE_THRESHOLDS.filter(tier => bingePoints >= tier.min).length}/{BADGE_THRESHOLDS.length})
                      </h4>
                      <button 
                        className="px-3 py-1.5 bg-card/60 backdrop-blur-md rounded-full border border-border/30 hover:border-primary/50 transition-all text-sm font-medium flex items-center gap-1"
                        onClick={() => navigate('/binge-board')}
                      >
                        <Trophy className="w-3 h-3 text-primary" />
                        <span className="text-foreground">Rank #{userRank || '—'}</span>
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="flex gap-4 pb-2">
                        {BADGE_THRESHOLDS.filter(tier => bingePoints >= tier.min).reverse().map((badge) => (
                          <div 
                            key={badge.name}
                            className="flex-shrink-0 flex flex-col items-center gap-1"
                          >
                            <BadgeDisplay 
                              badge={badge.name} 
                              size="sm"
                              showGlow={badge.name === currentBadge}
                            />
                            <div className="whitespace-nowrap bg-background/98 backdrop-blur-sm px-2 py-1 rounded text-xs border border-border/50 text-foreground shadow-lg">
                              {badge.min} pts
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Binge Meter */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground/90">Binge Meter</h4>
                    <BingePointsDisplay
                      points={bingePoints}
                      badge={currentBadge}
                      episodePoints={bingeBreakdown?.episode_points}
                      seasonBonuses={bingeBreakdown?.season_bonuses}
                      showBonuses={bingeBreakdown?.show_bonuses}
                      completedSeasons={bingeBreakdown?.completed_seasons}
                      completedShows={bingeBreakdown?.completed_shows}
                      showBreakdown={true}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="add-shows" className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground/90">Search & Add to Watched</h4>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search for TV shows..."
                        value={addShowsQuery}
                        onChange={(e) => setAddShowsQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {searchingAddShows && (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    )}

                    {!searchingAddShows && addShowsResults.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                        {addShowsResults.map((show) => (
                          <div
                            key={show.id}
                            className="group relative rounded-lg overflow-hidden bg-card/50 backdrop-blur border border-border/30 hover:border-primary/50 transition-all"
                          >
                            <img
                              src={show.image || '/placeholder.svg'}
                              alt={show.name}
                              className="w-full aspect-[2/3] object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <Button
                                size="sm"
                                onClick={() => addToWatched(show)}
                                className="w-full"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add to Watched
                              </Button>
                            </div>
                            <div className="p-2">
                              <p className="text-xs font-medium text-foreground line-clamp-2">
                                {show.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!searchingAddShows && addShowsQuery && addShowsResults.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No shows found
                      </div>
                    )}

                    {!addShowsQuery && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Search for TV shows to add to your watched list and earn binge points!
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
