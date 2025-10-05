import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ListItem {
  id: string;
  content: {
    id: string;
    title: string;
    poster_url?: string;
    external_id: string;
    overview?: string;
  };
  added_at: string;
}

export default function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [listName, setListName] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);

  useEffect(() => {
    if (user && listId) {
      loadList();
    }
  }, [user, listId]);

  const loadList = async () => {
    if (!user || !listId) return;

    // Get list details
    const { data: listData } = await supabase
      .from('custom_lists')
      .select('name')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single();

    if (listData) {
      setListName(listData.name);
    }

    // Get list items
    const { data: itemsData, error } = await supabase
      .from('list_items')
      .select(`
        id,
        added_at,
        content (
          id,
          title,
          poster_url,
          external_id,
          overview
        )
      `)
      .eq('list_id', listId)
      .order('added_at', { ascending: false });

    if (!error && itemsData) {
      setItems(itemsData as any);
    }

    setLoading(false);
  };

  const removeItem = async (itemId: string, title: string) => {
    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('id', itemId);

    if (!error) {
      setItems(items.filter(item => item.id !== itemId));
      toast({
        title: "Removed",
        description: `"${title}" removed from list`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/lists')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold neon-glow">{listName}</h1>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">This list is empty</p>
          <Button onClick={() => navigate('/search')} className="btn-glow">
            Add Shows
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="p-4 hover:border-primary/50 transition-all hover-scale"
            >
              <div className="flex gap-4">
                {item.content.poster_url ? (
                  <img
                    src={item.content.poster_url}
                    alt={item.content.title}
                    className="w-24 h-36 object-cover rounded cursor-pointer"
                    onClick={() => navigate(`/show/${item.content.external_id}`)}
                  />
                ) : (
                  <div 
                    className="w-24 h-36 bg-gradient-to-br from-primary to-secondary flex items-center justify-center rounded cursor-pointer"
                    onClick={() => navigate(`/show/${item.content.external_id}`)}
                  >
                    <span className="text-white font-bold text-center text-xs px-2">
                      {item.content.title}
                    </span>
                  </div>
                )}
                
                <div className="flex-1 flex flex-col">
                  <h3 
                    className="font-bold mb-1 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/show/${item.content.external_id}`)}
                  >
                    {item.content.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2 flex-1">
                    {item.content.overview || 'No description available'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      Added {new Date(item.added_at).toLocaleDateString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id, item.content.title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}