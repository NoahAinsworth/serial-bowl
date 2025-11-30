import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DraggableListItem } from '@/components/lists/DraggableListItem';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { resolveShowToContent } from '@/lib/contentResolver';

interface ListItem {
  id: string;
  contentId: string;
  title: string;
  posterUrl?: string;
  position: number;
  notes?: string;
}

export default function ListBuilderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const listId = searchParams.get('listId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listName, setListName] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (listId) {
      loadList();
    } else {
      setLoading(false);
    }
  }, [listId]);

  const loadList = async () => {
    if (!listId) return;

    try {
      const { data: list, error: listError } = await supabase
        .from('custom_lists')
        .select('name')
        .eq('id', listId)
        .single();

      if (listError) throw listError;
      setListName(list.name);

      const { data: listItems, error: itemsError } = await supabase
        .from('list_items')
        .select(`
          id,
          content_id,
          position,
          notes,
          content:content_id (
            title,
            poster_url,
            external_id
          )
        `)
        .eq('list_id', listId)
        .order('position');

      if (itemsError) throw itemsError;

      const formattedItems = listItems.map((item: any) => ({
        id: item.id,
        contentId: item.content_id,
        title: item.content.title,
        posterUrl: item.content.poster_url,
        position: item.position,
        notes: item.notes
      }));

      setItems(formattedItems);
    } catch (error) {
      console.error('Load list error:', error);
      toast.error('Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);

    try {
      // Use existing searchShows function from api/tvdb
      const { searchShows } = await import('@/api/tvdb');
      const results = await searchShows(searchQuery);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search shows');
    } finally {
      setSearching(false);
    }
  };

  const handleAddShow = async (show: any) => {
    if (!listId || !user) return;

    try {
      // Resolve show to content table
      const contentId = await resolveShowToContent(show.tvdbId, {
        name: show.title,
        image: show.posterUrl,
        overview: show.overview
      });

      // Add to list
      const newPosition = items.length + 1;
      const { data, error } = await supabase
        .from('list_items')
        .insert({
          list_id: listId,
          content_id: contentId,
          position: newPosition
        })
        .select('id')
        .single();

      if (error) throw error;

      const newItem: ListItem = {
        id: data.id,
        contentId: contentId,
        title: show.title,
        posterUrl: show.posterUrl,
        position: newPosition,
        notes: ''
      };

      setItems([...items, newItem]);
      setSearchQuery('');
      setSearchResults([]);
      toast.success(`Added ${show.title} to list`);
    } catch (error) {
      console.error('Add show error:', error);
      toast.error('Failed to add show');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      const newItems = items
        .filter(item => item.id !== itemId)
        .map((item, index) => ({ ...item, position: index + 1 }));

      setItems(newItems);
      toast.success('Item removed');
    } catch (error) {
      console.error('Remove item error:', error);
      toast.error('Failed to remove item');
    }
  };

  const handleUpdateNotes = async (itemId: string, notes: string) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, notes } : item
    ));
  };

  const handleSavePositions = async () => {
    setSaving(true);

    try {
      const updates = items.map(item => ({
        id: item.id,
        position: item.position,
        notes: item.notes || null
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('list_items')
          .update({ position: update.position, notes: update.notes })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('List saved successfully');
      navigate(`/list/${listId}`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save list');
    } finally {
      setSaving(false);
    }
  };

  const handleShowClick = (item: ListItem) => {
    // Navigate to show detail page
    supabase
      .from('content')
      .select('external_id')
      .eq('id', item.contentId)
      .single()
      .then(({ data }) => {
        if (data) {
          navigate(`/show/${data.external_id}`);
        }
      });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-muted-foreground">Loading list...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/lists')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lists
        </Button>
        
        <Button onClick={handleSavePositions} disabled={saving || items.length === 0}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save List'}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold mb-2">{listName || 'List Builder'}</h1>
        <p className="text-muted-foreground">
          Add shows and arrange them in your preferred order
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search for shows to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching}>
            <Plus className="mr-2 h-4 w-4" />
            Add Show
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Search Results:</p>
            {searchResults.slice(0, 5).map((show) => (
              <button
                key={show.tvdbId}
                onClick={() => handleAddShow(show)}
                className="w-full flex items-center gap-3 p-2 hover:bg-background rounded transition-colors text-left"
              >
                {show.posterUrl && (
                  <img
                    src={show.posterUrl}
                    alt={show.title}
                    className="w-12 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <p className="font-medium">{show.title}</p>
                  <p className="text-sm text-muted-foreground">{show.year}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No shows added yet. Search and add shows to get started!</p>
          </div>
        ) : (
          items.map((item) => (
            <DraggableListItem
              key={item.id}
              item={item}
              onRemove={() => handleRemoveItem(item.id)}
              onNotesChange={(notes) => handleUpdateNotes(item.id, notes)}
              onClick={() => handleShowClick(item)}
            />
          ))
        )}
      </div>
    </div>
  );
}
