import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, Trophy, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BulkWatchConfirmDialog } from '@/components/BulkWatchConfirmDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTVDB } from '@/hooks/useTVDB';

interface Episode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  aired?: string;
}

interface Season {
  number: number;
  episodes: Episode[];
}

interface EarnPointsShowViewProps {
  showId: string;
  showName: string;
  showImage?: string;
  onBack: () => void;
  onPointsEarned: () => void;
}

export function EarnPointsShowView({
  showId,
  showName,
  showImage,
  onBack,
  onPointsEarned
}: EarnPointsShowViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchSeasons, fetchEpisodes } = useTVDB();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set([1]));
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadShowData();
  }, [showId]);

  const loadShowData = async () => {
    setLoading(true);
    try {
      let seasonsData: Season[] = [];
      
      // First try to get from cache
      const { data: showData } = await supabase
        .from('tvdb_shows')
        .select('json')
        .eq('tvdb_id', parseInt(showId))
        .single();

      if (showData?.json) {
        const json = showData.json as any;
        
        if (json.seasons) {
          for (const season of json.seasons) {
            if (season.number === 0) continue; // Skip specials
            
            // Try to get episodes from cache first
            const { data: episodesData } = await supabase
              .from('tvdb_episodes')
              .select('json, season, episode')
              .eq('tvdb_id', parseInt(showId))
              .eq('season', season.number)
              .order('episode', { ascending: true });
            
            if (episodesData && episodesData.length > 0) {
              const episodes: Episode[] = episodesData.map(ep => ({
                id: `${showId}:${ep.season}:${ep.episode}`,
                seasonNumber: ep.season,
                episodeNumber: ep.episode,
                name: (ep.json as any)?.name || `Episode ${ep.episode}`,
                aired: (ep.json as any)?.aired
              }));
              
              seasonsData.push({
                number: season.number,
                episodes
              });
            }
          }
        }
      }

      // If no data from cache, fetch from TVDB API
      if (seasonsData.length === 0) {
        console.log('No cached episodes found, fetching from TVDB API...');
        const apiSeasons = await fetchSeasons(parseInt(showId));
        
        for (const season of apiSeasons) {
          if (season.number === 0) continue; // Skip specials
          
          const apiEpisodes = await fetchEpisodes(parseInt(showId), season.number);
          
          if (apiEpisodes.length > 0) {
            const episodes: Episode[] = apiEpisodes.map(ep => ({
              id: `${showId}:${ep.seasonNumber}:${ep.number}`,
              seasonNumber: ep.seasonNumber,
              episodeNumber: ep.number,
              name: ep.name || `Episode ${ep.number}`,
              aired: ep.aired
            }));
            
            seasonsData.push({
              number: season.number,
              episodes
            });
          }
        }
      }
      
      setSeasons(seasonsData.sort((a, b) => a.number - b.number));
      
      // Load already watched episodes
      if (user) {
        const { data: watchedData } = await supabase
          .from('watched_episodes')
          .select('tvdb_id')
          .eq('user_id', user.id)
          .eq('show_id', parseInt(showId));
        
        if (watchedData) {
          setWatchedEpisodes(new Set(watchedData.map(w => w.tvdb_id)));
        }
      }
    } catch (error) {
      console.error('Error loading show data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load show data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEpisode = (episodeId: string) => {
    setSelectedEpisodes(prev => {
      const next = new Set(prev);
      if (next.has(episodeId)) {
        next.delete(episodeId);
      } else {
        next.add(episodeId);
      }
      return next;
    });
  };

  const toggleSeason = (seasonNumber: number) => {
    const season = seasons.find(s => s.number === seasonNumber);
    if (!season) return;
    
    const seasonEpisodeIds = season.episodes
      .filter(ep => !watchedEpisodes.has(ep.id))
      .map(ep => ep.id);
    
    const allSelected = seasonEpisodeIds.every(id => selectedEpisodes.has(id));
    
    setSelectedEpisodes(prev => {
      const next = new Set(prev);
      if (allSelected) {
        seasonEpisodeIds.forEach(id => next.delete(id));
      } else {
        seasonEpisodeIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleLogEpisodes = () => {
    if (selectedEpisodes.size === 0) return;
    
    if (selectedEpisodes.size > 5) {
      setShowConfirmDialog(true);
    } else {
      submitEpisodes(true);
    }
  };

  const submitEpisodes = async (earnPoints: boolean) => {
    if (!user || selectedEpisodes.size === 0) return;
    
    setSubmitting(true);
    setShowConfirmDialog(false);
    
    try {
      const episodeIds = Array.from(selectedEpisodes);
      
      // Call edge function to process episodes
      const { data, error } = await supabase.functions.invoke('earn-binge-points', {
        body: {
          user_id: user.id,
          show_id: showId,
          show_title: showName,
          episode_ids: episodeIds,
          earn_points: earnPoints
        }
      });
      
      if (error) {
        throw error;
      }
      
      const result = data as {
        points_earned: number;
        show_score_added: number;
        season_bonus: number;
        show_bonus: number;
        daily_cap_reached: boolean;
        anti_cheat_denied: boolean;
      };
      
      // Show toast based on result
      if (result.anti_cheat_denied) {
        toast({
          title: 'Episodes logged!',
          description: `+${result.show_score_added} Show Score added. Points were not awarded due to bulk logging limits.`
        });
      } else if (result.daily_cap_reached) {
        toast({
          title: 'Daily limit reached!',
          description: `+${result.points_earned} points earned today. ${result.show_score_added} episodes added to your history.`
        });
      } else if (result.points_earned > 0) {
        let message = `+${result.points_earned} Binge Points earned!`;
        if (result.season_bonus > 0) {
          message += ` (+${result.season_bonus} season bonus)`;
        }
        if (result.show_bonus > 0) {
          message += ` (+${result.show_bonus} show bonus!)`;
        }
        toast({
          title: '🎉 Points earned!',
          description: message
        });
      } else {
        toast({
          title: 'Episodes logged',
          description: `${result.show_score_added} episodes added to your watch history.`
        });
      }
      
      // Clear selection and refresh
      setSelectedEpisodes(new Set());
      setWatchedEpisodes(prev => {
        const next = new Set(prev);
        episodeIds.forEach(id => next.add(id));
        return next;
      });
      onPointsEarned();
      
    } catch (error) {
      console.error('Error submitting episodes:', error);
      toast({
        title: 'Error',
        description: 'Failed to log episodes',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodes.length, 0);
  const unwatchedEpisodes = seasons.reduce(
    (sum, s) => sum + s.episodes.filter(ep => !watchedEpisodes.has(ep.id)).length,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-4 flex-1">
            {showImage && (
              <img
                src={showImage}
                alt={showName}
                className="w-20 h-28 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div>
              <h1 className="text-xl font-bold line-clamp-2">{showName}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {totalEpisodes} episodes • {watchedEpisodes.size} watched
              </p>
              <p className="text-sm text-primary font-medium mt-1">
                {selectedEpisodes.size} selected
              </p>
            </div>
          </div>
        </div>

        {/* Seasons */}
        <div className="space-y-3">
          {seasons.map((season) => {
            const isOpen = openSeasons.has(season.number);
            const seasonEpisodeIds = season.episodes
              .filter(ep => !watchedEpisodes.has(ep.id))
              .map(ep => ep.id);
            const allSelected = seasonEpisodeIds.length > 0 && 
              seasonEpisodeIds.every(id => selectedEpisodes.has(id));
            const someSelected = seasonEpisodeIds.some(id => selectedEpisodes.has(id));
            const watchedCount = season.episodes.filter(ep => watchedEpisodes.has(ep.id)).length;

            return (
              <Card key={season.number} className="border-2 overflow-hidden">
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open) => {
                    setOpenSeasons(prev => {
                      const next = new Set(prev);
                      if (open) {
                        next.add(season.number);
                      } else {
                        next.delete(season.number);
                      }
                      return next;
                    });
                  }}
                >
                  <div className="flex items-center p-4 bg-card">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-auto mr-3">
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex-1">
                      <div className="font-semibold">Season {season.number}</div>
                      <div className="text-sm text-muted-foreground">
                        {season.episodes.length} episodes • {watchedCount} watched
                      </div>
                    </div>
                    <Button
                      variant={allSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSeason(season.number)}
                      disabled={seasonEpisodeIds.length === 0}
                      className="rounded-full"
                    >
                      {allSelected ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Selected
                        </>
                      ) : (
                        'Select All'
                      )}
                    </Button>
                  </div>
                  
                  <CollapsibleContent>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-4 pt-0">
                      {season.episodes.map((episode) => {
                        const isWatched = watchedEpisodes.has(episode.id);
                        const isSelected = selectedEpisodes.has(episode.id);
                        
                        return (
                          <button
                            key={episode.id}
                            onClick={() => !isWatched && toggleEpisode(episode.id)}
                            disabled={isWatched}
                            className={`
                              aspect-square rounded-lg border-2 flex items-center justify-center
                              text-sm font-medium transition-all
                              ${isWatched 
                                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50' 
                                : isSelected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background hover:bg-accent border-border'
                              }
                            `}
                            title={`${episode.name}${isWatched ? ' (already watched)' : ''}`}
                          >
                            {isWatched ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              episode.episodeNumber
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      {selectedEpisodes.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleLogEpisodes}
              disabled={submitting}
              className="w-full h-14 text-lg font-bold rounded-full border-2"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Trophy className="h-5 w-5 mr-2" />
              )}
              Log {selectedEpisodes.size} Episode{selectedEpisodes.size !== 1 ? 's' : ''} & Earn Points
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-2">
              +{selectedEpisodes.size * 10} points (before bonuses)
            </p>
          </div>
        </div>
      )}

      <BulkWatchConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        episodeCount={selectedEpisodes.size}
        onConfirmRecent={() => submitEpisodes(true)}
        onConfirmPast={() => submitEpisodes(false)}
      />
    </div>
  );
}
