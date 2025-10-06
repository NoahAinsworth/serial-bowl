import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { RatingInput } from '@/components/RatingInput';
import { WatchlistButton } from '@/components/WatchlistButton';
import { WatchedButton } from '@/components/WatchedButton';
import { ReviewButton } from '@/components/ReviewButton';
import { AddToListButton } from '@/components/AddToListButton';
import { ReviewsList } from '@/components/ReviewsList';
import { useTVDB, TVShow, TVSeason } from '@/hooks/useTVDB';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { Loader2 } from 'lucide-react';
import { PostTypeSelector } from '@/components/PostTypeSelector';
import { PostCreationDialog } from '@/components/PostCreationDialog';

export default function ShowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { loading, fetchShow, fetchSeasons } = useTVDB();
  
  const [show, setShow] = useState<TVShow | null>(null);
  const [seasons, setSeasons] = useState<TVSeason[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [contentId, setContentId] = useState<string | null>(null);
  const [postType, setPostType] = useState<'review' | 'thought'>('review');
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadShow(parseInt(id));
    }
  }, [id]);

  const loadShow = async (showId: number) => {
    const showData = await fetchShow(showId);
    if (showData) {
      setShow(showData);
      
      // Fetch seasons
      const seasonsData = await fetchSeasons(showId);
      setSeasons(seasonsData);
      
      // Check if show exists in DB and get user rating
      await loadContentAndRating(showId.toString());
    }
  };

  const loadContentAndRating = async (externalId: string) => {
    // Get or create content entry
    let { data: content } = await supabase
      .from('content')
      .select('id')
      .eq('external_src', 'thetvdb')
      .eq('external_id', externalId)
      .eq('kind', 'show')
      .single();

    if (!content && show) {
      const { data: newContent } = await supabase
        .from('content')
        .insert({
          external_src: 'thetvdb',
          external_id: externalId,
          kind: 'show',
          title: show.name,
          overview: show.overview,
          poster_url: show.image,
          air_date: show.firstAired,
        })
        .select()
        .single();
      
      content = newContent;
    }

    if (content) {
      setContentId(content.id);
      
      // Get user rating if logged in
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
        description: "Please sign in to rate shows",
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
      toast({
        title: "Success",
        description: "Rating saved!",
      });
    }
  };

  if (loading && !show) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <p className="text-center text-muted-foreground">Show not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {show.image && (
            <img
              src={show.image}
              alt={show.name}
              className="w-full md:w-48 h-auto md:h-72 object-cover rounded-lg"
            />
          )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2 neon-glow">{show.name}</h1>
              <p className="text-muted-foreground mb-4">{show.overview}</p>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {contentId && (
                    <>
                      <WatchlistButton contentId={contentId} showTitle={show.name} />
                      <WatchedButton contentId={contentId} showTitle={show.name} />
                      <AddToListButton contentId={contentId} showTitle={show.name} />
                    </>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Rate this show</p>
                  <RatingInput initialRating={userRating} onRate={handleRate} />
                </div>
                {contentId && (
                  <div>
                    <PostTypeSelector 
                      value={postType} 
                      onChange={(type) => {
                        setPostType(type);
                        setPostDialogOpen(true);
                      }} 
                    />
                  </div>
                )}
              </div>
            </div>
        </div>
        </Card>

        {contentId && <ReviewsList contentId={contentId} />}

        <div>
        <h2 className="text-2xl font-bold mb-4">Seasons</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {seasons.filter(season => season.number !== 0).map((season) => (
            <Card
              key={season.id}
              className="p-4 cursor-pointer hover:border-primary/50 transition-all hover-scale"
              onClick={() => navigate(`/show/${id}/season/${season.number}`)}
            >
              <h3 className="font-semibold text-center">{season.name}</h3>
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
          contentTitle={show?.name || ''}
          onSuccess={() => {
            // Reload reviews/data if needed
          }}
        />
      )}
    </div>
  );
}
