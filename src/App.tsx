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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Settings } from 'lucide-react';

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">My Profile</h2>
              <p className="text-muted-foreground mt-1">{user.email}</p>
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
