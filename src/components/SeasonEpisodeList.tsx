import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EpisodeWatchToggle } from './EpisodeWatchToggle';
import { SeasonWatchToggle } from './SeasonWatchToggle';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTVDB, TVEpisode } from '@/hooks/useTVDB';
import { FEATURE_WATCH_AND_BADGES } from '@/lib/featureFlags';

interface SeasonEpisodeListProps {
  showId: number;
  seasonNumber: number;
  seasonId: number;
  onWatchUpdate?: () => void;
}

export function SeasonEpisodeList({
  showId,
  seasonNumber,
  seasonId,
  onWatchUpdate,
}: SeasonEpisodeListProps) {
  const { user } = useAuth();
  const { fetchEpisodes } = useTVDB();
  const [isOpen, setIsOpen] = useState(false);
  const [episodes, setEpisodes] = useState<TVEpisode[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  if (!FEATURE_WATCH_AND_BADGES) return null;

  const loadEpisodes = async () => {
    if (episodes.length > 0) return; // Already loaded
    
    setLoading(true);
    try {
      const eps = await fetchEpisodes(showId, seasonNumber);
      setEpisodes(eps);
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWatchedStatus = async () => {
    if (!user) return;

    const response = await supabase.functions.invoke('watch-episodes', {
      body: {
        action: 'getWatched',
        showId,
        seasonNumber,
      },
    });

    if (response.data?.episodes) {
      setWatchedEpisodes(new Set(response.data.episodes.map((e: any) => e.episode_number)));
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEpisodes();
      loadWatchedStatus();
    }
  }, [isOpen, user]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleWatchUpdate = () => {
    loadWatchedStatus();
    onWatchUpdate?.();
  };

  const watchedCount = watchedEpisodes.size;
  const totalCount = episodes.length;
  const allWatched = totalCount > 0 && watchedCount === totalCount;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex-1 flex items-center justify-start gap-2 p-0 h-auto font-normal"
            onClick={handleToggle}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-semibold">Season {seasonNumber}</span>
            <span className="text-muted-foreground">
              • {watchedCount}/{totalCount || '?'} episodes
            </span>
            {allWatched && totalCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check className="h-3 w-3" />
                Complete
              </span>
            )}
          </Button>
        </CollapsibleTrigger>
        
        {episodes.length > 0 && (
          <SeasonWatchToggle
            showId={showId}
            seasonNumber={seasonNumber}
            episodes={episodes.map(ep => ({
              number: ep.number,
              id: ep.id,
              runtime: ep.runtime,
            }))}
            allWatched={allWatched}
            onToggle={handleWatchUpdate}
          />
        )}
      </div>

      <CollapsibleContent>
        <div className="border-t">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading episodes...</div>
          ) : episodes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No episodes found</div>
          ) : (
            <div className="divide-y">
              {episodes.map((episode) => {
                const isWatched = watchedEpisodes.has(episode.number);
                return (
                  <div
                    key={episode.id}
                    className={`flex items-center justify-between p-4 ${
                      isWatched ? 'bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2">
                        {isWatched && <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />}
                        <span className="font-medium">
                          Episode {episode.number}
                        </span>
                        <span className="text-muted-foreground truncate">
                          {episode.name}
                        </span>
                      </div>
                      {episode.runtime && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {episode.runtime} min
                        </div>
                      )}
                    </div>
                    
                    <EpisodeWatchToggle
                      showId={showId}
                      seasonNumber={seasonNumber}
                      episodeNumber={episode.number}
                      tvdbId={`${showId}:${seasonNumber}:${episode.number}`}
                      runtimeMinutes={episode.runtime || 45}
                      isWatched={isWatched}
                      onToggle={handleWatchUpdate}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
