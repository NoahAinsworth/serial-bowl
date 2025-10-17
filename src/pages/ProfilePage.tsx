import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Edit, Loader2, Share2, X, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserPosts } from '@/components/UserPosts';
import { UnifiedRatings } from '@/components/UnifiedRatings';
import { UserLists } from '@/components/UserLists';
import { FollowRequestsList } from '@/components/FollowRequestsList';
import { Input } from '@/components/ui/input';
import { useTVDB } from '@/hooks/useTVDB';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { ProfileRing } from '@/components/ProfileRing';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { BadgeCollection } from '@/components/BadgeCollection';
import { DynamicBackground } from '@/components/DynamicBackground';
import { AboutMeSection } from '@/components/AboutMeSection';
import { CinematicFavorites } from '@/components/CinematicFavorites';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ProfilePage() {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadProfile();
    loadTop3Shows();
  }, [user]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (showTop3Dialog) {
        searchShows(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, showTop3Dialog]);

  const loadProfile = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('handle, bio, avatar_url, settings, binge_points, badge_tier')
      .eq('id', user.id)
      .maybeSingle();

    const [thoughtsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('thoughts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);

    setProfile(profileData);
    setStats({
      thoughtsCount: thoughtsRes.count || 0,
      followersCount: followersRes.count || 0,
      followingCount: followingRes.count || 0,
    });
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

      <div className="max-w-4xl mx-auto relative pb-12">
        <div className="px-4 mb-6 animate-fade-in">
          <FollowRequestsList />
        </div>

        <div className="px-4 py-8 mb-6 animate-fade-in">
          {/* Share/Edit Buttons - positioned outside ring */}
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="secondary" size="icon" onClick={handleShare} title="Share profile" className="h-8 w-8 rounded-full shadow-lg">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => navigate('/profile/edit')} title="Edit profile" className="h-8 w-8 rounded-full shadow-lg">
              <Edit className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col items-center gap-6">
            {/* Profile Ring with Badge */}
            <div className="relative inline-flex items-center gap-4">
              <div className="w-48 h-48">
                <ProfileRing points={bingePoints} badge={currentBadge}>
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.handle} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-4xl">
                      {profile?.handle?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </ProfileRing>
              </div>

              {/* Badge beside ring */}
              <div className="flex-shrink-0">
                <BadgeDisplay badge={currentBadge} size="lg" showGlow={true} />
              </div>
            </div>

            <div className="text-center space-y-3 w-full max-w-md">
              {profile?.settings?.displayName && (
                <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {profile.settings.displayName}
                </h1>
              )}
              <p className="text-lg text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                @{profile?.handle || 'user'}
              </p>

              {flags.BINGE_POINTS && nextTier && (
                <div className="space-y-2 px-4 bg-card/60 backdrop-blur-md rounded-lg p-4 border border-border/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground drop-shadow-sm">{currentBadge}</span>
                    <div className="flex items-center gap-1 text-foreground/90">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-xs drop-shadow-sm">Next: {nextTier.name}</span>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-foreground/90 text-center drop-shadow-sm">
                    {bingePoints} / {nextTier.min} Binge Points
                  </div>
                </div>
              )}

              <div className="flex gap-6 text-sm justify-center pt-2 bg-card/60 backdrop-blur-md rounded-lg p-4 border border-border/30">
                <button 
                  className="hover:underline group"
                  onClick={() => toast({ title: "Coming soon", description: "Thoughts list will be shown here" })}
                >
                  <span className="font-bold text-foreground text-lg block group-hover:scale-110 transition-transform drop-shadow-sm">
                    {stats.thoughtsCount}
                  </span>
                  <span className="text-foreground/90 font-medium drop-shadow-sm">Thoughts</span>
                </button>
                <button 
                  className="hover:underline group"
                  onClick={() => navigate('/followers')}
                >
                  <span className="font-bold text-foreground text-lg block group-hover:scale-110 transition-transform drop-shadow-sm">
                    {stats.followersCount}
                  </span>
                  <span className="text-foreground/90 font-medium drop-shadow-sm">Followers</span>
                </button>
                <button 
                  className="hover:underline group"
                  onClick={() => navigate('/following')}
                >
                  <span className="font-bold text-foreground text-lg block group-hover:scale-110 transition-transform drop-shadow-sm">
                    {stats.followingCount}
                  </span>
                  <span className="text-foreground/90 font-medium drop-shadow-sm">Following</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {flags.BINGE_POINTS && (
          <div className="px-4 mb-6 animate-fade-in">
            <BadgeCollection currentBadge={currentBadge} bingePoints={bingePoints} />
          </div>
        )}

        <div className="px-4 mb-6 animate-fade-in">
          <AboutMeSection 
            bio={profile?.bio || ''} 
            onSave={handleBioSave}
            isOwner={true}
          />
        </div>

        <div className="px-4 mb-6 animate-fade-in">
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
          <TabsList className="w-full grid grid-cols-3 rounded-t-2xl bg-background/80 backdrop-blur-lg sticky top-0 z-10">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
            <TabsTrigger value="lists">Lists</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0 px-4 bg-card/50 rounded-b-2xl border-x border-b border-border/20">
            <UserPosts userId={user!.id} />
          </TabsContent>

          <TabsContent value="ratings" className="mt-0 px-4 bg-card/50 rounded-b-2xl border-x border-b border-border/20">
            <UnifiedRatings userId={user!.id} />
          </TabsContent>

          <TabsContent value="lists" className="mt-0 px-4 bg-card/50 rounded-b-2xl border-x border-b border-border/20">
            <UserLists />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
