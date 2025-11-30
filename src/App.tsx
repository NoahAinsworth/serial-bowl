import React from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "./components/layouts/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OfflineBanner } from "./components/OfflineBanner";
import { UpdateNotification } from "./components/UpdateNotification";
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
import PostDetailPage from "./pages/PostDetailPage";
import DMsPage from "./pages/DMsPage";
import DMThreadPage from "./pages/DMThreadPage";
import MessagesPage from "./pages/MessagesPage";
import FollowersPage from "./pages/FollowersPage";
import FollowingPage from "./pages/FollowingPage";
import BingePage from "./pages/BingePage";
import BingeBoardPage from "./pages/BingeBoardPage";
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
    <div className="min-h-screen bg-transparent text-foreground">
      <OfflineBanner />
      <UpdateNotification />
      <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/home" element={<ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><AppLayout><SearchPage /></AppLayout></ProtectedRoute>} />
                <Route path="/show/:id" element={<ProtectedRoute><AppLayout><ShowDetailPage /></AppLayout></ProtectedRoute>} />
                <Route path="/show/:showId/season/:seasonNumber" element={<ProtectedRoute><AppLayout><SeasonDetailPage /></AppLayout></ProtectedRoute>} />
                <Route path="/show/:showId/season/:seasonNumber/episode/:episodeNumber" element={<ProtectedRoute><AppLayout><EpisodeDetailPage /></AppLayout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
                <Route path="/user/:handle" element={<ProtectedRoute><AppLayout><UserProfilePage /></AppLayout></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProtectedRoute><AppLayout><EditProfilePage /></AppLayout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
                <Route path="/watchlist" element={<ProtectedRoute><AppLayout><WatchlistPage /></AppLayout></ProtectedRoute>} />
                <Route path="/watched" element={<ProtectedRoute><AppLayout><WatchedPage /></AppLayout></ProtectedRoute>} />
                <Route path="/lists" element={<ProtectedRoute><AppLayout><ListsPage /></AppLayout></ProtectedRoute>} />
                <Route path="/list/:id" element={<ProtectedRoute><AppLayout><ListDetailPage /></AppLayout></ProtectedRoute>} />
                <Route path="/activity" element={<ProtectedRoute><AppLayout><ActivityPage /></AppLayout></ProtectedRoute>} />
                <Route path="/discover" element={<ProtectedRoute><AppLayout><DiscoverPage /></AppLayout></ProtectedRoute>} />
                <Route path="/stats" element={<ProtectedRoute><AppLayout><StatsPage /></AppLayout></ProtectedRoute>} />
                <Route path="/post" element={<ProtectedRoute><AppLayout><PostPage /></AppLayout></ProtectedRoute>} />
                <Route path="/post/:id" element={<ProtectedRoute><AppLayout><PostDetailPage /></AppLayout></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><AppLayout><MessagesPage /></AppLayout></ProtectedRoute>} />
                <Route path="/dm-thread/:conversationId" element={<ProtectedRoute><AppLayout><DMThreadPage /></AppLayout></ProtectedRoute>} />
                <Route path="/followers" element={<ProtectedRoute><AppLayout><FollowersPage /></AppLayout></ProtectedRoute>} />
                <Route path="/user/:userId/followers" element={<ProtectedRoute><AppLayout><FollowersPage /></AppLayout></ProtectedRoute>} />
                <Route path="/following" element={<ProtectedRoute><AppLayout><FollowingPage /></AppLayout></ProtectedRoute>} />
                <Route path="/user/:userId/following" element={<ProtectedRoute><AppLayout><FollowingPage /></AppLayout></ProtectedRoute>} />
                <Route path="/binge" element={<ProtectedRoute><AppLayout><BingePage /></AppLayout></ProtectedRoute>} />
                <Route path="/binge-board" element={<ProtectedRoute><AppLayout><BingeBoardPage /></AppLayout></ProtectedRoute>} />
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
