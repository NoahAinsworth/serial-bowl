import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useTVDB, TVShow, TVSeason } from '@/hooks/useTVDB';
import { PercentRating } from '@/components/PercentRating';
import { PostCreationDialog } from '@/components/PostCreationDialog';
import { PostTypeSelector } from '@/components/PostTypeSelector';
import { ReviewsList } from '@/components/ReviewsList';
import { ThoughtsList } from '@/components/ThoughtsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WatchlistButton } from '@/components/WatchlistButton';
import { WatchedButton } from '@/components/WatchedButton';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getRating } from '@/api/ratings';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BowlScoreBadge } from '@/components/BowlScoreBadge';
import { useBowlScores } from '@/hooks/useBowlScores';

export default function ShowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading, fetchShow, fetchSeasons } = useTVDB();
  
  const [show, setShow] = useState<TVShow | null>(null);
  const [seasons, setSeasons] = useState<TVSeason[]>([]);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [postType, setPostType] = useState<'review' | 'thought'>('review');
  const [contentId, setContentId] = useState<string | null>(null);
  
  // Extract numeric ID for bowl scores
  const numericShowId = id ? (id.match(/(\d+)$/) || [])[1] || id : null;
  const { globalScore, personalScore } = useBowlScores(numericShowId || '');

  useEffect(() => {
    if (id) {
      // Extract numeric ID from URL (handle "series-123" or "123")
      const match = id.match(/(\d+)$/);
      const numericId = match ? parseInt(match[1], 10) : parseInt(id, 10);
      
      if (!isNaN(numericId) && numericId > 0) {
        loadShow(numericId);
      }
    }
  }, [id, user]);

  const loadShow = async (showId: number) => {
    const showData = await fetchShow(showId);
    if (showData) {
      setShow(showData);
      const seasonsData = await fetchSeasons(showId);
      setSeasons(seasonsData);
      
      await loadContentAndRating(showId.toString(), showData.name);
    }
  };

  const loadContentAndRating = async (externalId: string, showName: string) => {
    if (!user) {
      return;
    }

    if (!showName || !showName.trim()) {
      console.error('Cannot create content with empty show title');
      return;
    }

    let { data: content, error: fetchError } = await supabase
      .from('content')
      .select('id')
      .eq('external_id', externalId)
      .eq('kind', 'show')
      .maybeSingle();

    if (!content && !fetchError) {
      const { data: newContent, error: insertError } = await supabase
        .from('content')
        .insert({
          external_src: 'thetvdb',
          external_id: externalId,
          kind: 'show',
          title: showName,
          poster_url: show?.image,
        })
        .select('id')
        .single();

      if (insertError?.code === '42501') {
        await supabase.auth.refreshSession();
        
        const { data: retryContent, error: retryError } = await supabase
          .from('content')
          .insert({
            external_src: 'thetvdb',
            external_id: externalId,
            kind: 'show',
            title: showName,
            poster_url: show?.image,
          })
          .select('id')
          .single();
        
        if (retryError) {
          toast.error('Authentication error. Please try signing out and back in.');
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
  }

    if (user) {
      const rating = await getRating({ itemType: 'show', itemId: parseInt(externalId) });
      setUserRating(rating?.score || null);
    }
  };

  const handleRatingChange = async (newRating: number) => {
    if (!user || !id) {
      toast.error('Please sign in to rate');
      return;
    }

    try {
      const { error } = await supabase.rpc('api_rate_and_review', {
        p_item_type: 'show',
        p_item_id: id,
        p_score_any: String(newRating),
        p_review: null,
        p_is_spoiler: false,
      });

      if (error) throw error;

      setUserRating(newRating);
      toast.success('Rating saved!');
    } catch (error) {
      toast.error('Failed to save rating');
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
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6 animate-fade-in min-h-screen">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/discover')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Discover
      </Button>
      
      {/* Header Section - Title + Description Only */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {show.image && (
            <div className="relative flex-shrink-0">
              <img
                src={show.image}
                alt={show.name}
                className="w-full md:w-48 h-auto md:h-72 object-cover rounded-lg"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
          <div className="flex-1 space-y-6">
            {/* Header: Title + Description */}
            <div>
              <h1 className="text-3xl font-bold mb-3">{show.name}</h1>
              <p className="text-muted-foreground">{show.overview}</p>
            </div>

            {/* Bowl Score - Always visible */}
            <Card className="border-2 rounded-xl p-5 bg-card/50 space-y-4">
              <div>
                <BowlScoreBadge score={globalScore} variant="global" showLabel size="md" showEmpty />
              </div>

              {user && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Your Rating</p>
                  <PercentRating
                    initialRating={userRating || 0}
                    onRate={handleRatingChange}
                    compact
                    showSaveButton
                  />
                </div>
              )}
            </Card>

            {user && contentId && (
              <>
                {/* Quick Actions Section - List + Seen */}
                <div className="grid grid-cols-2 gap-3">
                  <WatchlistButton contentId={contentId} showTitle={show.name} />
                  <WatchedButton contentId={contentId} showTitle={show.name} />
                </div>

                {/* Post Actions Section */}
                <PostTypeSelector
                  onReviewClick={() => {
                    setPostType('review');
                    setShowPostDialog(true);
                  }}
                  onThoughtClick={() => {
                    setPostType('thought');
                    setShowPostDialog(true);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4">Seasons</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {seasons.filter(season => season.number !== 0).map((season) => (
            <Card
              key={season.number}
              className="p-4 cursor-pointer transition-all hover:border-primary"
              onClick={() => navigate(`/show/${id}/season/${season.number}`)}
            >
              <h3 className="font-semibold text-center">Season {season.number}</h3>
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

      <PostCreationDialog
        open={showPostDialog}
        onOpenChange={setShowPostDialog}
        postType={postType}
        itemType="show"
        itemId={id}
        contentTitle={show.name}
      />
    </div>
  );
}
