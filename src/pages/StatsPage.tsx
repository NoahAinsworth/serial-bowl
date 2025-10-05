import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, TrendingUp, Star, MessageSquare, Heart, Trophy } from 'lucide-react';

interface UserStats {
  totalRatings: number;
  avgRating: number;
  totalThoughts: number;
  totalComments: number;
  totalFollowers: number;
  totalFollowing: number;
  favoriteGenres: string[];
  recentActivity: number;
}

export default function StatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    const [ratingsData, thoughtsData, commentsData, followersData, followingData] = await Promise.all([
      supabase.from('ratings').select('rating').eq('user_id', user.id),
      supabase.from('thoughts').select('id').eq('user_id', user.id),
      supabase.from('comments').select('id').eq('user_id', user.id),
      supabase.from('follows').select('id').eq('following_id', user.id),
      supabase.from('follows').select('id').eq('follower_id', user.id),
    ]);

    const totalRatings = ratingsData.data?.length || 0;
    const avgRating = totalRatings > 0
      ? ratingsData.data!.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    // Get recent activity count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentThoughts } = await supabase
      .from('thoughts')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    setStats({
      totalRatings,
      avgRating,
      totalThoughts: thoughtsData.data?.length || 0,
      totalComments: commentsData.data?.length || 0,
      totalFollowers: followersData.data?.length || 0,
      totalFollowing: followingData.data?.length || 0,
      favoriteGenres: [],
      recentActivity: recentThoughts?.length || 0,
    });

    setLoading(false);
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-muted-foreground">Please sign in to view your stats</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      icon: Star,
      label: 'Total Ratings',
      value: stats.totalRatings,
      color: 'text-yellow-500',
    },
    {
      icon: TrendingUp,
      label: 'Average Rating',
      value: stats.avgRating.toFixed(1),
      color: 'text-blue-500',
    },
    {
      icon: MessageSquare,
      label: 'Thoughts Posted',
      value: stats.totalThoughts,
      color: 'text-green-500',
    },
    {
      icon: Heart,
      label: 'Comments',
      value: stats.totalComments,
      color: 'text-red-500',
    },
    {
      icon: Trophy,
      label: 'Active Days (30d)',
      value: stats.recentActivity,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold neon-glow">Your Stats</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-6 hover:border-primary/50 transition-all hover-scale">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-background ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Social Stats</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-3xl font-bold text-primary">{stats.totalFollowers}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">{stats.totalFollowing}</p>
            <p className="text-sm text-muted-foreground">Following</p>
          </div>
        </div>
      </Card>

      {stats.totalRatings > 10 && (
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/50">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold text-lg">TV Critic Badge</h3>
              <p className="text-sm text-muted-foreground">Unlocked for rating 10+ shows!</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}