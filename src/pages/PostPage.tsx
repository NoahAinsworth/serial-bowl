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
        title: "Authentication required",
        description: "Please sign in to post.",
        variant: "destructive",
      });
      return;
    }

    // Validation
    if (postType === 'thought' && !content.trim() && !selectedContent) {
      toast({
        title: "Content required",
        description: "Please write something or tag content to post.",
        variant: "destructive",
      });
      return;
    }

    if (postType === 'review') {
      if (!selectedContent) {
        toast({
          title: "Content required",
          description: "Please select a show, season, or episode to review.",
          variant: "destructive",
        });
        return;
      }
      if (rating === 0) {
        toast({
          title: "Rating required",
          description: "Please provide a rating for your review.",
          variant: "destructive",
        });
        return;
      }
    }

    if (postType === 'video' && !videoEmbedUrl.trim()) {
      toast({
        title: "Video URL required",
        description: "Please provide a video URL to post.",
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

    try {
      if (postType === 'thought' || postType === 'video') {
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
            video_embed_url: postType === 'video' ? videoEmbedUrl.trim() : null,
          })
          .select('id')
          .single();

        if (thoughtError) throw thoughtError;
        
        toast({
          title: "Posted!",
          description: postType === 'video' ? "Your video has been shared." : "Your thought has been shared.",
        });
        setContent('');
        setVideoEmbedUrl('');
        setSelectedContent(null);
        setIsSpoiler(false);
        setContainsMature(false);
        navigate('/');
      } else if (postType === 'review') {
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

        if (reviewError) throw reviewError;

        toast({
          title: "Posted!",
          description: "Your review has been shared.",
        });
        setContent('');
        setRating(0);
        setSelectedContent(null);
        setIsSpoiler(false);
        setContainsMature(false);
        navigate('/');
      }
    } catch (error: any) {
      console.error('Post error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to post",
        variant: "destructive",
      });
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

          {/* Video Tab */}
          <TabsContent value="video" className="space-y-4">
            <div>
              <Label className="mb-2 block">Video URL *</Label>
              <Input
                placeholder="Paste YouTube, TikTok, Instagram, or Twitter video URL..."
                value={videoEmbedUrl}
                onChange={(e) => setVideoEmbedUrl(e.target.value)}
                type="url"
              />
            </div>
            
            <div>
              <Label className="mb-2 block">Caption (optional)</Label>
              <Textarea
                placeholder="Add a caption to your video..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none"
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
                id="video-spoiler" 
                checked={isSpoiler}
                onCheckedChange={(checked) => setIsSpoiler(checked as boolean)}
              />
              <Label
                htmlFor="video-spoiler"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                This contains spoilers
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="video-mature" 
                checked={containsMature}
                onCheckedChange={(checked) => setContainsMature(checked as boolean)}
              />
              <Label
                htmlFor="video-mature"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                🔞 This contains mature content
              </Label>
            </div>
          </TabsContent>
        </Tabs>

        {/* Video Tab */}
        <TabsContent value="video" className="space-y-4">
          <div>
            <Label className="mb-2 block">Video URL *</Label>
            <Input
              placeholder="Paste YouTube, TikTok, Instagram, or Twitter video URL..."
              value={videoEmbedUrl}
              onChange={(e) => setVideoEmbedUrl(e.target.value)}
              type="url"
            />
          </div>
          
          <div>
            <Label className="mb-2 block">Caption (optional)</Label>
            <Textarea
              placeholder="Add a caption to your video..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none"
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
              id="video-spoiler" 
              checked={isSpoiler}
              onCheckedChange={(checked) => setIsSpoiler(checked as boolean)}
            />
            <Label
              htmlFor="video-spoiler"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              This contains spoilers
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="video-mature" 
              checked={containsMature}
              onCheckedChange={(checked) => setContainsMature(checked as boolean)}
            />
            <Label
              htmlFor="video-mature"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              🔞 This contains mature content
            </Label>
          </div>
        </TabsContent>

        <Button
          onClick={handlePost}
            disabled={
              posting || 
              (postType === 'thought' && !content.trim() && !selectedContent) ||
              (postType === 'review' && (!selectedContent || rating === 0)) ||
              (postType === 'video' && !videoEmbedUrl.trim())
            }
          className="w-full btn-glow"
        >
          {posting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Posting...
            </>
          ) : (
            postType === 'review' ? 'Post Review' : 
            postType === 'video' ? 'Post Video' : 
            'Post Thought'
          )}
        </Button>
      </Card>
    </div>
  );
}
