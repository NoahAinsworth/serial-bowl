import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SeasonEpisodeList } from '@/components/SeasonEpisodeList';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useTVDB } from '@/hooks/useTVDB';
import { FEATURE_WATCH_AND_BADGES } from '@/lib/featureFlags';

interface WatchedShowCardProps {
  item: {
    id: string;
    content: {
      id: string;
      title: string;
      poster_url?: string;
      external_id: string;
      metadata?: any;
    };
    watched_at: string;
  };
  onRemove: (id: string, title: string) => void;
}

export function WatchedShowCard({ item, onRemove }: WatchedShowCardProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const { fetchSeasons } = useTVDB();

  const loadSeasons = async () => {
    if (seasons.length > 0) return; // Already loaded
    
    setLoadingSeasons(true);
    try {
      const showId = parseInt(item.content.external_id);
      const seasonsData = await fetchSeasons(showId);
      setSeasons(seasonsData);
    } catch (error) {
      console.error('Error loading seasons:', error);
    } finally {
      setLoadingSeasons(false);
    }
  };

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      loadSeasons();
    }
  };

  if (!FEATURE_WATCH_AND_BADGES) {
    // Fallback to simple card when feature is disabled
    return (
      <Card className="p-4 hover:border-primary/50 transition-all hover-scale">
        <div className="flex gap-4">
          {item.content.poster_url ? (
            <img
              src={item.content.poster_url}
              alt={item.content.title}
              className="w-24 h-36 object-cover rounded cursor-pointer"
              onClick={() => navigate(`/show/${item.content.external_id}`)}
            />
          ) : (
            <div 
              className="w-24 h-36 bg-gradient-to-br from-primary to-secondary flex items-center justify-center rounded cursor-pointer"
              onClick={() => navigate(`/show/${item.content.external_id}`)}
            >
              <span className="text-white font-bold text-center text-xs px-2">
                {item.content.title}
              </span>
            </div>
          )}
          
          <div className="flex-1 flex flex-col">
            <h3 
              className="font-bold mb-1 cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate(`/show/${item.content.external_id}`)}
            >
              {item.content.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2 flex-1">
              {item.content.metadata?.overview || 'No description available'}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                Watched {new Date(item.watched_at).toLocaleDateString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id, item.content.title)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-all">
      <div className="p-4">
        <div className="flex gap-4">
          {item.content.poster_url ? (
            <img
              src={item.content.poster_url}
              alt={item.content.title}
              className="w-24 h-36 object-cover rounded cursor-pointer"
              onClick={() => navigate(`/show/${item.content.external_id}`)}
            />
          ) : (
            <div 
              className="w-24 h-36 bg-gradient-to-br from-primary to-secondary flex items-center justify-center rounded cursor-pointer"
              onClick={() => navigate(`/show/${item.content.external_id}`)}
            >
              <span className="text-white font-bold text-center text-xs px-2">
                {item.content.title}
              </span>
            </div>
          )}
          
          <div className="flex-1 flex flex-col">
            <h3 
              className="font-bold mb-1 cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate(`/show/${item.content.external_id}`)}
            >
              {item.content.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2 flex-1">
              {item.content.metadata?.overview || 'No description available'}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                Watched {new Date(item.watched_at).toLocaleDateString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id, item.content.title)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border-t px-4 py-2 hover:bg-muted/50 transition-colors">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-2"
              onClick={handleToggle}
            >
              <span className="text-sm font-medium">View Seasons & Episodes</span>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {loadingSeasons ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Loading seasons...
              </div>
            ) : seasons.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No seasons found
              </div>
            ) : (
              seasons
                .filter(season => season.number !== 0)
                .map((season) => (
                  <SeasonEpisodeList
                    key={season.id}
                    showId={parseInt(item.content.external_id)}
                    seasonNumber={season.number}
                    seasonId={season.id}
                  />
                ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
