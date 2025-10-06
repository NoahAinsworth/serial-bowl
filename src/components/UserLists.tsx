import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomList {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  item_count: number;
  created_at: string;
}

export function UserLists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLists();
    }
  }, [user]);

  const loadLists = async () => {
    if (!user) return;

    const { data: listsData } = await supabase
      .from('custom_lists')
      .select('id, name, description, is_public, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (listsData) {
      // Get item counts for each list
      const listsWithCounts = await Promise.all(
        listsData.map(async (list) => {
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

  const deleteList = async (listId: string) => {
    const { error } = await supabase
      .from('custom_lists')
      .delete()
      .eq('id', listId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete list",
        variant: "destructive",
      });
    } else {
      toast({
        title: "List deleted",
        description: "Your list has been removed",
      });
      setLists(lists.filter((list) => list.id !== listId));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p>No lists yet</p>
        <Button 
          className="mt-4" 
          onClick={() => navigate('/lists')}
        >
          Create your first list
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {lists.map((list) => (
        <Card
          key={list.id}
          className="p-4 cursor-pointer active:border-primary/50 transition-all active:scale-[0.98]"
          onClick={() => navigate(`/list/${list.id}`)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold">{list.name}</h3>
              {list.description && (
                <p className="text-sm text-muted-foreground">{list.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                deleteList(list.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{list.item_count} items</span>
            <span>{list.is_public ? 'Public' : 'Private'}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
