import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Calendar } from 'lucide-react';
import { useTVDB } from '@/hooks/useTVDB';

export default function EpisodeDetailPage() {
  const { id, seasonNum, episodeNum } = useParams<{ id: string; seasonNum: string; episodeNum: string }>();
  const navigate = useNavigate();
  const { getShowDetails, getEpisodeDetails } = useTVDB();
  const [show, setShow] = useState<any>(null);
  const [episode, setEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id || !seasonNum || !episodeNum) return;

      setLoading(true);
      try {
        const [showData, episodeData] = await Promise.all([
          getShowDetails(id),
          getEpisodeDetails(id, parseInt(seasonNum), parseInt(episodeNum))
        ]);
        setShow(showData);
        setEpisode(episodeData);
      } catch (error) {
        console.error('Error loading episode:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, seasonNum, episodeNum]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button onClick={() => navigate(-1)} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p className="text-center text-muted-foreground">Episode not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Button onClick={() => navigate(`/show/${id}/season/${seasonNum}`)} variant="ghost">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Season {seasonNum}
      </Button>

      <Card className="overflow-hidden">
        {episode.image && (
          <div className="relative h-64 bg-gradient-to-b from-primary/20 to-background">
            <img
              src={episode.image}
              alt={episode.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {show?.name} • Season {seasonNum} Episode {episodeNum}
            </p>
            <h1 className="text-3xl font-bold">{episode.name}</h1>
          </div>

          {episode.aired && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(episode.aired).toLocaleDateString()}
            </p>
          )}

          {episode.overview && (
            <p className="text-muted-foreground">{episode.overview}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
