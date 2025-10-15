import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Play } from 'lucide-react';
import { useTVDB } from '@/hooks/useTVDB';

export default function SeasonDetailPage() {
  const { id, seasonNum } = useParams<{ id: string; seasonNum: string }>();
  const navigate = useNavigate();
  const { fetchShow, fetchEpisodes } = useTVDB();
  const [show, setShow] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id || !seasonNum) return;

      setLoading(true);
      try {
        const [showData, episodesData] = await Promise.all([
          fetchShow(parseInt(id)),
          fetchEpisodes(parseInt(id), parseInt(seasonNum))
        ]);
        setShow(showData);
        setEpisodes(episodesData || []);
      } catch (error) {
        console.error('Error loading season:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, seasonNum]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Button onClick={() => navigate(`/show/${id}`)} variant="ghost">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to {show?.name}
      </Button>

      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Season {seasonNum}</h1>
        
        {episodes.length > 0 ? (
          <div className="grid gap-4">
            {episodes.map((episode: any) => (
              <Card
                key={episode.id}
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate(`/show/${id}/season/${seasonNum}/episode/${episode.number}`)}
              >
                <div className="flex items-center gap-4">
                  {episode.image && (
                    <img
                      src={episode.image}
                      alt={episode.name}
                      className="w-24 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">
                        {episode.number}. {episode.name}
                      </h3>
                    </div>
                    {episode.overview && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {episode.overview}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No episodes found</p>
        )}
      </div>
    </div>
  );
}
