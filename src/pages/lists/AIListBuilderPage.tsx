import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { resolveShowToContent } from '@/lib/contentResolver';

export default function AIListBuilderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [generatedShows, setGeneratedShows] = useState<any[]>([]);

  const examplePrompts = [
    "Create a list of must-watch sci-fi shows from the 2010s",
    "Best comedy shows for binge-watching on weekends",
    "Dark and mysterious thriller series like True Detective",
    "Animated shows with deep storytelling for adults"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);

    try {
      const { data: session } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id })
        .select('id')
        .single();

      if (!session) throw new Error('Failed to create session');

      const response = await supabase.functions.invoke('binge-bot-chat', {
        body: {
          sessionId: session.id,
          message: `Create a list of TV shows based on this request: "${prompt}". Return ONLY a JSON array of shows with this format: [{"name": "Show Name", "year": 2020, "reason": "Why it fits"}]. Include 8-12 shows.`
        }
      });

      if (response.error) throw response.error;

      const content = response.data.reply;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const shows = JSON.parse(jsonMatch[0]);
        setGeneratedShows(shows);
        
        if (!listName) {
          setListName(prompt.slice(0, 60));
        }
      } else {
        throw new Error('Could not parse AI response');
      }

      toast.success('List generated! Review and save.');
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Failed to generate list');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !listName.trim() || generatedShows.length === 0) {
      toast.error('Please generate a list first');
      return;
    }

    setLoading(true);

    try {
      // Create list
      const { data: list, error: listError } = await supabase
        .from('custom_lists')
        .insert({
          user_id: user.id,
          name: listName.trim(),
          description: description.trim() || null,
          is_public: isPublic,
          is_ai_generated: true,
          ai_prompt: prompt
        })
        .select('id')
        .single();

      if (listError) throw listError;

      // Search and add shows
      let position = 1;
      for (const show of generatedShows) {
        try {
          // Search TVDB
          const searchResponse = await fetch(
            `https://api4.thetvdb.com/v4/search?query=${encodeURIComponent(show.name)}&type=series&year=${show.year || ''}`,
            {
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_TVDB_API_KEY}`
              }
            }
          );

          if (!searchResponse.ok) continue;

          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data.length > 0) {
            const tvdbShow = searchData.data[0];
            const contentId = await resolveShowToContent(parseInt(tvdbShow.tvdb_id), tvdbShow);

            await supabase.from('list_items').insert({
              list_id: list.id,
              content_id: contentId,
              position: position++,
              notes: show.reason || null
            });
          }
        } catch (error) {
          console.error(`Failed to add ${show.name}:`, error);
        }
      }

      toast.success('AI list created successfully!');
      navigate(`/list/${list.id}`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <Button variant="ghost" onClick={() => navigate('/lists')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Lists
      </Button>

      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">AI List Builder</h1>
      </div>
      
      <p className="text-muted-foreground">
        Describe the kind of list you want, and AI will generate personalized recommendations
      </p>

      {!generatedShows.length ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prompt">Describe Your List</Label>
            <Textarea
              id="prompt"
              placeholder="e.g., Create a list of gripping thriller shows with plot twists..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Example Prompts</Label>
            <div className="grid gap-2">
              {examplePrompts.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(example)}
                  className="text-left p-3 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={loading || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {loading ? 'Generating...' : 'Generate List with AI'}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="listName">List Name</Label>
              <Input
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="public">Public List</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to discover this list
                </p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Generated Shows ({generatedShows.length})</h3>
            {generatedShows.map((show, index) => (
              <div key={index} className="p-4 bg-muted rounded-lg space-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{show.name}</p>
                    {show.year && (
                      <p className="text-sm text-muted-foreground">{show.year}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                </div>
                {show.reason && (
                  <p className="text-sm text-muted-foreground">{show.reason}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setGeneratedShows([]);
                setPrompt('');
              }}
              className="flex-1"
            >
              Start Over
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save List'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
