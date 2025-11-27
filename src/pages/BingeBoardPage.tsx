import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { DynamicBackground } from '@/components/DynamicBackground';
import { BingeProgressCard } from '@/components/BingeProgressCard';

interface LeaderboardUser {
  id: string;
  handle: string;
  avatar_url: string | null;
  binge_points: number;
  badge_tier: string | null;
}

export default function BingeBoardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [currentUserBadge, setCurrentUserBadge] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);

    // Fetch top 100 users
    const { data: topUsers } = await supabase
      .from('profiles')
      .select('id, handle, avatar_url, binge_points, badge_tier')
      .order('binge_points', { ascending: false })
      .limit(100);

    if (topUsers) {
      setLeaderboard(topUsers);

      // Find current user's rank
      if (user) {
        const userIndex = topUsers.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          setUserRank(userIndex + 1);
          setCurrentUserBadge(topUsers[userIndex].badge_tier);
        } else {
          // User not in top 100, get their exact rank
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gt('binge_points', topUsers[userIndex]?.binge_points || 0);
          
          setUserRank((count || 0) + 1);

          // Get user's badge
          const { data: userData } = await supabase
            .from('profiles')
            .select('badge_tier')
            .eq('id', user.id)
            .maybeSingle();
          
          setCurrentUserBadge(userData?.badge_tier || null);
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
      <DynamicBackground badge={currentUserBadge || 'Pilot Watcher'} />
      
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

        {/* Current User Progress Card */}
        {user && userRank && currentUserBadge && (
          <div className="px-4 mb-6">
            <BingeProgressCard
              points={leaderboard.find(u => u.id === user.id)?.binge_points || 0}
              badge={currentUserBadge}
              trophiesEarned={(() => {
                const BADGE_TIERS = [
                  { name: 'Pilot Watcher', threshold: 0 },
                  { name: 'Casual Viewer', threshold: 150 },
                  { name: 'Marathon Madness', threshold: 500 },
                  { name: 'Season Smasher', threshold: 1200 },
                  { name: 'Series Finisher', threshold: 2500 },
                  { name: 'Stream Scholar', threshold: 5000 },
                  { name: 'Ultimate Binger', threshold: 10000 },
                ];
                const userPoints = leaderboard.find(u => u.id === user.id)?.binge_points || 0;
                return BADGE_TIERS.filter(t => userPoints >= t.threshold).length;
              })()}
              totalTrophies={7}
              userRank={userRank}
              nextBadge={(() => {
                const BADGE_TIERS = [
                  { name: 'Pilot Watcher', threshold: 0 },
                  { name: 'Casual Viewer', threshold: 150 },
                  { name: 'Marathon Madness', threshold: 500 },
                  { name: 'Season Smasher', threshold: 1200 },
                  { name: 'Series Finisher', threshold: 2500 },
                  { name: 'Stream Scholar', threshold: 5000 },
                  { name: 'Ultimate Binger', threshold: 10000 },
                ];
                const userPoints = leaderboard.find(u => u.id === user.id)?.binge_points || 0;
                const currentIndex = BADGE_TIERS.findIndex(t => t.name === currentUserBadge);
                const nextTier = currentIndex < BADGE_TIERS.length - 1 ? BADGE_TIERS[currentIndex + 1] : null;
                
                if (!nextTier) return null;
                
                const progress = ((userPoints - BADGE_TIERS[currentIndex].threshold) / (nextTier.threshold - BADGE_TIERS[currentIndex].threshold)) * 100;
                
                return {
                  name: nextTier.name,
                  pointsNeeded: nextTier.threshold - userPoints,
                  progress: progress
                };
              })()}
            />
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
