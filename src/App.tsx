import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "./components/layouts/AppLayout";
import { OfflineBanner } from "./components/OfflineBanner";
import { useDeepLink } from "./hooks/useDeepLink";
import Index from "./pages/Index";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import SearchPage from "./pages/SearchPage";
import ShowDetailPage from "./pages/ShowDetailPage";
import SeasonDetailPage from "./pages/SeasonDetailPage";
import EpisodeDetailPage from "./pages/EpisodeDetailPage";
import ProfilePage from "./pages/ProfilePage";
import UserProfilePage from "./pages/UserProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import SettingsPage from "./pages/SettingsPage";
import WatchlistPage from "./pages/WatchlistPage";
import WatchedPage from "./pages/WatchedPage";
import ListsPage from "./pages/ListsPage";
import ListDetailPage from "./pages/ListDetailPage";
import ActivityPage from "./pages/ActivityPage";
import DiscoverPage from "./pages/DiscoverPage";
import StatsPage from "./pages/StatsPage";
import PostPage from "./pages/PostPage";
import DMsPage from "./pages/DMsPage";
import DMThreadPage from "./pages/DMThreadPage";
import FollowersPage from "./pages/FollowersPage";
import FollowingPage from "./pages/FollowingPage";
import BingePage from "./pages/BingePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppRouter() {
  useDeepLink();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <OfflineBanner />
      <Routes>
                <Route path="/" element={<AppLayout><Index /></AppLayout>} />
                <Route path="/home" element={<AppLayout><Home /></AppLayout>} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/search" element={<AppLayout><SearchPage /></AppLayout>} />
                <Route path="/show/:id" element={<AppLayout><ShowDetailPage /></AppLayout>} />
                <Route path="/show/:showId/season/:seasonNumber" element={<AppLayout><SeasonDetailPage /></AppLayout>} />
                <Route path="/show/:showId/season/:seasonNumber/episode/:episodeNumber" element={<AppLayout><EpisodeDetailPage /></AppLayout>} />
                <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
                <Route path="/user/:handle" element={<AppLayout><UserProfilePage /></AppLayout>} />
                <Route path="/profile/edit" element={<AppLayout><EditProfilePage /></AppLayout>} />
                <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
                <Route path="/watchlist" element={<AppLayout><WatchlistPage /></AppLayout>} />
                <Route path="/watched" element={<AppLayout><WatchedPage /></AppLayout>} />
                <Route path="/lists" element={<AppLayout><ListsPage /></AppLayout>} />
                <Route path="/list/:id" element={<AppLayout><ListDetailPage /></AppLayout>} />
                <Route path="/activity" element={<AppLayout><ActivityPage /></AppLayout>} />
                <Route path="/discover" element={<AppLayout><DiscoverPage /></AppLayout>} />
                <Route path="/stats" element={<AppLayout><StatsPage /></AppLayout>} />
                <Route path="/post" element={<AppLayout><PostPage /></AppLayout>} />
                <Route path="/dms" element={<AppLayout><DMsPage /></AppLayout>} />
                <Route path="/dms/:userId" element={<AppLayout><DMThreadPage /></AppLayout>} />
                <Route path="/followers" element={<AppLayout><FollowersPage /></AppLayout>} />
                <Route path="/followers/:userId" element={<AppLayout><FollowersPage /></AppLayout>} />
                <Route path="/following" element={<AppLayout><FollowingPage /></AppLayout>} />
                <Route path="/following/:userId" element={<AppLayout><FollowingPage /></AppLayout>} />
                <Route path="/binge" element={<AppLayout><BingePage /></AppLayout>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
