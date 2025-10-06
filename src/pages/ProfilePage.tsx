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

  const addToTop3 = async (show: any) => {
    if (top3Shows.length >= 3) {
      toast({
        title: "Maximum reached",
        description: "You can only have 3 shows in your top 3",
        variant: "destructive",
      });
      return;
    }

    // Check if show already exists in top 3
    if (top3Shows.some(s => s.id === show.id)) {
      toast({
        title: "Already added",
        description: "This show is already in your top 3",
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

    const newTop3 = [...top3Shows, showData];
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
      description: `${show.name} added to your top 3 shows`,
    });

    setShowTop3Dialog(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFromTop3 = async (showId: string) => {
    const newTop3 = top3Shows.filter(show => show.id !== showId);
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
      description: "Show removed from your top 3",
    });
  };

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/user/${user?.id}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Profile link copied!",
      description: "Share your profile with others",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      {/* Action Buttons - Top Left */}
      <div className="mb-4 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/dms')}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Messages
        </Button>
      </div>

      {/* Header Section */}
      <Card 
        className="p-6 mb-6 card-enhanced profile-card-grain"
        style={{ 
          '--banner-color': (profile?.settings as any)?.bannerColor || 'hsl(280, 100%, 70%)' 
        } as React.CSSProperties}
      >
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <Avatar className="h-24 w-24 relative z-10">
            <AvatarImage src={profile?.avatar_url} alt={profile?.handle} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-3xl">
              {profile?.handle?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                {profile?.settings?.displayName && (
                  <h1 className="text-2xl font-bold text-white drop-shadow-lg">{profile.settings.displayName}</h1>
                )}
                <p className="text-white/90 drop-shadow-md">{profile?.handle || 'user'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleShare} title="Share profile" className="text-white hover:bg-white/20">
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate('/profile/edit')} title="Edit profile" className="text-white hover:bg-white/20">
                  <Edit className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm mb-4 text-white/85 drop-shadow-md">{profile.bio}</p>
            )}

            {/* Counts Row */}
            <div className="flex gap-6 text-sm">
              <button 
                className="hover:underline text-white drop-shadow-md"
                onClick={() => toast({ title: "Coming soon", description: "Thoughts list will be shown here" })}
              >
                <span className="font-bold">{stats.thoughtsCount}</span>{' '}
                <span className="text-white/80">Posts</span>
              </button>
              <button 
                className="hover:underline text-white drop-shadow-md"
                onClick={() => navigate('/followers')}
              >
                <span className="font-bold">{stats.followersCount}</span>{' '}
                <span className="text-white/80">Followers</span>
              </button>
              <button 
                className="hover:underline text-white drop-shadow-md"
                onClick={() => navigate('/following')}
              >
                <span className="font-bold">{stats.followingCount}</span>{' '}
                <span className="text-white/80">Following</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Top 3 Shows Section */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Top 3 Shows</h2>
          {top3Shows.length < 3 && (
            <Dialog open={showTop3Dialog} onOpenChange={setShowTop3Dialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Show
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Top 3</DialogTitle>
                  <DialogDescription>Search and add a show to your top 3</DialogDescription>
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
                          onClick={() => addToTop3(show)}
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
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {top3Shows.map((show, index) => (
            <div key={show.id} className="text-center relative group">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                onClick={() => removeFromTop3(show.id)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div 
                className="aspect-[2/3] bg-muted rounded-lg mb-2 overflow-hidden cursor-pointer"
                onClick={() => navigate(`/show/${show.external_id}`)}
              >
                {show.poster_url ? (
                  <img src={show.poster_url} alt={show.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted-foreground">#{index + 1}</span>
                  </div>
                )}
              </div>
              <p className="text-xs font-medium truncate">{show.title}</p>
            </div>
          ))}
          {[...Array(3 - top3Shows.length)].map((_, i) => (
            <div key={`empty-${i}`} className="text-center">
              <div className="aspect-[2/3] bg-muted rounded-lg mb-2 flex items-center justify-center">
                <span className="text-muted-foreground">#{top3Shows.length + i + 1}</span>
              </div>
              <p className="text-xs text-muted-foreground">Empty Slot</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="shows">Shows</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
          <TabsTrigger value="lists">Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Thoughts</h3>
            <UserThoughts userId={user!.id} />
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Reviews</h3>
            <UserReviews userId={user!.id} />
          </div>
        </TabsContent>

        <TabsContent value="shows" className="mt-6">
          <UserRatings userId={user!.id} contentKind="show" />
        </TabsContent>

        <TabsContent value="seasons" className="mt-6">
          <UserRatings userId={user!.id} contentKind="season" />
        </TabsContent>

        <TabsContent value="episodes" className="mt-6">
          <UserRatings userId={user!.id} contentKind="episode" />
        </TabsContent>

        <TabsContent value="lists" className="mt-6">
          <UserLists />
        </TabsContent>
      </Tabs>

    </div>
  );
}
