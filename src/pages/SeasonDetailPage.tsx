import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { PercentRating } from '@/components/PercentRating';
import { EpisodeCheckbox } from '@/components/EpisodeCheckbox';
import { ReviewsList } from '@/components/ReviewsList';
import { ThoughtsList } from '@/components/ThoughtsList';
import { useTVDB, TVEpisode } from '@/hooks/useTVDB';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WatchlistButton } from '@/components/WatchlistButton';
import { WatchedButton } from '@/components/WatchedButton';
import { Loader2, Check } from 'lucide-react';
import { PostTypeSelector } from '@/components/PostTypeSelector';
import { PostCreationDialog } from '@/components/PostCreationDialog';
import { SeasonWatchToggle } from '@/components/SeasonWatchToggle';
import { EpisodeWatchToggle } from '@/components/EpisodeWatchToggle';
import { FEATURE_WATCH_AND_BADGES } from '@/lib/featureFlags';
import { Button } from '@/components/ui/button';

export default function SeasonDetailPage() {
  const { showId, seasonNumber } = useParams<{ showId: string; seasonNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { loading, fetchEpisodes } = useTVDB();
  
  const [episodes, setEpisodes] = useState<TVEpisode[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [contentId, setContentId] = useState<string | null>(null);
  const [postType, setPostType] = useState<'review' | 'thought'>('review');
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());

  // Debug: Log the itemId being used
  console.log('SeasonDetailPage - showId:', showId, 'seasonNumber:', seasonNumber, 'itemId:', `${showId}:${seasonNumber}`);

  useEffect(() => {
    if (showId && seasonNumber) {
      loadEpisodes(parseInt(showId), parseInt(seasonNumber));
    }
  }, [showId, seasonNumber]);

  const loadEpisodes = async (seriesId: number, season: number) => {
    const episodesData = await fetchEpisodes(seriesId, season);
    setEpisodes(episodesData);
    
    await loadContentAndRating(`${seriesId}:${season}`);
    
    if (FEATURE_WATCH_AND_BADGES && user) {
      await loadWatchedStatus(seriesId, season);
    }
  };

  const loadWatchedStatus = async (seriesId: number, season: number) => {
    if (!user) return;

    const response = await supabase.functions.invoke('watch-episodes', {
      body: {
        action: 'getWatched',
        showId: seriesId,
        seasonNumber: season,
      },
    });

    if (response.data?.episodes) {
      setWatchedEpisodes(new Set(response.data.episodes.map((e: any) => e.episode_number)));
    }
  };

  const loadContentAndRating = async (externalId: string) => {
    let { data: content } = await supabase
      .from('content')
      .select('id')
      .eq('external_src', 'thetvdb')
      .eq('external_id', externalId)
      .eq('kind', 'season')
      .single();

    if (!content && seasonNumber) {
      const { data: newContent } = await supabase
        .from('content')
        .insert({
          external_src: 'thetvdb',
          external_id: externalId,
          kind: 'season',
          title: `Season ${seasonNumber}`,
        })
        .select()
        .single();
      
      content = newContent;
    }

    if (content) {
      setContentId(content.id);
      
      if (user && showId && seasonNumber) {
        const { data: rating } = await supabase
          .from('user_ratings')
          .select('score')
          .eq('user_id', user.id)
          .eq('item_type', 'season')
          .eq('item_id', `${showId}:${seasonNumber}`)
          .maybeSingle();
        
        if (rating) {
          setUserRating(rating.score);
        }
      }
    }
  };

  const handleRate = async (rating: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to rate seasons",
        variant: "destructive",
      });
      return;
    }

    if (!showId || !seasonNumber) return;

    const { error } = await supabase.rpc('api_rate_and_review', {
      p_item_type: 'season',
      p_item_id: `${showId}:${seasonNumber}`,
      p_score_any: String(rating),
      p_review: null,
      p_is_spoiler: false,
    });

    if (error) {
      console.error('Rating error:', error);
      toast({
        title: "Error",
        description: "Failed to save rating",
        variant: "destructive",
      });
      return;
    }

    setUserRating(rating);
    toast({
      title: "Success",
      description: "Rating saved!",
    });
  };

  if (loading && episodes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-4 neon-glow">Season {seasonNumber}</h1>
        <div className="space-y-4">
          {contentId && (
            <div className="flex gap-2 w-full overflow-hidden">
              <WatchlistButton contentId={contentId} showTitle={`Season ${seasonNumber}`} />
              <WatchedButton contentId={contentId} showTitle={`Season ${seasonNumber}`} />
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Rate this season</p>
            <PercentRating initialRating={userRating || 50} onRate={handleRate} />
          </div>
          {contentId && (
            <div>
              <PostTypeSelector 
                onReviewClick={() => {
                  setPostType('review');
                  setPostDialogOpen(true);
                }}
                onThoughtClick={() => {
                  setPostType('thought');
                  setPostDialogOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </Card>

      {FEATURE_WATCH_AND_BADGES && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Episodes</h2>
            <SeasonWatchToggle
              showId={parseInt(showId!)}
              seasonNumber={parseInt(seasonNumber!)}
              episodes={episodes.map(ep => ({
                number: ep.number,
                id: ep.id,
                runtime: ep.runtime,
              }))}
              allWatched={episodes.length > 0 && watchedEpisodes.size === episodes.length}
              onToggle={() => {
                if (showId && seasonNumber) {
                  loadWatchedStatus(parseInt(showId), parseInt(seasonNumber));
                }
              }}
            />
          </div>
          <div className="space-y-3">
            {episodes.map((episode) => {
              const isWatched = watchedEpisodes.has(episode.number);
              return (
                <Card
                  key={episode.id}
                  className={`p-4 transition-all ${isWatched ? 'bg-muted/30' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div 
                      className="flex-1 cursor-pointer min-w-0"
                      onClick={() => navigate(`/show/${showId}/season/${seasonNumber}/episode/${episode.number}`)}
                    >
                      <div className="flex items-start gap-2">
                        {isWatched && <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">
                            Episode {episode.number}: {episode.name}
                          </h3>
                          {episode.runtime && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {episode.runtime} min
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <EpisodeWatchToggle
                      showId={parseInt(showId!)}
                      seasonNumber={parseInt(seasonNumber!)}
                      episodeNumber={episode.number}
                      tvdbId={`${showId}:${seasonNumber}:${episode.number}`}
                      runtimeMinutes={episode.runtime || 45}
                      isWatched={isWatched}
                      onToggle={() => {
                        if (showId && seasonNumber) {
                          loadWatchedStatus(parseInt(showId), parseInt(seasonNumber));
                        }
                      }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      {!FEATURE_WATCH_AND_BADGES && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Episodes</h2>
          <div className="space-y-3">
            {episodes.map((episode) => (
              <Card
                key={episode.id}
                className="p-4 hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <EpisodeCheckbox
                    episodeId={episode.id.toString()}
                    showId={showId!}
                    seasonNumber={parseInt(seasonNumber!)}
                    episodeNumber={episode.number}
                  />
                  
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/show/${showId}/season/${seasonNumber}/episode/${episode.number}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {episode.number}. {episode.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {episode.overview}
                        </p>
                      </div>
                      {episode.aired && (
                        <span className="text-sm text-muted-foreground ml-4">
                          {new Date(episode.aired).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {contentId && (
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="reviews" className="flex-1">Reviews</TabsTrigger>
            <TabsTrigger value="thoughts" className="flex-1">Thoughts</TabsTrigger>
          </TabsList>
          <TabsContent value="reviews">
            <ReviewsList contentId={contentId} />
          </TabsContent>
          <TabsContent value="thoughts">
            <ThoughtsList contentId={contentId} />
          </TabsContent>
        </Tabs>
      )}

      {showId && seasonNumber && (
        <PostCreationDialog
          open={postDialogOpen}
          onOpenChange={(open) => {
            console.log('SeasonDetailPage passing itemId:', `${showId}:${seasonNumber}`);
            setPostDialogOpen(open);
          }}
          postType={postType}
          itemType="season"
          itemId={`${showId}:${seasonNumber}`}
          contentTitle={`Season ${seasonNumber}`}
          onSuccess={() => {
            setPostDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
