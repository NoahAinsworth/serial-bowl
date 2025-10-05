import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTVDB, TVSeason, TVEpisode } from '@/hooks/useTVDB';
import { X, Loader2, ChevronRight } from 'lucide-react';

export default function PostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { search, fetchSeasons, fetchEpisodes } = useTVDB();
  
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<{ id: string; title: string; kind: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);
  
  // For hierarchical selection
  const [selectedShow, setSelectedShow] = useState<any | null>(null);
  const [seasons, setSeasons] = useState<TVSeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<TVSeason | null>(null);
  const [episodes, setEpisodes] = useState<TVEpisode[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async () => {
    setSearching(true);
    const results = await search(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSelectShow = async (show: any) => {
    setSelectedShow(show);
    setSearchQuery('');
    setSearchResults([]);
    
    // Load seasons for this show
    setLoadingSeasons(true);
    const seasonsData = await fetchSeasons(show.id);
    setSeasons(seasonsData.filter(s => s.number !== 0)); // Filter out Season 0
    setLoadingSeasons(false);
  };

  const handleSelectSeason = async (season: TVSeason) => {
    setSelectedSeason(season);
    
    // Load episodes for this season
    setLoadingEpisodes(true);
    const episodesData = await fetchEpisodes(selectedShow!.id, season.number);
    setEpisodes(episodesData);
    setLoadingEpisodes(false);
  };

  const handleSelectEpisode = async (episode: TVEpisode) => {
    try {
      // Create/get episode content entry
      let { data: content, error: fetchError } = await supabase
        .from('content')
        .select('id, title, kind')
        .eq('external_src', 'thetvdb')
        .eq('external_id', episode.id.toString())
        .eq('kind', 'episode')
        .maybeSingle();

      if (fetchError) {
        toast({
          title: "Error",
          description: `Failed to check episode: ${fetchError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!content) {
        const { data: newContent, error: insertError } = await supabase
          .from('content')
          .insert({
            external_src: 'thetvdb',
            external_id: episode.id.toString(),
            kind: 'episode',
            title: episode.name,
            overview: episode.overview,
            poster_url: episode.image,
            air_date: episode.aired,
          })
          .select('id, title, kind')
          .single();
        
        if (insertError) {
          toast({
            title: "Error",
            description: `Failed to create episode: ${insertError.message}`,
            variant: "destructive",
          });
          return;
        }
        
        content = newContent;
      }

      if (content) {
        setSelectedContent(content);
        resetSelection();
        toast({
          title: "Success",
          description: `Tagged: ${content.title}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSelectSeasonAsTag = async (season: TVSeason) => {
    try {
      // Create/get season content entry
      let { data: content, error: fetchError } = await supabase
        .from('content')
        .select('id, title, kind')
        .eq('external_src', 'thetvdb')
        .eq('external_id', season.id.toString())
        .eq('kind', 'season')
        .maybeSingle();

      if (fetchError) {
        toast({
          title: "Error",
          description: `Failed to check season: ${fetchError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!content) {
        const { data: newContent, error: insertError } = await supabase
          .from('content')
          .insert({
            external_src: 'thetvdb',
            external_id: season.id.toString(),
            kind: 'season',
            title: season.name,
          })
          .select('id, title, kind')
          .single();
        
        if (insertError) {
          toast({
            title: "Error",
            description: `Failed to create season: ${insertError.message}`,
            variant: "destructive",
          });
          return;
        }
        
        content = newContent;
      }

      if (content) {
        setSelectedContent(content);
        resetSelection();
        toast({
          title: "Success",
          description: `Tagged: ${content.title}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSelectShowAsTag = async (show: any) => {
    try {
      // Get or create show content entry
      let { data: content, error: fetchError } = await supabase
        .from('content')
        .select('id, title, kind')
        .eq('external_src', 'thetvdb')
        .eq('external_id', show.id.toString())
        .eq('kind', 'show')
        .maybeSingle();

      if (fetchError) {
        toast({
          title: "Error",
          description: `Failed to check show: ${fetchError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!content) {
        const { data: newContent, error: insertError } = await supabase
          .from('content')
          .insert({
            external_src: 'thetvdb',
            external_id: show.id.toString(),
            kind: 'show',
            title: show.name,
            overview: show.overview,
            poster_url: show.image,
            air_date: show.firstAired,
          })
          .select('id, title, kind')
          .single();
        
        if (insertError) {
          toast({
            title: "Error",
            description: `Failed to create show: ${insertError.message}`,
            variant: "destructive",
          });
          return;
        }
        
        content = newContent;
      }

      if (content) {
        setSelectedContent(content);
        resetSelection();
        toast({
          title: "Success",
          description: `Tagged: ${content.title}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const resetSelection = () => {
    setSelectedShow(null);
    setSeasons([]);
    setSelectedSeason(null);
    setEpisodes([]);
  };

  const handlePost = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to post thoughts",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) return;

    setPosting(true);

    const { error } = await supabase
      .from('thoughts')
      .insert({
        user_id: user.id,
        content_id: selectedContent?.id || null,
        text_content: content.trim(),
        moderation_status: 'allow', // Simple allow for MVP
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post thought",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Thought posted!",
      });
      setContent('');
      setSelectedContent(null);
      navigate('/');
    }

    setPosting(false);
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-bold">Share Your Thoughts</h2>
        
        <div>
          <Textarea
            placeholder="What's on your mind about TV?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none"
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-muted-foreground">
              {content.length} / 500
            </span>
          </div>
        </div>

        {selectedContent && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md">
            <span className="text-sm text-primary flex-1">
              {selectedContent.kind === 'show' && '📺'}
              {selectedContent.kind === 'season' && '📁'}
              {selectedContent.kind === 'episode' && '🎬'} {selectedContent.title}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedContent(null);
                resetSelection();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label>Tag content (optional)</Label>
          
          {!selectedShow && (
            <>
              <Input
                placeholder="Search for a show..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              {searching && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2 bg-background z-50">
                  {searchResults.map((show) => (
                    <button
                      key={show.id}
                      onClick={() => handleSelectShow(show)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors"
                      type="button"
                    >
                      <p className="font-medium">{show.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {show.overview}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {selectedShow && !selectedSeason && (
            <div className="space-y-2 border rounded-md p-3 bg-background">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">Select from: {selectedShow.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetSelection}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectShowAsTag(selectedShow)}
                className="w-full"
                type="button"
              >
                Tag entire show
              </Button>

              {loadingSeasons ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Or select a season:</p>
                  {seasons.map((season) => (
                    <div key={season.id} className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectSeason(season)}
                        className="col-span-2 justify-start"
                        type="button"
                      >
                        {season.name}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSelectSeasonAsTag(season)}
                        type="button"
                      >
                        Tag
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedSeason && (
            <div className="space-y-2 border rounded-md p-3 bg-background">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">{selectedSeason.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSeason(null);
                    setEpisodes([]);
                  }}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {loadingEpisodes ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-sm text-muted-foreground mb-2">Select an episode:</p>
                  {episodes.map((episode) => (
                    <button
                      key={episode.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectEpisode(episode);
                      }}
                      className="w-full text-left px-4 py-3 border rounded-md hover:bg-muted hover:border-primary transition-colors cursor-pointer bg-background"
                      type="button"
                    >
                      <p className="font-medium text-sm">
                        {episode.number}. {episode.name}
                      </p>
                      {episode.overview && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {episode.overview}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Button
          onClick={handlePost}
          disabled={!content.trim() || posting}
          className="w-full btn-glow"
        >
          {posting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Posting...
            </>
          ) : (
            'Post Thought'
          )}
        </Button>
      </Card>
    </div>
  );
}
