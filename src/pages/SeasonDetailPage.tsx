import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { RatingInput } from '@/components/RatingInput';
import { EpisodeCheckbox } from '@/components/EpisodeCheckbox';
import { useTVDB, TVEpisode } from '@/hooks/useTVDB';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { Loader2 } from 'lucide-react';
import { PostTypeSelector } from '@/components/PostTypeSelector';
import { PostCreationDialog } from '@/components/PostCreationDialog';

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

  useEffect(() => {
    if (showId && seasonNumber) {
      loadEpisodes(parseInt(showId), parseInt(seasonNumber));
    }
  }, [showId, seasonNumber]);

  const loadEpisodes = async (seriesId: number, season: number) => {
    const episodesData = await fetchEpisodes(seriesId, season);
    setEpisodes(episodesData);
    
    await loadContentAndRating(`${seriesId}-S${season}`);
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
        description: "Please sign in to rate seasons",
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
          <div>
            <p className="text-sm text-muted-foreground mb-2">Rate this season</p>
            <RatingInput initialRating={userRating} onRate={handleRate} />
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
        <PostCreationDialog
          open={postDialogOpen}
          onOpenChange={setPostDialogOpen}
          postType={postType}
          contentId={contentId}
          contentTitle={`Season ${seasonNumber}`}
          onSuccess={() => {
            // Reload data if needed
          }}
        />
      )}
    </div>
  );
}
