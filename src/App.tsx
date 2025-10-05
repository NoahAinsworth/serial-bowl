import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { Settings, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import SearchPage from "./pages/SearchPage";
import PostPage from "./pages/PostPage";
import ActivityPage from "./pages/ActivityPage";
import EditProfilePage from "./pages/EditProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

// Simple working components
const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  if (!user) return null;

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card className="p-6">
        <div className="flex gap-4 mb-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
              {user.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{profile?.handle || 'My Profile'}</h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile/edit')}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </Card>
      <div className="mt-6 grid gap-4">
        <Button onClick={() => navigate('/search')} variant="outline" className="w-full">Search TV Shows</Button>
        <Button onClick={() => navigate('/post')} className="w-full btn-glow">Create Post</Button>
      </div>
    </div>
  );
};

const SimplePage = ({ title }: { title: string }) => (
  <div className="container max-w-4xl mx-auto py-6 px-4">
    <Card className="p-6">
      <h1 className="text-2xl font-bold neon-glow">{title}</h1>
      <p className="text-sm mt-4 text-muted-foreground">Coming soon!</p>
    </Card>
  </div>
);

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
                <Route path="/show/:id" element={<SimplePage title="Show Details" />} />
                <Route path="/show/:showId/season/:seasonNumber" element={<SimplePage title="Season Details" />} />
                <Route path="/show/:showId/season/:seasonNumber/episode/:episodeNumber" element={<SimplePage title="Episode Details" />} />
                <Route path="/watchlist" element={<SimplePage title="Watchlist" />} />
                <Route path="/watched" element={<SimplePage title="Watched" />} />
                <Route path="/lists" element={<SimplePage title="My Lists" />} />
                <Route path="/list/:listId" element={<SimplePage title="List Details" />} />
                <Route path="/stats" element={<SimplePage title="Stats" />} />
                <Route path="/discover" element={<SimplePage title="Discover" />} />
                <Route path="/user/:userId" element={<SimplePage title="User Profile" />} />
                <Route path="/dms" element={<SimplePage title="Messages" />} />
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
