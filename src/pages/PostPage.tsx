import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTVDB, TVSeason, TVEpisode } from '@/hooks/useTVDB';
import { X, Loader2, Film } from 'lucide-react';
import { PercentRating } from '@/components/PercentRating';
import { detectMatureContent } from '@/utils/profanityFilter';
import { createThought } from '@/api/posts';
import { parseVideoUrl } from '@/utils/videoEmbeds';

export default function PostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { search, fetchSeasons, fetchEpisodes } = useTVDB();
  
  const [postType, setPostType] = useState<'thought' | 'review' | 'video'>('thought');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<{ id: string; title: string; kind: string; external_id?: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);
  const [rating, setRating] = useState(0);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [containsMature, setContainsMature] = useState(false);
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('');
  
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
      // Format episode title with show name and season/episode numbers
      const episodeTitle = `${selectedShow!.name} — S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.number).padStart(2, '0')}: ${episode.name}`;
      
      // CORRECT FORMAT: showId:seasonNum:episodeNum
      const formattedEpisodeId = `${selectedShow!.id}:${episode.seasonNumber}:${episode.number}`;
      
      // Create/get episode content entry
      let { data: content, error: fetchError } = await supabase
        .from('content')
        .select('id, title, kind, external_id')
        .eq('external_src', 'thetvdb')
        .eq('external_id', formattedEpisodeId)
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
            external_id: formattedEpisodeId,
            kind: 'episode',
            title: episodeTitle,
            poster_url: episode.image,
            air_date: episode.aired,
            metadata: {
              overview: episode.overview,
              show_id: selectedShow!.id,
              show_name: selectedShow!.name,
              season_number: episode.seasonNumber,
              episode_number: episode.number,
              tvdb_episode_id: episode.id,
            }
          })
          .select('id, title, kind, external_id')
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
      // CORRECT FORMAT: showId:seasonNum
      const formattedSeasonId = `${selectedShow!.id}:${season.number}`;
      
      // Create/get season content entry
      let { data: content, error: fetchError } = await supabase
        .from('content')
        .select('id, title, kind, external_id')
        .eq('external_src', 'thetvdb')
        .eq('external_id', formattedSeasonId)
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
        const seasonTitle = `${selectedShow!.name} - ${season.name}`;
        const { data: newContent, error: insertError } = await supabase
          .from('content')
          .insert({
            external_src: 'thetvdb',
            external_id: formattedSeasonId,
            kind: 'season',
            title: seasonTitle,
            metadata: {
              show_id: selectedShow!.id,
              show_name: selectedShow!.name,
              season_number: season.number,
              tvdb_season_id: season.id,
            }
          })
          .select('id, title, kind, external_id')
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
        .select('id, title, kind, external_id')
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
            poster_url: show.image,
            air_date: show.firstAired,
            metadata: {
              overview: show.overview
            }
          })
          .select('id, title, kind, external_id')
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

  const formatContentDisplay = (content: { title: string; kind: string; id: string }) => {
    // For episodes, we need to fetch metadata to display in format: Show Name — S02E05: Episode Title
    // For now just return title, but we'll enhance this
    return content.title;
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
        description: "Please sign in to post",
        variant: "destructive",
      });
      return;
    }

    // Validate video posts first
    if (postType === 'video' && !videoEmbedUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a video URL',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim() && !videoEmbedUrl && postType !== 'review') return;

    if (postType === 'review' && !selectedContent) {
      toast({
        title: "Selection required",
        description: "Please select a show, season, or episode to review",
        variant: "destructive",
      });
      return;
    }

    if (postType === 'review' && rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating for your review",
        variant: "destructive",
      });
      return;
    }

    setPosting(true);

    // First, ensure profile exists
    const { data: profileExists } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileExists) {
      const defaultHandle = `user${user.id.substring(0, 8)}`;
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          handle: defaultHandle,
          bio: '',
        });

      if (profileError) {
        toast({
          title: "Error",
          description: "Please set up your profile first",
          variant: "destructive",
        });
        setPosting(false);
        navigate('/profile/edit');
        return;
      }

      await supabase.from('user_roles').insert({
        user_id: user.id,
        role: 'user',
      });
    }

    if (postType === 'video') {

      // Validate URL is from supported platform
      const videoInfo = parseVideoUrl(videoEmbedUrl);
      if (videoInfo.platform === 'unsupported') {
        toast({
          title: 'Error',
          description: 'Unsupported video platform. Use YouTube, TikTok, Instagram, or Vimeo.',
          variant: 'destructive',
        });
        setPosting(false);
        return;
      }

      try {
        const { error: postError } = await supabase
          .from('posts')
          .insert({
            author_id: user.id,
            kind: 'video',
            body: content || null,
            video_embed_url: videoEmbedUrl,
            item_type: selectedContent?.kind || null,
            item_id: selectedContent?.external_id || null,
            is_spoiler: isSpoiler,
            contains_mature: containsMature,
          });

        if (postError) throw postError;

        toast({
          title: 'Success',
          description: '✅ Video posted!',
        });

        navigate('/', { state: { scrollToTop: true } });
        return;
      } catch (error: any) {
        console.error('Video post error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to post video',
          variant: 'destructive',
        });
        setPosting(false);
        return;
      }
    }

    if (postType === 'thought') {
      try {
        const { data: newPost, error: thoughtError } = await supabase
          .from('posts')
          .insert({
            author_id: user.id,
            kind: 'thought',
            body: content.trim() || null,
            item_type: selectedContent?.kind,
            item_id: selectedContent?.external_id,
            is_spoiler: isSpoiler,
            has_spoilers: isSpoiler,
            has_mature: containsMature,
          })
          .select('id')
          .single();

        if (thoughtError) throw thoughtError;
        
        toast({
          title: "Success",
          description: "Thought posted!",
        });
        setContent('');
        setSelectedContent(null);
        setIsSpoiler(false);
        setContainsMature(false);
        navigate('/');
      } catch (error: any) {
        console.error('Post error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to post thought",
          variant: "destructive",
        });
      }
    } else {
      // Post review using the unified database function
      if (!selectedContent) {
        toast({
          title: "Error",
          description: "Please select content to review",
          variant: "destructive",
        });
        setPosting(false);
        return;
      }

      const itemType = selectedContent.kind as 'show' | 'season' | 'episode';
      const itemId = (selectedContent as any).external_id;

      const { data: reviewPost, error: reviewError } = await supabase.rpc('api_rate_and_review', {
        p_item_type: itemType,
        p_item_id: itemId,
        p_score_any: rating > 0 ? String(rating) : null,
        p_review: content.trim() || null,
        p_is_spoiler: isSpoiler,
      });

      if (reviewError) {
        console.error('Review error:', reviewError);
        toast({
          title: "Error",
          description: reviewError.message || "Failed to post review",
          variant: "destructive",
        });
        setPosting(false);
        return;
      }

      toast({
        title: "Success",
        description: "Posted!",
      });
      setContent('');
      setRating(0);
      setSelectedContent(null);
      setIsSpoiler(false);
      setContainsMature(false);
      navigate('/');
    }

    setPosting(false);
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-bold">Create Post</h2>
        
        <Tabs value={postType} onValueChange={(v) => setPostType(v as 'thought' | 'review' | 'video')}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="thought">Thought</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
          </TabsList>

          <TabsContent value="thought" className="space-y-4">
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="spoiler-thought"
                checked={isSpoiler}
                onCheckedChange={(checked) => setIsSpoiler(checked as boolean)}
              />
              <Label
                htmlFor="spoiler-thought"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                This contains spoilers
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mature-thought"
                checked={containsMature}
                onCheckedChange={(checked) => setContainsMature(checked as boolean)}
              />
              <Label
                htmlFor="mature-thought"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                🔞 This contains mature content
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <div>
              <Label className="mb-2 block">Rating *</Label>
              <PercentRating initialRating={rating || 0} onRate={setRating} compact />
            </div>

            <div>
              <Label className="mb-2 block">Review *</Label>
              <Textarea
                placeholder="Share your thoughts about this show..."
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="spoiler-review"
                checked={isSpoiler}
                onCheckedChange={(checked) => setIsSpoiler(checked as boolean)}
              />
              <Label
                htmlFor="spoiler-review"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                This contains spoilers
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mature-review"
                checked={containsMature}
                onCheckedChange={(checked) => setContainsMature(checked as boolean)}
              />
              <Label
                htmlFor="mature-review"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                🔞 This contains mature content
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="video" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-url">Video URL *</Label>
                <Input
                  id="video-url"
                  placeholder="Paste YouTube, TikTok, Instagram, or Vimeo link..."
                  value={videoEmbedUrl}
                  onChange={(e) => setVideoEmbedUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Supported: YouTube, TikTok, Instagram Reels, Vimeo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video-caption">Caption (optional)</Label>
                <Textarea
                  id="video-caption"
                  placeholder="Write a caption for your video..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {content.length}/1000
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="spoiler-video"
                  checked={isSpoiler}
                  onCheckedChange={(checked) => setIsSpoiler(checked as boolean)}
                />
                <Label htmlFor="spoiler-video">Contains spoilers</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mature-video"
                  checked={containsMature}
                  onCheckedChange={(checked) => setContainsMature(checked as boolean)}
                />
                <Label htmlFor="mature-video">🔞 Mature content</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {selectedContent && postType !== 'review' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md">
            <button
              onClick={async () => {
                try {
                  const { data } = await supabase
                    .from('content')
                    .select('external_id, metadata')
                    .eq('id', selectedContent.id)
                    .single();
                  
                  if (data?.external_id) {
                    if (selectedContent.kind === 'show') {
                      navigate(`/show/${data.external_id}`);
                    } else if (selectedContent.kind === 'season' && data.metadata) {
                      const metadata = data.metadata as any;
                      navigate(`/show/${metadata.show_id}/season/${metadata.season_number}`);
                    } else if (selectedContent.kind === 'episode' && data.metadata) {
                      const metadata = data.metadata as any;
                      navigate(`/show/${metadata.show_id}/season/${metadata.season_number}/episode/${metadata.episode_number}`);
                    }
                  }
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }}
              className="text-sm text-primary flex-1 text-left hover:underline"
              type="button"
            >
              {selectedContent.kind === 'show' && '📺 '}
              {selectedContent.kind === 'season' && '📁 '}
              {selectedContent.kind === 'episode' && '🎬 '}
              {formatContentDisplay(selectedContent)}
            </button>
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

        {postType !== 'review' && (
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
        )}

        <Button
          onClick={handlePost}
          disabled={
            posting || 
            (postType === 'thought' && !content.trim()) ||
            (postType === 'review' && (!selectedContent || rating === 0)) ||
            (postType === 'video' && !videoEmbedUrl)
          }
          className="w-full btn-glow"
        >
          {posting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Posting...
            </>
          ) : (
            postType === 'review' ? 'Post Review' : postType === 'video' ? 'Post Video' : 'Post Thought'
          )}
        </Button>
      </Card>
    </div>
  );
}
