import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ListCoverUpload } from '@/components/lists/ListCoverUpload';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function ListEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    loadList();
  }, [id]);

  const loadList = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('custom_lists')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data.user_id !== user?.id) {
        toast.error('You do not have permission to edit this list');
        navigate('/lists');
        return;
      }

      setName(data.name);
      setDescription(data.description || '');
      setCoverUrl(data.cover_url || '');
      setIsPublic(data.is_public);
    } catch (error) {
      console.error('Load list error:', error);
      toast.error('Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || !name.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('custom_lists')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          cover_url: coverUrl || null,
          is_public: isPublic
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('List updated successfully');
      navigate(`/list/${id}`);
    } catch (error) {
      console.error('Update list error:', error);
      toast.error('Failed to update list');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('custom_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('List deleted successfully');
      navigate('/lists');
    } catch (error) {
      console.error('Delete list error:', error);
      toast.error('Failed to delete list');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      <Button variant="ghost" onClick={() => navigate(`/list/${id}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to List
      </Button>

      <div>
        <h1 className="text-3xl font-bold mb-2">Edit List</h1>
        <p className="text-muted-foreground">
          Update your list details
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
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete List?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this list and all its items. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Deleting...' : 'Delete List'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
