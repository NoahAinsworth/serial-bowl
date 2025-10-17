import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HierarchyItem {
  id: string;
  content: {
    id: string;
    title: string;
    poster_url?: string;
    external_id: string;
    metadata?: any;
    kind?: string;
  };
  created_at?: string;
  watched_at?: string;
}

interface WatchlistHierarchyProps {
  items: HierarchyItem[];
  type: 'watchlist' | 'watched';
  onRemove: (id: string, title: string) => void;
}

export function WatchlistHierarchy({ items, type, onRemove }: WatchlistHierarchyProps) {
  const navigate = useNavigate();
  const [openShows, setOpenShows] = useState<Set<string>>(new Set());
  const [openSeasons, setOpenSeasons] = useState<Set<string>>(new Set());

  const toggleShow = (showId: string) => {
    const newOpen = new Set(openShows);
    if (newOpen.has(showId)) {
      newOpen.delete(showId);
    } else {
      newOpen.add(showId);
    }
    setOpenShows(newOpen);
  };

  const toggleSeason = (seasonId: string) => {
    const newOpen = new Set(openSeasons);
    if (newOpen.has(seasonId)) {
      newOpen.delete(seasonId);
    } else {
      newOpen.add(seasonId);
    }
    setOpenSeasons(newOpen);
  };

  // Group items by show
  const groupedByShow = items.reduce((acc, item) => {
    const externalId = item.content.external_id;
    const kind = item.content.kind;

    if (kind === 'show' || !externalId.includes(':')) {
      // It's a show
      if (!acc[externalId]) {
        acc[externalId] = { show: item, seasons: {} };
      }
    } else if (kind === 'season' || (externalId.match(/:/g) || []).length === 1) {
      // It's a season (format: showId:seasonNum)
      const showId = externalId.split(':')[0];
      if (!acc[showId]) {
        acc[showId] = { show: null, seasons: {} };
      }
      acc[showId].seasons[externalId] = { season: item, episodes: [] };
    } else {
      // It's an episode (format: showId:seasonNum:episodeNum)
      const parts = externalId.split(':');
      const showId = parts[0];
      const seasonId = `${parts[0]}:${parts[1]}`;
      
      if (!acc[showId]) {
        acc[showId] = { show: null, seasons: {} };
      }
      if (!acc[showId].seasons[seasonId]) {
        acc[showId].seasons[seasonId] = { season: null, episodes: [] };
      }
      acc[showId].seasons[seasonId].episodes.push(item);
    }

    return acc;
  }, {} as Record<string, { show: HierarchyItem | null; seasons: Record<string, { season: HierarchyItem | null; episodes: HierarchyItem[] }> }>);

  return (
    <div className="space-y-3">
      {Object.entries(groupedByShow).map(([showId, data]) => {
        const hasSeasons = Object.keys(data.seasons).length > 0;
        const showItem = data.show;

        return (
          <Collapsible key={showId} open={openShows.has(showId)} onOpenChange={() => toggleShow(showId)}>
            <Card className="p-0 overflow-hidden">
              {/* Show Level */}
              {showItem && (
                <div className="p-4 bg-card/50">
                  <div className="flex items-start gap-3">
                    {hasSeasons && (
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 mt-1"
                        >
                          {openShows.has(showId) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                    {showItem.content.poster_url && (
                      <img
                        src={showItem.content.poster_url}
                        alt={showItem.content.title}
                        className="w-16 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 
                        className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/show/${showItem.content.external_id}`)}
                      >
                        {showItem.content.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(showItem.id, showItem.content.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seasons Level */}
              {hasSeasons && (
                <CollapsibleContent>
                  <div className="border-t border-border/20">
                    {Object.entries(data.seasons).map(([seasonId, seasonData]) => {
                      const hasEpisodes = seasonData.episodes.length > 0;
                      const seasonItem = seasonData.season;

                      return (
                        <Collapsible 
                          key={seasonId} 
                          open={openSeasons.has(seasonId)} 
                          onOpenChange={() => toggleSeason(seasonId)}
                        >
                          <div className="border-b border-border/10 last:border-b-0">
                            {seasonItem && (
                              <div className="p-3 pl-16 bg-muted/30">
                                <div className="flex items-center gap-2">
                                  {hasEpisodes && (
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                      >
                                        {openSeasons.has(seasonId) ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </CollapsibleTrigger>
                                  )}
                                  <span className="font-medium">{seasonItem.content.title}</span>
                                  <div className="flex items-center gap-2 ml-auto">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onRemove(seasonItem.id, seasonItem.content.title)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Episodes Level */}
                            {hasEpisodes && (
                              <CollapsibleContent>
                                <div className="bg-muted/10">
                                  {seasonData.episodes.map((episode) => (
                                    <div
                                      key={episode.id}
                                      className="p-2 pl-24 border-t border-border/10 flex items-center justify-between"
                                    >
                                      <span className="text-sm">{episode.content.title}</span>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => onRemove(episode.id, episode.content.title)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            )}
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              )}
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
