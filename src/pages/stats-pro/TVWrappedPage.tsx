import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function TVWrappedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [wrapped, setWrapped] = useState({
    year: new Date().getFullYear(),
    totalShows: 0,
    totalEpisodes: 0,
    totalHours: 0,
    topShow: { name: '', episodes: 0, poster: '' },
    topGenre: '',
    persona: 'The Binge Enthusiast',
    bingePoints: 0,
    streak: 0
  });

  useEffect(() => {
    loadWrapped();
  }, [user]);

  const loadWrapped = async () => {
    if (!user) return;

    try {
      const year = new Date().getFullYear();
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      // Get watched episodes this year
      const { data: watchedEpisodes } = await supabase
        .from('watched_episodes')
        .select('watched_at, show_id')
        .eq('user_id', user.id)
        .gte('watched_at', yearStart)
        .lte('watched_at', yearEnd);

      // Get watched shows this year
      const { data: watchedShows } = await supabase
        .from('watched')
        .select('content_id, content:content_id(title, poster_url, kind, metadata, external_id)')
        .eq('user_id', user.id)
        .gte('watched_at', yearStart)
        .lte('watched_at', yearEnd);

      // Calculate top show
      const showCounts = new Map<number, number>();
      watchedEpisodes?.forEach(ep => {
        if (ep.show_id) {
          showCounts.set(ep.show_id, (showCounts.get(ep.show_id) || 0) + 1);
        }
      });

      let topShowId = 0;
      let maxCount = 0;
      showCounts.forEach((count, showId) => {
        if (count > maxCount) {
          maxCount = count;
          topShowId = showId;
        }
      });

      let topShow = { name: 'No shows yet', episodes: 0, poster: '' };
      if (topShowId) {
        // Find the show from watched content
        const showFromWatched = watchedShows?.find(w => {
          const metadata = w.content?.metadata as any;
          return metadata?.tvdb_id === topShowId || w.content?.external_id === topShowId.toString();
        });

        if (showFromWatched?.content) {
          topShow = {
            name: showFromWatched.content.title,
            episodes: maxCount,
            poster: showFromWatched.content.poster_url || ''
          };
        }
      }

      // Calculate top genre
      const genreMap = new Map<string, number>();
      watchedShows?.forEach(show => {
        const metadata = show.content?.metadata as any;
        const genres = metadata?.genres || [];
        genres.forEach((genre: string) => {
          genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
        });
      });

      let topGenre = 'Drama';
      let maxGenreCount = 0;
      genreMap.forEach((count, genre) => {
        if (count > maxGenreCount) {
          maxGenreCount = count;
          topGenre = genre;
        }
      });

      // Get binge points
      const { data: profile } = await supabase
        .from('profiles')
        .select('binge_points')
        .eq('id', user.id)
        .single();

      const totalHours = Math.round((watchedEpisodes?.length || 0) * 45 / 60);

      setWrapped({
        year,
        totalShows: watchedShows?.length || 0,
        totalEpisodes: watchedEpisodes?.length || 0,
        totalHours,
        topShow,
        topGenre,
        persona: 'The Binge Enthusiast', // Could be AI-generated
        bingePoints: profile?.binge_points || 0,
        streak: 0 // Could calculate from activity
      });
    } catch (error) {
      console.error('Load wrapped error:', error);
      toast.error('Failed to load your TV Wrapped');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `My ${wrapped.year} TV Wrapped`,
        text: `I watched ${wrapped.totalShows} shows and ${wrapped.totalEpisodes} episodes this year!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-muted-foreground">Preparing your Wrapped...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate('/profile')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <Button onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>

        <div className="space-y-6">
          {/* Title Card */}
          <div className="text-center py-12">
            <h1 className="text-5xl font-bold mb-4">
              Your {wrapped.year}
            </h1>
            <h2 className="text-4xl font-bold text-primary">
              TV Wrapped
            </h2>
          </div>

          {/* Total Shows Card */}
          <div className="aspect-square bg-gradient-to-br from-primary to-primary/50 rounded-3xl p-8 flex flex-col items-center justify-center text-white">
            <p className="text-lg mb-4">You watched</p>
            <p className="text-8xl font-bold mb-4">{wrapped.totalShows}</p>
            <p className="text-2xl">shows this year</p>
          </div>

          {/* Episodes Card */}
          <div className="aspect-square bg-gradient-to-br from-accent to-accent/50 rounded-3xl p-8 flex flex-col items-center justify-center text-white">
            <p className="text-lg mb-4">That's</p>
            <p className="text-8xl font-bold mb-4">{wrapped.totalEpisodes}</p>
            <p className="text-2xl">episodes</p>
          </div>

          {/* Hours Card */}
          <div className="aspect-square bg-gradient-to-br from-secondary to-secondary/50 rounded-3xl p-8 flex flex-col items-center justify-center text-white">
            <p className="text-lg mb-4">You spent</p>
            <p className="text-8xl font-bold mb-4">{wrapped.totalHours}</p>
            <p className="text-2xl">hours watching</p>
          </div>

          {/* Top Show Card */}
          {wrapped.topShow.name !== 'No shows yet' && (
            <div className="aspect-square bg-gradient-to-br from-primary/80 to-accent/80 rounded-3xl p-8 flex flex-col items-center justify-center text-white">
              <p className="text-lg mb-4">Your show of the year</p>
              {wrapped.topShow.poster && (
                <img 
                  src={wrapped.topShow.poster} 
                  alt={wrapped.topShow.name}
                  className="w-32 h-48 object-cover rounded-lg mb-4"
                />
              )}
              <p className="text-2xl font-bold text-center mb-2">{wrapped.topShow.name}</p>
              <p className="text-lg">{wrapped.topShow.episodes} episodes watched</p>
            </div>
          )}

          {/* Top Genre Card */}
          <div className="aspect-square bg-gradient-to-br from-chart-1 to-chart-2 rounded-3xl p-8 flex flex-col items-center justify-center text-white">
            <p className="text-lg mb-4">Your favorite genre</p>
            <p className="text-6xl font-bold mb-4">{wrapped.topGenre}</p>
            <p className="text-lg">You can't get enough!</p>
          </div>

          {/* Persona Card */}
          <div className="aspect-square bg-gradient-to-br from-chart-3 to-chart-4 rounded-3xl p-8 flex flex-col items-center justify-center text-white">
            <p className="text-lg mb-4">You are</p>
            <p className="text-4xl font-bold text-center mb-4">{wrapped.persona}</p>
            <p className="text-center text-lg">
              Always ready for the next episode
            </p>
          </div>

          {/* Binge Points Card */}
          <div className="aspect-square bg-gradient-to-br from-chart-5 to-primary rounded-3xl p-8 flex flex-col items-center justify-center text-white">
            <p className="text-lg mb-4">You earned</p>
            <p className="text-8xl font-bold mb-4">{wrapped.bingePoints}</p>
            <p className="text-2xl">Binge Points</p>
          </div>

          {/* Thank You Card */}
          <div className="aspect-square bg-gradient-to-br from-primary/60 to-accent/60 rounded-3xl p-8 flex flex-col items-center justify-center text-white">
            <p className="text-3xl font-bold text-center mb-4">
              Thanks for watching with Serial Bowl!
            </p>
            <p className="text-lg text-center">
              Here's to another great year of TV in {wrapped.year + 1}
            </p>
          </div>

          {/* Share Button */}
          <div className="text-center py-8">
            <Button size="lg" onClick={handleShare}>
              <Share2 className="mr-2 h-5 w-5" />
              Share Your Wrapped
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
