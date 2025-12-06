import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Search, Loader2, Tv, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { EarnPointsShowView } from '@/components/EarnPointsShowView';
import { useTVDB } from '@/hooks/useTVDB';
import { tvdbFetch } from '@/api/tvdb';

interface SearchResult {
  id: number;
  name: string;
  image?: string;
  year?: string;
  overview?: string;
}

export default function EarnPointsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { search: searchShows } = useTVDB();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedShow, setSelectedShow] = useState<SearchResult | null>(null);
  const [userStats, setUserStats] = useState({ dailyPointsEarned: 0, dailyCap: 200 });
  
  // Popular shows endless scroll state
  const [popularShows, setPopularShows] = useState<SearchResult[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [popularPage, setPopularPage] = useState(0);
  const [hasMorePopular, setHasMorePopular] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    loadUserStats();
  }, [user]);

  // Load initial popular shows on mount
  useEffect(() => {
    loadPopularShows(0);
  }, []);

  // Load more when page increments
  useEffect(() => {
    if (popularPage > 0) {
      loadPopularShows(popularPage);
    }
  }, [popularPage]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    // Only trigger infinite scroll when not showing search results
    if (searchQuery || results.length > 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePopular && !loadingPopular) {
          setPopularPage((prev) => prev + 1);
        }
      },
      { threshold: 0.5, rootMargin: '200px' }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMorePopular, loadingPopular, searchQuery, results.length]);

  const loadPopularShows = useCallback(async (page: number) => {
    if (loadingPopular) return;
    
    setLoadingPopular(true);
    try {
      const response = await tvdbFetch(`/series/filter?sort=score&sortType=desc&page=${page}`);
      
      if (response && Array.isArray(response)) {
        const newShows: SearchResult[] = response
          .filter((show: any) => !seenIds.current.has(show.id))
          .map((show: any) => {
            seenIds.current.add(show.id);
            return {
              id: show.id,
              name: show.name || 'Unknown',
              year: show.year?.toString() || show.firstAired?.substring(0, 4),
              image: show.image,
              overview: show.overview
            };
          });
        
        if (newShows.length === 0) {
          setHasMorePopular(false);
        } else {
          setPopularShows((prev) => [...prev, ...newShows]);
        }
      } else {
        setHasMorePopular(false);
      }
    } catch (error) {
      console.error('Error loading popular shows:', error);
      setHasMorePopular(false);
    } finally {
      setLoadingPopular(false);
    }
  }, [loadingPopular]);

  const loadUserStats = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('daily_points_earned, daily_points_reset_at')
      .eq('id', user.id)
      .single();
    
    if (data) {
      // Reset if new day
      const resetAt = data.daily_points_reset_at ? new Date(data.daily_points_reset_at) : new Date(0);
      const today = new Date();
      const isNewDay = resetAt.toDateString() !== today.toDateString();
      
      setUserStats({
        dailyPointsEarned: isNewDay ? 0 : (data.daily_points_earned || 0),
        dailyCap: 200
      });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setResults([]);

    try {
      // First try local cache
      const { data: tvdbShows } = await supabase
        .from('tvdb_shows')
        .select('tvdb_id, name, year, json')
        .ilike('name', `%${searchQuery}%`)
        .limit(20);

      if (tvdbShows && tvdbShows.length > 0) {
        const mappedResults = tvdbShows.map(show => ({
          id: show.tvdb_id,
          name: show.name || 'Unknown',
          year: show.year?.toString(),
          image: (show.json as any)?.image,
          overview: (show.json as any)?.overview
        }));
        setResults(mappedResults);
      } else {
        // Fallback to TVDB API search
        try {
          const apiResults = await searchShows(searchQuery);
          if (apiResults && apiResults.length > 0) {
            const mappedResults = apiResults.map((show: any) => ({
              id: show.tvdb_id || show.id,
              name: show.name || show.title || 'Unknown',
              year: show.year?.toString() || show.first_air_date?.substring(0, 4),
              image: show.image || show.poster_url,
              overview: show.overview
            }));
            setResults(mappedResults);
          } else {
            setResults([]);
          }
        } catch (apiError) {
          console.error('TVDB API search error:', apiError);
          setResults([]);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setResults([]);
  };

  if (selectedShow) {
    return (
      <EarnPointsShowView
        showId={selectedShow.id.toString()}
        showName={selectedShow.name}
        showImage={selectedShow.image}
        onBack={() => setSelectedShow(null)}
        onPointsEarned={() => {
          loadUserStats();
        }}
      />
    );
  }

  const dailyCapReached = userStats.dailyPointsEarned >= userStats.dailyCap;
  const showPopularShows = !searchQuery && results.length === 0;

  const renderShowCard = (show: SearchResult) => (
    <Card
      key={show.id}
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-2"
      onClick={() => setSelectedShow(show)}
    >
      <div className="flex gap-4">
        {show.image ? (
          <img
            src={show.image}
            alt={show.name}
            className="w-16 h-24 object-cover rounded-lg"
          />
        ) : (
          <div className="w-16 h-24 bg-muted rounded-lg flex items-center justify-center">
            <Tv className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{show.name}</h3>
          {show.year && (
            <p className="text-sm text-muted-foreground">{show.year}</p>
          )}
          {show.overview && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {show.overview}
            </p>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/binge-board')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Earn Binge Points</h1>
            <p className="text-sm text-muted-foreground">
              Log episodes you've recently watched
            </p>
          </div>
        </div>

        {/* Info Box */}
        <Card className="p-4 mb-4 border-2 bg-muted/30">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">How points work:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• <strong>+10</strong> Binge Points per episode</li>
                <li>• <strong>+50</strong> bonus for completing a season</li>
                <li>• <strong>+200</strong> bonus for completing a show</li>
                <li>• Daily cap: <strong>200</strong> Binge Points</li>
              </ul>
              <p className="text-xs mt-2 text-muted-foreground/80">
                Episodes always count toward your Show Score, even after the daily cap.
              </p>
            </div>
          </div>
        </Card>

        {/* Daily Progress */}
        <Card className="p-4 mb-6 border-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Today's Points</span>
            <span className="text-sm text-muted-foreground">
              {userStats.dailyPointsEarned}/{userStats.dailyCap}
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, (userStats.dailyPointsEarned / userStats.dailyCap) * 100)}%` }}
            />
          </div>
          {dailyCapReached && (
            <p className="text-sm text-amber-500 mt-2">
              🎉 Daily limit reached! Episodes will still count toward your Show Score.
            </p>
          )}
        </Card>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for a show..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 h-12 rounded-full border-2"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="h-12 px-6 rounded-full border-2"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>

        {/* Search Results */}
        {results.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select a show to log episodes:
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearSearch}
                className="text-xs"
              >
                Clear search
              </Button>
            </div>
            {results.map(renderShowCard)}
          </div>
        ) : searching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : searchQuery && !searching ? (
          <div className="text-center py-12">
            <Tv className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No shows found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different search term
            </p>
          </div>
        ) : showPopularShows ? (
          /* Popular Shows Endless Scroll */
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-2">
              Popular shows to get started:
            </p>
            
            {popularShows.map(renderShowCard)}
            
            {loadingPopular && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            
            {/* Infinite scroll trigger */}
            <div ref={observerRef} className="h-4" />
            
            {!hasMorePopular && popularShows.length > 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No more shows to load
              </p>
            )}
            
            {!loadingPopular && popularShows.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Search for a show to get started</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
