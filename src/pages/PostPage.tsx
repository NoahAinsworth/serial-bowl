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
import { useTVDB } from '@/hooks/useTVDB';
import { X, Loader2 } from 'lucide-react';

export default function PostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { search } = useTVDB();
  
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<{ id: string; title: string; kind: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);

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
    // Get or create content entry
    let { data: content } = await supabase
      .from('content')
      .select('id, title, kind')
      .eq('external_src', 'thetvdb')
      .eq('external_id', show.id.toString())
      .eq('kind', 'show')
      .single();

    if (!content) {
      const { data: newContent } = await supabase
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
      
      content = newContent;
    }

    if (content) {
      setSelectedContent(content);
      setSearchQuery('');
      setSearchResults([]);
    }
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
              📺 {selectedContent.title}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedContent(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label>Tag a show (optional)</Label>
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
            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
              {searchResults.map((show) => (
                <button
                  key={show.id}
                  onClick={() => handleSelectShow(show)}
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors"
                >
                  <p className="font-medium">{show.name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {show.overview}
                  </p>
                </button>
              ))}
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
