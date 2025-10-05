import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layouts/AppLayout";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import SearchPage from "./pages/SearchPage";
import PostPage from "./pages/PostPage";
import ActivityPage from "./pages/ActivityPage";
import EditProfilePage from "./pages/EditProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

// Simple ProfilePage without complex components
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else {
      loadProfile();
    }
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(data);
  };

  if (!user) return null;

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile?.handle || 'My Profile'}</h2>
              <p className="text-muted-foreground mt-1">{user.email}</p>
              {profile?.bio && (
                <p className="text-sm mt-2">{profile.bio}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile/edit')}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </Card>
      
      <div className="mt-6 grid gap-4">
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

// Simple ShowDetailPage without complex dependencies  
import { useParams } from 'react-router-dom';

const ShowDetailPage = () => {
  const { id } = useParams();
  
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold neon-glow">Show Details</h1>
        <p className="text-muted-foreground mt-2">Show ID: {id}</p>
        <p className="text-sm mt-4">Full show details coming soon!</p>
      </Card>
    </div>
  );
};

const SeasonDetailPage = () => {
  const { showId, seasonNumber } = useParams();
  
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">Season {seasonNumber}</h1>
        <p className="text-muted-foreground mt-2">Show ID: {showId}</p>
        <p className="text-sm mt-4">Season details coming soon!</p>
      </Card>
    </div>
  );
};

const EpisodeDetailPage = () => {
  const { showId, seasonNumber, episodeNumber } = useParams();
  
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">Episode {episodeNumber}</h1>
        <p className="text-muted-foreground mt-2">Season {seasonNumber} - Show ID: {showId}</p>
        <p className="text-sm mt-4">Episode details coming soon!</p>
      </Card>
    </div>
  );
};

const WatchlistPage = () => {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">My Watchlist</h1>
        <p className="text-sm mt-4">Your watchlist coming soon!</p>
      </Card>
    </div>
  );
};

const WatchedPage = () => {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">Watched</h1>
        <p className="text-sm mt-4">Your watched content coming soon!</p>
      </Card>
    </div>
  );
};

const ListsPage = () => {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">My Lists</h1>
        <p className="text-sm mt-4">Your lists coming soon!</p>
      </Card>
    </div>
  );
};

const ListDetailPage = () => {
  const { id } = useParams();
  
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">List Details</h1>
        <p className="text-muted-foreground mt-2">List ID: {id}</p>
        <p className="text-sm mt-4">List details coming soon!</p>
      </Card>
    </div>
  );
};

const StatsPage = () => {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">Stats</h1>
        <p className="text-sm mt-4">Your stats coming soon!</p>
      </Card>
    </div>
  );
};

const DiscoverPage = () => {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">Discover</h1>
        <p className="text-sm mt-4">Discover new shows coming soon!</p>
      </Card>
    </div>
  );
};

const UserProfilePage = () => {
  const { handle } = useParams();
  
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">@{handle}</h1>
        <p className="text-sm mt-4">User profile coming soon!</p>
      </Card>
    </div>
  );
};

const DMsPage = () => {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm mt-4">Your messages coming soon!</p>
      </Card>
    </div>
  );
};

const DMThreadPage = () => {
  const { userId } = useParams();
  
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">Conversation</h1>
        <p className="text-muted-foreground mt-2">User ID: {userId}</p>
        <p className="text-sm mt-4">Chat coming soon!</p>
      </Card>
    </div>
  );
};

const queryClient = new QueryClient();

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
                <Route path="/show/:id" element={<ShowDetailPage />} />
                <Route path="/show/:showId/season/:seasonNumber" element={<SeasonDetailPage />} />
                <Route path="/show/:showId/season/:seasonNumber/episode/:episodeNumber" element={<EpisodeDetailPage />} />
                <Route path="/watchlist" element={<WatchlistPage />} />
                <Route path="/watched" element={<WatchedPage />} />
                <Route path="/lists" element={<ListsPage />} />
                <Route path="/list/:id" element={<ListDetailPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/user/:handle" element={<UserProfilePage />} />
                <Route path="/dms" element={<DMsPage />} />
                <Route path="/dm/:userId" element={<DMThreadPage />} />
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
