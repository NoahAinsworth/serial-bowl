import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { PercentRating } from '@/components/PercentRating';
import { EpisodeCheckbox } from '@/components/EpisodeCheckbox';
import { ReviewsList } from '@/components/ReviewsList';
import { ThoughtsList } from '@/components/ThoughtsList';
import { useTVDB, TVEpisode, TVShow } from '@/hooks/useTVDB';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WatchlistButton } from '@/components/WatchlistButton';
import { WatchedButton } from '@/components/WatchedButton';
import { Loader2, ArrowLeft } from 'lucide-react';
import { PostTypeSelector } from '@/components/PostTypeSelector';
import { PostCreationDialog } from '@/components/PostCreationDialog';
import { Button } from '@/components/ui/button';

export default function SeasonDetailPage() {
  const { showId, seasonNumber } = useParams<{ showId: string; seasonNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { loading, fetchEpisodes, fetchShow } = useTVDB();
  
  const [episodes, setEpisodes] = useState<TVEpisode[]>([]);
  const [showName, setShowName] = useState<string>('');
  const [userRating, setUserRating] = useState(0);
  const [contentId, setContentId] = useState<string | null>(null);
  const [postType, setPostType] = useState<'review' | 'thought'>('review');
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  useEffect(() => {
    if (showId && seasonNumber) {
      loadEpisodes(parseInt(showId), parseInt(seasonNumber));
    }
  }, [showId, seasonNumber]);

  const loadEpisodes = async (seriesId: number, season: number) => {
    // Fetch show to get name
    const showData = await fetchShow(seriesId);
    if (showData) {
      setShowName(showData.name);
    }
    
    const episodesData = await fetchEpisodes(seriesId, season);
    setEpisodes(episodesData);
    
    await loadContentAndRating(`${seriesId}:${season}`, showData?.name || '');
  };

  const loadContentAndRating = async (externalId: string, showTitle: string) => {
    if (!user) {
      return;
    }

    let { data: content, error: fetchError } = await supabase
      .from('content')
      .select('id')
      .eq('external_src', 'thetvdb')
      .eq('external_id', externalId)
      .eq('kind', 'season')
      .maybeSingle();

    if (!content && !fetchError && seasonNumber && showTitle) {
      const { data: newContent, error: insertError } = await supabase
        .from('content')
        .insert({
          external_src: 'thetvdb',
          external_id: externalId,
          kind: 'season',
          title: `${showTitle} - Season ${seasonNumber}`,
        })
        .select()
        .single();
      
      if (insertError?.code === '42501') {
        await supabase.auth.refreshSession();
        
        const { data: retryContent, error: retryError } = await supabase
          .from('content')
          .insert({
            external_src: 'thetvdb',
            external_id: externalId,
            kind: 'season',
            title: `${showTitle} - Season ${seasonNumber}`,
          })
          .select()
          .single();
        
        if (retryError) {
          toast({
            title: "Authentication Error",
            description: "Please try signing out and back in",
            variant: "destructive",
          });
          return;
        }
        
        content = retryContent;
      } else if (insertError) {
        return;
      } else {
        content = newContent;
      }
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
    } else {
      console.warn('⚠️ SeasonDetailPage - Failed to get/create contentId for season:', externalId);
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
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/show/${showId}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Show
      </Button>
      
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-4 neon-glow">Season {seasonNumber}</h1>
        <div className="space-y-4">
          {contentId && (
            <div className="flex gap-2 w-full overflow-hidden">
              <WatchlistButton contentId={contentId} showTitle={showName ? `${showName} - Season ${seasonNumber}` : `Season ${seasonNumber}`} />
              <WatchedButton contentId={contentId} showTitle={showName ? `${showName} - Season ${seasonNumber}` : `Season ${seasonNumber}`} />
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
          onOpenChange={setPostDialogOpen}
          postType={postType}
          itemType="season"
          itemId={`${showId}:${seasonNumber}`}
          contentTitle={showName ? `${showName} - Season ${seasonNumber}` : `Season ${seasonNumber}`}
          onSuccess={() => {
            setPostDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
