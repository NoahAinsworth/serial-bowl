import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Edit, Loader2, Share2, MessageSquare, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserRatings } from '@/components/UserRatings';
import { UserThoughts } from '@/components/UserThoughts';
import { UserLists } from '@/components/UserLists';
import { UserReviews } from '@/components/UserReviews';
import { FollowRequestsList } from '@/components/FollowRequestsList';
import { Input } from '@/components/ui/input';
import { useTVDB } from '@/hooks/useTVDB';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { search: searchTVDB } = useTVDB();
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
  const [postType, setPostType] = useState<'all' | 'thoughts' | 'reviews'>('all');

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
      .select('handle, bio, avatar_url, settings')
      .eq('id', user.id)
      .maybeSingle();

    // Get counts
    const [thoughtsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('thoughts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);

    setProfile(profileData);
    console.log('Profile data loaded:', profileData);
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
    // Check if show already exists in a different slot
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

    // Create a new array with 3 slots, preserving existing shows
    const newTop3 = [...top3Shows];
    // Ensure array has 3 slots
    while (newTop3.length < 3) {
      newTop3.push(null);
    }
    // Place the show in the selected slot
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
      title: "Added to Top 3",
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
      title: "Removed from Top 3",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* Follow Requests List */}
      <div className="px-4">
        <FollowRequestsList />
      </div>

      {/* Header Section */}
      <div className="px-4 py-6 border-b border-border/30">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
          {/* Avatar */}
          <Avatar className="h-24 w-24 relative z-10 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url} alt={profile?.handle} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-3xl">
              {profile?.handle?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Profile Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-2 gap-2">
              <div>
                {profile?.settings?.displayName && (
                  <h1 className="text-2xl font-bold text-foreground">{profile.settings.displayName}</h1>
                )}
                <p className="text-muted-foreground">{profile?.handle || 'user'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleShare} title="Share profile">
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate('/profile/edit')} title="Edit profile">
                  <Edit className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm mb-4 text-muted-foreground">{profile.bio}</p>
            )}

            {/* Counts Row */}
            <div className="flex gap-6 text-sm justify-center sm:justify-start">
              <button 
                className="hover:underline"
                onClick={() => toast({ title: "Coming soon", description: "Thoughts list will be shown here" })}
              >
                <span className="font-bold text-foreground">{stats.thoughtsCount}</span>{' '}
                <span className="text-muted-foreground">Thoughts</span>
              </button>
              <button 
                className="hover:underline"
                onClick={() => navigate('/followers')}
              >
                <span className="font-bold text-foreground">{stats.followersCount}</span>{' '}
                <span className="text-muted-foreground">Followers</span>
              </button>
              <button 
                className="hover:underline"
                onClick={() => navigate('/following')}
              >
                <span className="font-bold text-foreground">{stats.followingCount}</span>{' '}
                <span className="text-muted-foreground">Following</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Shows Section */}
      <div className="px-4 py-6 border-b border-border/30">
        <h2 className="text-xl font-bold text-center mb-4">Top 3</h2>
        <Dialog open={showTop3Dialog} onOpenChange={(open) => {
          setShowTop3Dialog(open);
          if (!open) {
            setSelectedSlot(null);
            setSearchQuery('');
            setSearchResults([]);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedSlot !== null ? `Edit Slot #${selectedSlot + 1}` : 'Add to Top 3'}
              </DialogTitle>
              <DialogDescription>
                {selectedSlot !== null 
                  ? `Select a show for position #${selectedSlot + 1}` 
                  : 'Search and add a show to your top 3'}
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
                      className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted"
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
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((slotIndex) => {
            const show = top3Shows[slotIndex];
            return (
              <div key={slotIndex} className="text-center relative group">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
                    onClick={() => openSlotDialog(slotIndex)}
                    title={show ? "Edit show" : "Add show"}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {show && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 left-2 z-10 bg-background/80 hover:bg-background"
                      onClick={() => removeFromTop3(slotIndex)}
                      title="Remove show"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <div 
                    className="aspect-[2/3] bg-muted rounded-lg mb-2 overflow-hidden cursor-pointer"
                    onClick={() => show ? navigate(`/show/${show.external_id}`) : openSlotDialog(slotIndex)}
                  >
                    {show?.poster_url ? (
                      <img src={show.poster_url} alt={show.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-muted-foreground">#{slotIndex + 1}</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs font-medium truncate">
                  {show?.title || 'Empty Slot'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="posts" className="w-full mt-0">
        <TabsList className="w-full grid grid-cols-5 rounded-none border-b border-border/30 bg-background/80 backdrop-blur-lg sticky top-0 z-10">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="shows">Shows</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
          <TabsTrigger value="lists">Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0 px-4">
          {/* Secondary Filter Tabs */}
          <div className="mb-4">
            <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
              <button
                onClick={() => setPostType('all')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                  postType === 'all' ? 'bg-background text-foreground shadow-sm' : ''
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPostType('thoughts')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                  postType === 'thoughts' ? 'bg-background text-foreground shadow-sm' : ''
                }`}
              >
                Thoughts
              </button>
              <button
                onClick={() => setPostType('reviews')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                  postType === 'reviews' ? 'bg-background text-foreground shadow-sm' : ''
                }`}
              >
                Reviews
              </button>
            </div>
          </div>

          {postType === 'all' && (
            <div className="space-y-6">
              <UserThoughts userId={user!.id} />
              <UserReviews userId={user!.id} />
            </div>
          )}
          {postType === 'thoughts' && <UserThoughts userId={user!.id} />}
          {postType === 'reviews' && <UserReviews userId={user!.id} />}
        </TabsContent>

        <TabsContent value="shows" className="mt-0 px-4">
          <UserRatings userId={user!.id} contentKind="show" />
        </TabsContent>

        <TabsContent value="seasons" className="mt-0 px-4">
          <UserRatings userId={user!.id} contentKind="season" />
        </TabsContent>

        <TabsContent value="episodes" className="mt-0 px-4">
          <UserRatings userId={user!.id} contentKind="episode" />
        </TabsContent>

        <TabsContent value="lists" className="mt-0 px-4">
          <UserLists />
        </TabsContent>
      </Tabs>

    </div>
  );
}
