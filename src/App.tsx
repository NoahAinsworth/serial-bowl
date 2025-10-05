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
import ProfilePage from "./pages/ProfilePage";
import UserProfilePage from "./pages/UserProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import SettingsPage from "./pages/SettingsPage";
import ShowDetailPage from "./pages/ShowDetailPage";
import SeasonDetailPage from "./pages/SeasonDetailPage";
import EpisodeDetailPage from "./pages/EpisodeDetailPage";
import DMsPage from "./pages/DMsPage";
import DMThreadPage from "./pages/DMThreadPage";
import WatchlistPage from "./pages/WatchlistPage";
import StatsPage from "./pages/StatsPage";
import NotFound from "./pages/NotFound";

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
                <Route path="/user/:userId" element={<UserProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/show/:id" element={<ShowDetailPage />} />
                <Route path="/show/:showId/season/:seasonNumber" element={<SeasonDetailPage />} />
                <Route path="/show/:showId/season/:seasonNumber/episode/:episodeNumber" element={<EpisodeDetailPage />} />
                <Route path="/dms" element={<DMsPage />} />
                <Route path="/dms/:userId" element={<DMThreadPage />} />
                <Route path="/watchlist" element={<WatchlistPage />} />
                <Route path="/stats" element={<StatsPage />} />
                {/* ADD ALL CUSTOM  ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
