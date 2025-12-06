import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Award, Loader2, Zap, Tv } from 'lucide-react';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { DynamicBackground } from '@/components/DynamicBackground';
import { EarnPointsCard } from '@/components/EarnPointsCard';

interface LeaderboardUser {
  id: string;
  handle: string;
  avatar_url: string | null;
  binge_points: number;
  badge_tier: string | null;
  show_score: number;
  binge_score: number;
}

type SortField = 'binge_score' | 'binge_points' | 'show_score';

export default function BingeBoardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [activeTab, setActiveTab] = useState<SortField>('binge_score');
  const [userRanks, setUserRanks] = useState<Record<SortField, number | null>>({
    binge_score: null,
    binge_points: null,
    show_score: null
  });
  const [currentUserData, setCurrentUserData] = useState<{
    badge: string | null;
    bingePoints: number;
    showScore: number;
    bingeScore: number;
    dailyPointsEarned: number;
  } | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);

    // Fetch top 100 users by binge_score (we'll sort client-side for other tabs)
    const { data: topUsers } = await supabase
      .from('profiles')
      .select('id, handle, avatar_url, binge_points, badge_tier, show_score, binge_score')
      .order('binge_score', { ascending: false })
      .limit(100);

    if (topUsers) {
      setLeaderboard(topUsers);

      // Find current user's data and ranks
      if (user) {
        const userInList = topUsers.find(u => u.id === user.id);
        
        // Get daily points earned
        const { data: profileData } = await supabase
          .from('profiles')
          .select('daily_points_earned, daily_points_reset_at, binge_points, show_score, binge_score, badge_tier')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          // Reset if new day
          const resetAt = profileData.daily_points_reset_at 
            ? new Date(profileData.daily_points_reset_at) 
            : new Date(0);
          const today = new Date();
          const isNewDay = resetAt.toDateString() !== today.toDateString();
          
          setCurrentUserData({
            badge: profileData.badge_tier,
            bingePoints: profileData.binge_points || 0,
            showScore: profileData.show_score || 0,
            bingeScore: profileData.binge_score || 0,
            dailyPointsEarned: isNewDay ? 0 : (profileData.daily_points_earned || 0)
          });

          // Calculate ranks for each metric
          const ranks: Record<SortField, number | null> = {
            binge_score: null,
            binge_points: null,
            show_score: null
          };

          for (const field of ['binge_score', 'binge_points', 'show_score'] as SortField[]) {
            const userValue = profileData[field] || 0;
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .gt(field, userValue);
            ranks[field] = (count || 0) + 1;
          }
          
          setUserRanks(ranks);
        }
      }
    }

    setLoading(false);
  };

  const getSortedLeaderboard = (sortField: SortField) => {
    return [...leaderboard].sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-400/10 border-gray-400/30';
    if (rank === 3) return 'bg-amber-600/10 border-amber-600/30';
    return 'bg-card/70 border-border/30';
  };

  const renderLeaderboardItem = (leaderUser: LeaderboardUser, index: number, sortField: SortField) => {
    const rank = index + 1;
    const isCurrentUser = user?.id === leaderUser.id;
    
    const getValue = () => {
      switch (sortField) {
        case 'binge_score':
          return `${(leaderUser.binge_score || 0).toLocaleString()} total`;
        case 'binge_points':
          return `${(leaderUser.binge_points || 0).toLocaleString()} pts`;
        case 'show_score':
          return `${(leaderUser.show_score || 0).toLocaleString()} eps`;
      }
    };

    const getSubtext = () => {
      switch (sortField) {
        case 'binge_score':
          return `BP: ${(leaderUser.binge_points || 0).toLocaleString()} | SS: ${(leaderUser.show_score || 0).toLocaleString()}`;
        case 'binge_points':
          return leaderUser.badge_tier || 'Pilot Watcher';
        case 'show_score':
          return 'episodes watched';
      }
    };

    return (
      <Card
        key={leaderUser.id}
        className={`p-4 backdrop-blur-md transition-all hover:scale-[1.02] cursor-pointer ${
          getRankColor(rank)
        } ${
          isCurrentUser ? 'ring-2 ring-primary shadow-lg' : ''
        }`}
        onClick={() => navigate(`/user/${leaderUser.handle}`)}
      >
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className="w-12 text-center">
            {getRankIcon(rank) || (
              <div className="text-2xl font-bold text-foreground/60">
                {rank}
              </div>
            )}
          </div>

          {/* Avatar */}
          <Avatar className={`w-14 h-14 ${
            rank <= 3 ? 'ring-2 ring-offset-2 ring-offset-background' : ''
          } ${
            rank === 1 ? 'ring-yellow-400' : 
            rank === 2 ? 'ring-gray-400' : 
            rank === 3 ? 'ring-amber-600' : ''
          }`}>
            <AvatarImage src={leaderUser.avatar_url || ''} />
            <AvatarFallback>
              {leaderUser.handle[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div 
              className="font-semibold text-white truncate" 
              style={{ 
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
              }}
            >
              {leaderUser.handle.startsWith('@') ? leaderUser.handle : `@${leaderUser.handle}`}
            </div>
            <div 
              className="text-sm text-white/90 font-bold" 
              style={{ 
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
              }}
            >
              {getValue()}
            </div>
            <div 
              className="text-xs text-white/70" 
              style={{ 
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
              }}
            >
              {getSubtext()}
            </div>
          </div>

          {/* Badge (only for binge_points tab) */}
          {sortField === 'binge_points' && leaderUser.badge_tier && (
            <div className="flex-shrink-0">
              <BadgeDisplay 
                badge={leaderUser.badge_tier} 
                size="sm"
                showGlow={rank <= 3}
              />
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 relative bg-yellow-400">
      <DynamicBackground badge={currentUserData?.badge || 'Pilot Watcher'} />
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <h1 
            className="text-3xl font-bold text-white mb-2" 
            style={{ 
              textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 8px rgba(0,0,0,0.9)'
            }}
          >
            Binge Board
          </h1>
          <p 
            className="text-white/70" 
            style={{ 
              textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
            }}
          >
            Top Bingers of Serial Bowl
          </p>
        </div>

        {/* Earn Points Card with BingeScore */}
        {user && currentUserData && (
          <div className="px-4 mb-6">
            <EarnPointsCard
              bingePoints={currentUserData.bingePoints}
              showScore={currentUserData.showScore}
              bingeScore={currentUserData.bingeScore}
              dailyPointsEarned={currentUserData.dailyPointsEarned}
              dailyCap={200}
            />
          </div>
        )}

        {/* Your Rank Card - Dynamic based on active tab */}
        {user && currentUserData && (
          <div className="px-4 mb-6">
            <Card className="p-4 bg-card/70 backdrop-blur-md border-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Your Rank ({activeTab === 'binge_score' ? 'BingeScore' : activeTab === 'binge_points' ? 'Binge Points' : 'Show Score'})
                  </p>
                  <p className="text-2xl font-bold">#{userRanks[activeTab] || '—'}</p>
                </div>
                {currentUserData.badge && (
                  <BadgeDisplay badge={currentUserData.badge} size="md" />
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Tabbed Leaderboards */}
        <div className="px-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SortField)}>
            <TabsList className="grid grid-cols-3 w-full mb-4 h-12 border-2 border-border bg-card/70 backdrop-blur-md">
              <TabsTrigger value="binge_score" className="flex items-center gap-1 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">BingeScore</span>
              </TabsTrigger>
              <TabsTrigger value="binge_points" className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Binge Pts</span>
              </TabsTrigger>
              <TabsTrigger value="show_score" className="flex items-center gap-1 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                <Tv className="h-4 w-4" />
                <span className="hidden sm:inline">Show Score</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="binge_score" className="space-y-3">
              {getSortedLeaderboard('binge_score').map((u, i) => renderLeaderboardItem(u, i, 'binge_score'))}
            </TabsContent>

            <TabsContent value="binge_points" className="space-y-3">
              {getSortedLeaderboard('binge_points').map((u, i) => renderLeaderboardItem(u, i, 'binge_points'))}
            </TabsContent>

            <TabsContent value="show_score" className="space-y-3">
              {getSortedLeaderboard('show_score').map((u, i) => renderLeaderboardItem(u, i, 'show_score'))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Empty State */}
        {leaderboard.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-foreground/70">
              No users on the leaderboard yet!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
