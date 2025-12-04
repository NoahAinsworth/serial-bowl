import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';
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
}

export default function BingeBoardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<{
    badge: string | null;
    bingePoints: number;
    showScore: number;
    dailyPointsEarned: number;
  } | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);

    // Fetch top 100 users by binge_points
    const { data: topUsers } = await supabase
      .from('profiles')
      .select('id, handle, avatar_url, binge_points, badge_tier, show_score')
      .order('binge_points', { ascending: false })
      .limit(100);

    if (topUsers) {
      setLeaderboard(topUsers);

      // Find current user's rank
      if (user) {
        const userIndex = topUsers.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          setUserRank(userIndex + 1);
          const userData = topUsers[userIndex];
          
          // Get daily points earned
          const { data: profileData } = await supabase
            .from('profiles')
            .select('daily_points_earned, daily_points_reset_at')
            .eq('id', user.id)
            .single();
          
          // Reset if new day
          const resetAt = profileData?.daily_points_reset_at 
            ? new Date(profileData.daily_points_reset_at) 
            : new Date(0);
          const today = new Date();
          const isNewDay = resetAt.toDateString() !== today.toDateString();
          
          setCurrentUserData({
            badge: userData.badge_tier,
            bingePoints: userData.binge_points || 0,
            showScore: userData.show_score || 0,
            dailyPointsEarned: isNewDay ? 0 : (profileData?.daily_points_earned || 0)
          });
        } else {
          // User not in top 100, get their data directly
          const { data: userData } = await supabase
            .from('profiles')
            .select('binge_points, badge_tier, show_score, daily_points_earned, daily_points_reset_at')
            .eq('id', user.id)
            .single();
          
          if (userData) {
            // Get rank
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .gt('binge_points', userData.binge_points || 0);
            
            setUserRank((count || 0) + 1);
            
            // Reset if new day
            const resetAt = userData.daily_points_reset_at 
              ? new Date(userData.daily_points_reset_at) 
              : new Date(0);
            const today = new Date();
            const isNewDay = resetAt.toDateString() !== today.toDateString();
            
            setCurrentUserData({
              badge: userData.badge_tier,
              bingePoints: userData.binge_points || 0,
              showScore: userData.show_score || 0,
              dailyPointsEarned: isNewDay ? 0 : (userData.daily_points_earned || 0)
            });
          }
        }
      }
    }

    setLoading(false);
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

        {/* Earn Points Card */}
        {user && currentUserData && (
          <div className="px-4 mb-6">
            <EarnPointsCard
              bingePoints={currentUserData.bingePoints}
              showScore={currentUserData.showScore}
              dailyPointsEarned={currentUserData.dailyPointsEarned}
              dailyCap={200}
            />
          </div>
        )}

        {/* Your Rank Card */}
        {user && userRank && currentUserData && (
          <div className="px-4 mb-6">
            <Card className="p-4 bg-card/70 backdrop-blur-md border-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Your Rank</p>
                  <p className="text-2xl font-bold">#{userRank}</p>
                </div>
                {currentUserData.badge && (
                  <BadgeDisplay badge={currentUserData.badge} size="md" />
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Leaderboard */}
        <div className="px-4 space-y-3">
          {leaderboard.map((leaderUser, index) => {
            const rank = index + 1;
            const isCurrentUser = user?.id === leaderUser.id;

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
                      className="text-sm text-white/90" 
                      style={{ 
                        textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                      }}
                    >
                      {leaderUser.binge_points.toLocaleString()} points
                    </div>
                    <div 
                      className="text-xs text-white/70" 
                      style={{ 
                        textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                      }}
                    >
                      {(leaderUser.show_score || 0).toLocaleString()} episodes
                    </div>
                  </div>

                  {/* Badge */}
                  {leaderUser.badge_tier && (
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
          })}
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
