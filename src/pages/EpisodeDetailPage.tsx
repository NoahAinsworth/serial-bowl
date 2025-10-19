import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { PercentRating } from '@/components/PercentRating';
import { ReviewsList } from '@/components/ReviewsList';
import { ThoughtsList } from '@/components/ThoughtsList';
import { useTVDB, TVEpisode } from '@/hooks/useTVDB';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WatchlistButton } from '@/components/WatchlistButton';
import { WatchedButton } from '@/components/WatchedButton';
import { Loader2 } from 'lucide-react';
import { PostTypeSelector } from '@/components/PostTypeSelector';
import { PostCreationDialog } from '@/components/PostCreationDialog';

export default function EpisodeDetailPage() {
  const { showId, seasonNumber, episodeNumber } = useParams<{ 
    showId: string; 
    seasonNumber: string;
    episodeNumber: string;
  }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { loading, fetchEpisodes } = useTVDB();
  
  const [episode, setEpisode] = useState<TVEpisode | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [contentId, setContentId] = useState<string | null>(null);
  const [postType, setPostType] = useState<'review' | 'thought'>('review');
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  useEffect(() => {
    if (showId && seasonNumber && episodeNumber) {
      loadEpisode(parseInt(showId), parseInt(seasonNumber), parseInt(episodeNumber));
    }
  }, [showId, seasonNumber, episodeNumber]);

  const loadEpisode = async (seriesId: number, season: number, epNum: number) => {
    const episodesData = await fetchEpisodes(seriesId, season);
    const foundEpisode = episodesData.find(ep => ep.number === epNum);
    
    if (foundEpisode) {
      setEpisode(foundEpisode);
      await loadContentAndRating(foundEpisode, `${seriesId}:${season}:${epNum}`);
    }
  };

  const loadContentAndRating = async (episodeData: TVEpisode, externalId: string) => {
    if (!user) {
      return;
    }
    
    let { data: content, error: fetchError } = await supabase
      .from('content')
      .select('id')
      .eq('external_src', 'thetvdb')
      .eq('external_id', externalId)
      .eq('kind', 'episode')
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching content:', fetchError);
      toast({
        title: "Error",
        description: "Failed to load episode data",
        variant: "destructive",
      });
      return;
    }

    if (!content) {
      const { data: newContent, error: insertError } = await supabase
        .from('content')
        .insert({
          external_src: 'thetvdb',
          external_id: externalId,
          kind: 'episode',
          title: episodeData.name,
          air_date: episodeData.aired,
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
            kind: 'episode',
            title: episodeData.name,
            air_date: episodeData.aired,
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
        toast({
          title: "Error",
          description: "Failed to create episode content",
          variant: "destructive",
        });
        return;
      } else {
        content = newContent;
      }
    }

    if (content) {
      setContentId(content.id);
      
      if (user && showId && seasonNumber && episodeNumber) {
        const { data: rating } = await supabase
          .from('user_ratings')
          .select('score')
          .eq('user_id', user.id)
          .eq('item_type', 'episode')
          .eq('item_id', `${showId}:${seasonNumber}:${episodeNumber}`)
          .maybeSingle();
        
        if (rating) {
          setUserRating(rating.score);
        }
      }
    } else {
      console.warn('⚠️ EpisodeDetailPage - No content available for externalId:', externalId);
    }
  };

  const handleRate = async (rating: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to rate episodes",
        variant: "destructive",
      });
      return;
    }

    if (!showId || !seasonNumber || !episodeNumber) return;

    const { error } = await supabase.rpc('api_rate_and_review', {
      p_item_type: 'episode',
      p_item_id: `${showId}:${seasonNumber}:${episodeNumber}`,
      p_score_any: String(rating),
      p_review: null,
      p_is_spoiler: false,
    });

    if (error) {
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

  if (loading && !episode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <p className="text-center text-muted-foreground">Episode not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      <Card className="p-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Season {seasonNumber} · Episode {episodeNumber}
          </p>
          <h1 className="text-3xl font-bold mt-1 neon-glow">{episode.name}</h1>
        </div>
        
        {episode.image && (
          <img
            src={episode.image}
            alt={episode.name}
            className="w-full h-auto rounded-lg"
          />
        )}
        
        <p className="text-foreground">{episode.overview}</p>
        
        {episode.aired && (
          <p className="text-sm text-muted-foreground">
            Aired: {new Date(episode.aired).toLocaleDateString()}
          </p>
        )}
        
        {contentId && (
          <div className="flex gap-2 w-full overflow-hidden">
            <WatchlistButton contentId={contentId} showTitle={episode.name} />
            <WatchedButton contentId={contentId} showTitle={episode.name} />
          </div>
        )}
        
        <div>
          <p className="text-sm text-muted-foreground mb-2">Rate this episode</p>
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
      </Card>

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

      {showId && seasonNumber && episodeNumber && episode && (
        <PostCreationDialog
          open={postDialogOpen}
          onOpenChange={(open) => {
            console.log('EpisodeDetailPage passing itemId:', `${showId}:${seasonNumber}:${episodeNumber}`);
            setPostDialogOpen(open);
          }}
          postType={postType}
          itemType="episode"
          itemId={`${showId}:${seasonNumber}:${episodeNumber}`}
          contentTitle={episode.name}
          onSuccess={() => {
            setPostDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
