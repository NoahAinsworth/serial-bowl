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
import { supabase } from '@/lib/supabase';
import { Settings } from 'lucide-react';
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

// Post Page
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

// Activity Page
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

// Simple placeholder
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
                <Route path="/discover" element={<SimplePage title="Discover" />} />
                <Route path="/lists" element={<SimplePage title="My Lists" />} />
                <Route path="/list/:listId" element={<SimplePage title="List Details" />} />
                <Route path="/watchlist" element={<SimplePage title="Watchlist & Watched" />} />
                <Route path="/watched" element={<SimplePage title="Watchlist & Watched" />} />
                <Route path="/stats" element={<SimplePage title="Stats" />} />
                <Route path="/dms" element={<SimplePage title="Messages" />} />
                <Route path="/dm/:userId" element={<SimplePage title="Chat" />} />
                <Route path="/user/:userId" element={<SimplePage title="User Profile" />} />
                <Route path="/show/:id" element={<SimplePage title="Show Details" />} />
                <Route path="/show/:showId/season/:seasonNumber" element={<SimplePage title="Season Details" />} />
                <Route path="/show/:showId/season/:seasonNumber/episode/:episodeNumber" element={<SimplePage title="Episode Details" />} />
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
