import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function CollectionCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
  });

  const handleCreate = async () => {
    if (!user) return;
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Collection name is required',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_public: formData.isPublic,
          is_curated: false,
          is_ai_generated: false,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Collection created successfully',
      });

      navigate(`/collection/${data.id}`);
    } catch (error) {
      console.error('Error creating collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to create collection',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate('/collections')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Collections
      </Button>

      <div>
        <h1 className="text-3xl font-bold mb-2">Create New Collection</h1>
        <p className="text-muted-foreground">
          Organize your favorite shows into themed collections
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Collection Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Best Sci-Fi Shows"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="What makes this collection special?"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Collection</Label>
              <p className="text-sm text-muted-foreground">
                Allow others to view this collection
              </p>
            </div>
            <Switch
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
            />
          </div>
        </div>

        <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
          <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">Cover image upload</p>
          <p className="text-sm">Coming soon...</p>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleCreate} 
            disabled={creating}
            className="flex-1"
          >
            {creating ? 'Creating...' : 'Create Collection'}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/collections/ai-builder')}
            className="flex-1"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Use AI Instead
          </Button>
        </div>
      </Card>
    </div>
  );
}
