import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ListCoverUpload } from '@/components/lists/ListCoverUpload';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function ListCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('custom_lists')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          cover_url: coverUrl || null,
          is_public: isPublic,
          is_ai_generated: false
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('List created successfully');
      navigate(`/lists/builder?listId=${data.id}`);
    } catch (error) {
      console.error('Create list error:', error);
      toast.error('Failed to create list');
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = () => {
    navigate('/lists/ai-builder');
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      <Button variant="ghost" onClick={() => navigate('/lists')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Lists
      </Button>

      <div>
        <h1 className="text-3xl font-bold mb-2">Create New List</h1>
        <p className="text-muted-foreground">
          Curate your own collection of shows
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">List Name *</Label>
          <Input
            id="name"
            placeholder="e.g. Best Sci-Fi Shows"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe what makes this list special..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <ListCoverUpload
          currentCoverUrl={coverUrl}
          onUploadComplete={setCoverUrl}
        />

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="public">Public List</Label>
            <p className="text-sm text-muted-foreground">
              Allow others to discover and follow this list
            </p>
          </div>
          <Switch
            id="public"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="flex-1"
          >
            Create List
          </Button>
          
          <Button
            variant="outline"
            onClick={handleAIGenerate}
            className="flex-1"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate with AI
          </Button>
        </div>
      </div>
    </div>
  );
}
