import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PlusCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AddToListButtonProps {
  contentId: string;
  showTitle: string;
}

interface UserList {
  id: string;
  name: string;
}

export function AddToListButton({ contentId, showTitle }: AddToListButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadLists();
    }
  }, [user]);

  const loadLists = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('custom_lists')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setLists(data);
    }
  };

  const addToList = async (listId: string, listName: string) => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('list_items')
      .insert({
        list_id: listId,
        content_id: contentId,
      });

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        toast({
          title: "Already in list",
          description: `${showTitle} is already in "${listName}"`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add to list",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Added to list",
        description: `${showTitle} added to "${listName}"`,
      });
    }

    setLoading(false);
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add to List
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {lists.length === 0 ? (
          <DropdownMenuItem disabled>No lists yet</DropdownMenuItem>
        ) : (
          lists.map((list) => (
            <DropdownMenuItem
              key={list.id}
              onClick={() => addToList(list.id, list.name)}
            >
              {list.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}