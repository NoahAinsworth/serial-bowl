import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { Settings, Loader2, Compass, List, Bookmark, Eye, TrendingUp, MessageSquare, Trash2, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import SearchPage from "./pages/SearchPage";
import EditProfilePage from "./pages/EditProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Profile Page
const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                {user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{profile?.handle || 'My Profile'}</h2>
              <p className="text-muted-foreground mt-1">{user.email}</p>
              {profile?.bio && <p className="text-sm mt-2">{profile.bio}</p>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile/edit')}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </Card>
      
      <div className="grid gap-4">
        <Button onClick={() => navigate('/search')} variant="outline" className="w-full">
          Search TV Shows
        </Button>
        <Button onClick={() => navigate('/post')} className="w-full btn-glow">
          Create Post
        </Button>
      </div>
    </div>
  );
};

// Simple Post Page
const PostPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    if (!content.trim()) return;

    setPosting(true);
    const { error } = await supabase.from('thoughts').insert({
      user_id: user.id,
      text_content: content.trim(),
      moderation_status: 'allow',
    });

    if (error) {
      toast({ title: "Error", description: "Failed to post", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Thought posted!" });
      setContent('');
      navigate('/');
    }
    setPosting(false);
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-bold">Share Your Thoughts</h2>
        <Textarea
          placeholder="What's on your mind about TV?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[150px]"
          maxLength={500}
        />
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">{content.length} / 500</span>
        </div>
        <Button onClick={handlePost} disabled={!content.trim() || posting} className="w-full btn-glow">
          {posting ? 'Posting...' : 'Post Thought'}
        </Button>
      </Card>
    </div>
  );
};

// Simple Activity Page
const ActivityPage = () => {
  const { user } = useAuth();

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6 neon-glow">Activity</h1>
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          {user ? 'No notifications yet!' : 'Sign in to see your notifications'}
        </p>
      </Card>
    </div>
  );
};

// Watchlist & Watched combined page
const WatchlistPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [watched, setWatched] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    const [watchlistRes, watchedRes] = await Promise.all([
      supabase.from('watchlist').select('*, content(*)').eq('user_id', user.id),
      supabase.from('watched').select('*, content(*)').eq('user_id', user.id)
    ]);

    setWatchlist(watchlistRes.data || []);
    setWatched(watchedRes.data || []);
    setLoading(false);
  };

  if (!user) return (
    <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
      <p className="text-muted-foreground">Sign in to view your watchlist</p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Tabs defaultValue="watchlist" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="watchlist"><Bookmark className="h-4 w-4 mr-2" />Watchlist</TabsTrigger>
          <TabsTrigger value="watched"><Eye className="h-4 w-4 mr-2" />Watched</TabsTrigger>
        </TabsList>
        
        <TabsContent value="watchlist">
          {watchlist.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">Your watchlist is empty</p>
              <Button onClick={() => navigate('/search')} className="btn-glow">Find Shows</Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {watchlist.map((item) => (
                <Card key={item.id} className="p-4">
                  <p className="font-bold">{item.content?.title || 'Unknown'}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="watched">
          {watched.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No watched shows yet</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {watched.map((item) => (
                <Card key={item.id} className="p-4">
                  <p className="font-bold">{item.content?.title || 'Unknown'}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Lists Page
const ListsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadLists();
  }, [user]);

  const loadLists = async () => {
    if (!user) return;
    const { data } = await supabase.from('custom_lists').select('*').eq('user_id', user.id);
    setLists(data || []);
    setLoading(false);
  };

  if (!user) return (
    <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
      <p className="text-muted-foreground">Sign in to view your lists</p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <List className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold neon-glow">My Lists</h1>
      </div>
      {lists.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No lists created yet</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {lists.map((list) => (
            <Card key={list.id} className="p-4 hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate(`/list/${list.id}`)}>
              <h3 className="font-bold">{list.name}</h3>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Stats Page
const StatsPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ ratings: 0, thoughts: 0, followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    
    const [ratings, thoughts, followers, following] = await Promise.all([
      supabase.from('ratings').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('thoughts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);

    setStats({
      ratings: ratings.count || 0,
      thoughts: thoughts.count || 0,
      followers: followers.count || 0,
      following: following.count || 0,
    });
    setLoading(false);
  };

  if (!user) return (
    <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
      <p className="text-muted-foreground">Sign in to view your stats</p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold neon-glow">Your Stats</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-6 text-center">
          <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
          <p className="text-2xl font-bold">{stats.ratings}</p>
          <p className="text-sm text-muted-foreground">Ratings</p>
        </Card>
        <Card className="p-6 text-center">
          <MessageSquare className="h-6 w-6 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold">{stats.thoughts}</p>
          <p className="text-sm text-muted-foreground">Thoughts</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-2xl font-bold">{stats.followers}</p>
          <p className="text-sm text-muted-foreground">Followers</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-2xl font-bold">{stats.following}</p>
          <p className="text-sm text-muted-foreground">Following</p>
        </Card>
      </div>
    </div>
  );
};

// Discover Page
const DiscoverPage = () => {
  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Compass className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold neon-glow">Discover</h1>
      </div>
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Browse trending and recommended shows coming soon!</p>
      </Card>
    </div>
  );
};

// DMs Page
const DMsPage = () => {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold neon-glow">Messages</h1>
      </div>
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Direct messages coming soon!</p>
      </Card>
    </div>
  );
};

// Placeholder for other pages
const SimplePage = ({ title }: { title: string }) => (
  <div className="container max-w-4xl mx-auto py-6 px-4">
    <Card className="p-6">
      <h1 className="text-2xl font-bold neon-glow">{title}</h1>
      <p className="text-sm mt-4 text-muted-foreground">Coming soon!</p>
    </Card>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/post" element={<PostPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/edit" element={<EditProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/user/:userId" element={<SimplePage title="User Profile" />} />
                <Route path="/show/:id" element={<SimplePage title="Show Details" />} />
                <Route path="/show/:showId/season/:seasonNumber" element={<SimplePage title="Season Details" />} />
                <Route path="/show/:showId/season/:seasonNumber/episode/:episodeNumber" element={<SimplePage title="Episode Details" />} />
                <Route path="/watchlist" element={<WatchlistPage />} />
                <Route path="/watched" element={<WatchlistPage />} />
                <Route path="/lists" element={<ListsPage />} />
                <Route path="/list/:listId" element={<SimplePage title="List Details" />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/dms" element={<DMsPage />} />
                <Route path="/dm/:userId" element={<SimplePage title="Chat" />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
