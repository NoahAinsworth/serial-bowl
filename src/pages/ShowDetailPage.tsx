import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useTVDB, TVShow, TVSeason } from '@/hooks/useTVDB';
import { Loader2 } from 'lucide-react';

export default function ShowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading, fetchShow, fetchSeasons } = useTVDB();
  
  const [show, setShow] = useState<TVShow | null>(null);
  const [seasons, setSeasons] = useState<TVSeason[]>([]);

  useEffect(() => {
    if (id) {
      const numericId = id.replace(/^series-/, '');
      loadShow(parseInt(numericId));
    }
  }, [id]);

  const loadShow = async (showId: number) => {
    const showData = await fetchShow(showId);
    if (showData) {
      setShow(showData);
      const seasonsData = await fetchSeasons(showId);
      setSeasons(seasonsData);
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
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {show.image && (
            <div className="relative">
              <img
                src={show.image}
                alt={show.name}
                className="w-full md:w-48 h-auto md:h-72 object-cover rounded-lg"
              />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{show.name}</h1>
            <p className="text-muted-foreground mb-4">{show.overview}</p>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4">Seasons</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {seasons.filter(season => season.number !== 0).map((season) => (
            <Card
              key={season.id}
              className="p-4 cursor-pointer transition-all hover:border-primary"
              onClick={() => navigate(`/show/${id}/season/${season.number}`)}
            >
              <h3 className="font-semibold text-center">{season.name}</h3>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
