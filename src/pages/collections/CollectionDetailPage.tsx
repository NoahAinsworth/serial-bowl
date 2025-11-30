import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Lock, Share2, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_curated: boolean;
  is_ai_generated: boolean;
  is_public: boolean;
  user_id: string | null;
  ai_prompt: string | null;
  creator?: {
    handle: string;
    avatar_url: string | null;
  };
}

interface CollectionItem {
  id: string;
  position: number;
  notes: string | null;
  content: {
    id: string;
    title: string;
    external_id: string;
    poster_url: string | null;
    metadata: any;
  };
}

export default function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadCollection();
  }, [id, user]);

  const loadCollection = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Load collection details
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select(`
          *,
          creator:profiles!collections_user_id_fkey(handle, avatar_url)
        `)
        .eq('id', id)
        .maybeSingle();

      if (collectionError) throw collectionError;
      if (!collectionData) {
        toast({
          title: 'Not Found',
          description: 'Collection not found',
          variant: 'destructive',
        });
        navigate('/collections');
        return;
      }

      setCollection(collectionData);
      setIsOwner(user?.id === collectionData.user_id);

      // Load collection items
      const { data: itemsData, error: itemsError } = await supabase
        .from('collection_items')
        .select(`
          id,
          position,
          notes,
          content:content_id (
            id,
            title,
            external_id,
            poster_url,
            metadata
          )
        `)
        .eq('collection_id', id)
        .order('position', { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error loading collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (collection) {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Copied!',
        description: 'Collection link copied to clipboard',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      </div>
    );
  }

  if (!collection) return null;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/collections')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Collections
      </Button>

      {/* Collection Header */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 p-8">
        {collection.cover_url && (
          <div className="absolute inset-0">
            <img 
              src={collection.cover_url} 
              alt={collection.name}
              className="w-full h-full object-cover opacity-30 blur-sm"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
        )}
        
        <div className="relative space-y-4">
          <div className="flex flex-wrap gap-2">
            {collection.is_curated && (
              <Badge variant="secondary" className="bg-primary">
                Serial Bowl Curated
              </Badge>
            )}
            {collection.is_ai_generated && (
              <Badge variant="secondary" className="bg-purple-500">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Generated
              </Badge>
            )}
            <Badge variant="outline">
              {collection.is_public ? (
                <><Globe className="h-3 w-3 mr-1" /> Public</>
              ) : (
                <><Lock className="h-3 w-3 mr-1" /> Private</>
              )}
            </Badge>
          </div>

          <h1 className="text-4xl font-bold">{collection.name}</h1>
          
          {collection.description && (
            <p className="text-lg text-muted-foreground max-w-3xl">
              {collection.description}
            </p>
          )}

          {collection.ai_prompt && (
            <Card className="p-4 bg-purple-500/10 border-purple-500/20">
              <p className="text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 inline mr-1" />
                AI Prompt: "{collection.ai_prompt}"
              </p>
            </Card>
          )}

          {collection.creator && !collection.is_curated && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Created by</span>
              <span className="font-semibold">@{collection.creator.handle}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            {isOwner && (
              <Button variant="outline" onClick={() => navigate(`/collections/edit/${id}`)}>
                Edit Collection
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Collection Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            Shows ({items.length})
          </h2>
          {isOwner && (
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Shows
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No shows in this collection yet</p>
            {isOwner && (
              <p className="text-sm mt-2">Add some shows to get started!</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:scale-105 transition-all overflow-hidden group"
                onClick={() => navigate(`/show/${item.content.external_id}`)}
              >
                <div className="aspect-[2/3] relative">
                  {item.content.poster_url ? (
                    <img
                      src={item.content.poster_url}
                      alt={item.content.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <span className="text-4xl">📺</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-semibold line-clamp-2">
                        {item.content.title}
                      </p>
                    </div>
                  </div>
                  {item.position > 0 && (
                    <Badge 
                      className="absolute top-2 left-2 bg-primary/90"
                      variant="secondary"
                    >
                      #{item.position}
                    </Badge>
                  )}
                </div>
                {item.notes && (
                  <div className="p-2 text-xs text-muted-foreground line-clamp-2">
                    {item.notes}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
