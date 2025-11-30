import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Tv, TrendingUp, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarHeatmap } from '@/components/stats/CalendarHeatmap';
import { GenreBreakdown } from '@/components/stats/GenreBreakdown';
import { WatchStreak } from '@/components/stats/WatchStreak';
import { TVPersona } from '@/components/stats/TVPersona';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AdvancedStatsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generatingPersona, setGeneratingPersona] = useState(false);
  
  const [stats, setStats] = useState({
    totalHours: 0,
    totalShows: 0,
    totalEpisodes: 0,
    avgRating: 0,
    rewatchCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    peakHour: 0
  });

  const [heatmapData, setHeatmapData] = useState<{ date: string; count: number }[]>([]);
  const [genreData, setGenreData] = useState<{ genre: string; count: number }[]>([]);
  const [persona, setPersona] = useState({
    title: 'Loading...',
    description: ''
  });

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Get watched episodes with timestamps
      const { data: watchedEpisodes } = await supabase
        .from('watched_episodes')
        .select('watched_at, tvdb_id')
        .eq('user_id', user.id);

      // Get watched shows
      const { data: watchedShows } = await supabase
        .from('watched')
        .select('watched_at, content_id, content:content_id(kind, metadata)')
        .eq('user_id', user.id);

      // Calculate heatmap data
      const dateMap = new Map<string, number>();
      watchedEpisodes?.forEach(ep => {
        if (ep.watched_at) {
          const date = new Date(ep.watched_at).toISOString().split('T')[0];
          dateMap.set(date, (dateMap.get(date) || 0) + 1);
        }
      });
      setHeatmapData(Array.from(dateMap.entries()).map(([date, count]) => ({ date, count })));

      // Calculate genre breakdown
      const genreMap = new Map<string, number>();
      watchedShows?.forEach(show => {
        const metadata = show.content?.metadata as any;
        const genres = metadata?.genres || [];
        genres.forEach((genre: string) => {
          genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
        });
      });
      setGenreData(Array.from(genreMap.entries()).map(([genre, count]) => ({ genre, count })));

      // Calculate streaks
      const sortedDates = Array.from(dateMap.keys()).sort();
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      const today = new Date().toISOString().split('T')[0];
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0 || 
            new Date(sortedDates[i]).getTime() - new Date(sortedDates[i-1]).getTime() <= 86400000 * 2) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      
      if (sortedDates.includes(today) || sortedDates.includes(
        new Date(Date.now() - 86400000).toISOString().split('T')[0]
      )) {
        currentStreak = tempStreak;
      }

      // Calculate total hours (estimate 45min per episode)
      const totalMinutes = (watchedEpisodes?.length || 0) * 45;
      const totalHours = Math.round(totalMinutes / 60);

      // Get ratings
      const { data: ratings } = await supabase
        .from('user_ratings')
        .select('score')
        .eq('user_id', user.id)
        .eq('item_type', 'show');

      const avgRating = ratings && ratings.length > 0
        ? Math.round(ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length)
        : 0;

      // Count rewatches (simplified - count shows watched more than once)
      const showCounts = new Map<string, number>();
      watchedShows?.forEach(show => {
        if (show.content_id) {
          showCounts.set(show.content_id, (showCounts.get(show.content_id) || 0) + 1);
        }
      });
      const rewatchCount = Array.from(showCounts.values()).filter(count => count > 1).length;

      setStats({
        totalHours,
        totalShows: watchedShows?.length || 0,
        totalEpisodes: watchedEpisodes?.length || 0,
        avgRating,
        rewatchCount,
        currentStreak,
        longestStreak,
        peakHour: 20 // Default to 8 PM, could calculate from timestamps
      });

      // Generate persona
      await generatePersona();
    } catch (error) {
      console.error('Load stats error:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const generatePersona = async () => {
    if (!user) return;

    setGeneratingPersona(true);

    try {
      const { data: session } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id })
        .select('id')
        .single();

      if (!session) throw new Error('Failed to create session');

      const topGenres = genreData.slice(0, 3).map(g => g.genre).join(', ');
      
      const response = await supabase.functions.invoke('binge-bot-chat', {
        body: {
          sessionId: session.id,
          message: `Based on someone who watches mostly ${topGenres}, has watched ${stats.totalShows} shows and ${stats.totalEpisodes} episodes, create a fun TV personality archetype. Return ONLY JSON: {"title": "2-4 word persona", "description": "1 sentence describing their viewing style"}`
        }
      });

      if (response.error) throw response.error;

      const content = response.data.reply;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setPersona(parsed);
      }
    } catch (error) {
      console.error('Generate persona error:', error);
      setPersona({
        title: 'The Binge Enthusiast',
        description: 'You watch with passion and dedication, always ready for the next episode.'
      });
    } finally {
      setGeneratingPersona(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-muted-foreground">Loading your stats...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/profile')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>
        
        <Button variant="outline" onClick={() => navigate('/wrapped')}>
          Your TV Wrapped
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold mb-2">Advanced Stats</h1>
        <p className="text-muted-foreground">
          Deep dive into your watching habits and preferences
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalHours}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tv className="h-4 w-4" />
              Shows Watched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalShows}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Episodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalEpisodes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgRating}</p>
          </CardContent>
        </Card>
      </div>

      {/* TV Persona */}
      <TVPersona
        persona={persona.title}
        description={persona.description}
        onRegenerate={generatePersona}
        loading={generatingPersona}
      />

      {/* Watch Streak */}
      <WatchStreak
        currentStreak={stats.currentStreak}
        longestStreak={stats.longestStreak}
      />

      {/* Calendar Heatmap */}
      <Card>
        <CardContent className="pt-6">
          <CalendarHeatmap data={heatmapData} />
        </CardContent>
      </Card>

      {/* Genre Breakdown */}
      <Card>
        <CardContent className="pt-6">
          <GenreBreakdown data={genreData} />
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Rewatch Champion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold mb-2">{stats.rewatchCount}</p>
            <p className="text-sm text-muted-foreground">
              Shows you've watched more than once
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Binge Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold mb-2">{stats.peakHour}:00</p>
            <p className="text-sm text-muted-foreground">
              Most active hour of the day
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
