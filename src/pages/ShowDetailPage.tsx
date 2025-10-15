import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Star, Calendar, Tv } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTVDB } from '@/hooks/useTVDB';
import { PercentRating } from '@/components/PercentRating';

export default function ShowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchShow, fetchSeasons } = useTVDB();
  const [show, setShow] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShowData = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const [showData, seasonsData] = await Promise.all([
          fetchShow(parseInt(id)),
          fetchSeasons(parseInt(id))
        ]);
        setShow(showData);
        setSeasons(seasonsData || []);
      } catch (error) {
        console.error('Error loading show:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShowData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button onClick={() => navigate(-1)} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p className="text-center text-muted-foreground">Show not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Button onClick={() => navigate(-1)} variant="ghost">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Show Header */}
      <Card className="overflow-hidden">
        <div className="relative h-64 bg-gradient-to-b from-primary/20 to-background">
          {show.image && (
            <img
              src={show.image}
              alt={show.name}
              className="w-full h-full object-cover opacity-50"
            />
          )}
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            {show.image && (
              <img
                src={show.image}
                alt={show.name}
                className="w-24 h-36 object-cover rounded"
              />
            )}
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold">{show.name}</h1>
              {show.firstAired && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(show.firstAired).getFullYear()}
                </p>
              )}
            </div>
          </div>

          {show.overview && (
            <p className="text-sm text-muted-foreground">{show.overview}</p>
          )}
        </div>
      </Card>

      {/* Seasons */}
      {seasons && seasons.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Tv className="h-6 w-6" />
            Seasons
          </h2>
          <div className="grid gap-4">
            {seasons.map((season: any) => (
              <Card
                key={season.id}
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate(`/show/${id}/season/${season.number}`)}
              >
                <div className="flex items-center gap-4">
                  {season.image && (
                    <img
                      src={season.image}
                      alt={`Season ${season.number}`}
                      className="w-16 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">Season {season.number}</h3>
                    {season.name && season.name !== `Season ${season.number}` && (
                      <p className="text-sm text-muted-foreground">{season.name}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
