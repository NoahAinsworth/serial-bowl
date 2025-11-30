import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Plus, List, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomList {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  item_count: number;
  created_at: string;
}

export default function ListsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newList, setNewList] = useState({
    name: '',
    description: '',
    is_public: true,
  });

  useEffect(() => {
    if (user) {
      loadLists();
    }
  }, [user]);

  const loadLists = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('custom_lists')
      .select(`
        id,
        name,
        description,
        is_public,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Get item counts for each list
      const listsWithCounts = await Promise.all(
        data.map(async (list) => {
          const { count } = await supabase
            .from('list_items')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);

          return {
            ...list,
            item_count: count || 0,
          };
        })
      );

      setLists(listsWithCounts);
    }

    setLoading(false);
  };

  const createList = async () => {
    if (!user || !newList.name.trim()) return;

    const { error } = await supabase
      .from('custom_lists')
      .insert({
        user_id: user.id,
        name: newList.name.trim(),
        description: newList.description.trim(),
        is_public: newList.is_public,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create list",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "List created!",
      });
      setNewList({ name: '', description: '', is_public: true });
      setDialogOpen(false);
      loadLists();
    }
  };

  const deleteList = async (id: string, name: string) => {
    const { error } = await supabase
      .from('custom_lists')
      .delete()
      .eq('id', id);

    if (!error) {
      setLists(lists.filter(list => list.id !== id));
      toast({
        title: "Deleted",
        description: `"${name}" has been deleted`,
      });
    }
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-muted-foreground">Please sign in to manage your lists</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <List className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold neon-glow">My Lists</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/lists/ai-builder')}
            className="hidden sm:flex"
          >
            ✨ AI Builder
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/lists/builder')}
            className="hidden sm:flex"
          >
            🏗️ List Builder
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-glow">
                <Plus className="h-4 w-4 mr-2" />
                Create List
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Input
                  placeholder="List name"
                  value={newList.name}
                  onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                />
              </div>
              <div>
                <Textarea
                  placeholder="Description (optional)"
                  value={newList.description}
                  onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                />
              </div>
              <Button onClick={createList} className="w-full btn-glow">
                Create List
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {lists.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">You haven't created any lists yet</p>
          <Button onClick={() => setDialogOpen(true)} className="btn-glow">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First List
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="p-6 hover:border-primary/50 transition-all hover-scale cursor-pointer"
              onClick={() => navigate(`/lists/${list.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-lg">{list.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteList(list.id, list.name);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              {list.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {list.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{list.item_count} shows</span>
                <span>{list.is_public ? '🌍 Public' : '🔒 Private'}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}