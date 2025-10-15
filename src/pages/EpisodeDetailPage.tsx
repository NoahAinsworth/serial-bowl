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
      await loadContentAndRating(foundEpisode.id.toString());
    }
  };

  const loadContentAndRating = async (externalId: string) => {
    let { data: content } = await supabase
      .from('content')
      .select('id')
      .eq('external_src', 'thetvdb')
      .eq('external_id', externalId)
      .eq('kind', 'episode')
      .single();

    if (!content && episode) {
      const { data: newContent } = await supabase
        .from('content')
        .insert({
          external_src: 'thetvdb',
          external_id: externalId,
          kind: 'episode',
          title: episode.name,
          air_date: episode.aired,
        })
        .select()
        .single();
      
      content = newContent;
    }

    if (content) {
      setContentId(content.id);
      
      if (user) {
        const { data: rating } = await supabase
          .from('ratings')
          .select('rating')
          .eq('content_id', content.id)
          .eq('user_id', user.id)
          .single();
        
        if (rating) {
          setUserRating(rating.rating);
        }
      }
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

    if (!contentId) return;

    const { error } = await supabase
      .from('ratings')
      .upsert({
        user_id: user.id,
        content_id: contentId,
        rating,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save rating",
        variant: "destructive",
      });
    } else {
      setUserRating(rating);
      
      // Log rating interaction for algorithm
      await supabase
        .from('interactions')
        .insert({
          user_id: user.id,
          post_id: contentId,
          post_type: 'rating',
          interaction_type: 'rate',
        });

      toast({
        title: "Success",
        description: "Rating saved!",
      });
    }
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
          onOpenChange={setPostDialogOpen}
          postType={postType}
          itemType="episode"
          itemId={parseInt(`${showId}${seasonNumber.padStart(2, '0')}${episodeNumber.padStart(2, '0')}`)}
          contentTitle={episode.name}
          onSuccess={() => {
            setPostDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
