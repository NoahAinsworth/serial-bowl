import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollectionCard } from '@/components/collections/CollectionCard';
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
  creator?: {
    handle: string;
  };
  item_count: number;
}

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [curatedCollections, setCuratedCollections] = useState<Collection[]>([]);
  const [aiCollections, setAiCollections] = useState<Collection[]>([]);
  const [userCollections, setUserCollections] = useState<Collection[]>([]);

  useEffect(() => {
    loadCollections();
  }, [user]);

  const loadCollections = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load all collections with item counts
      const { data: collections, error } = await supabase
        .from('collections')
        .select(`
          *,
          creator:profiles!collections_user_id_fkey(handle),
          collection_items(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include item count
      const transformedCollections = (collections || []).map((col: any) => ({
        ...col,
        item_count: col.collection_items?.[0]?.count || 0,
        creator: col.creator,
      }));

      // Separate into categories
      setCuratedCollections(
        transformedCollections.filter((c: Collection) => c.is_curated)
      );
      setAiCollections(
        transformedCollections.filter((c: Collection) => c.is_ai_generated && !c.is_curated)
      );
      setUserCollections(
        transformedCollections.filter((c: Collection) => !c.is_curated && !c.is_ai_generated)
      );
    } catch (error) {
      console.error('Error loading collections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collections',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const CollectionGrid = ({ collections }: { collections: Collection[] }) => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      );
    }

    if (collections.length === 0) {
      return (
        <div className="text-center py-20 text-muted-foreground">
          <p>No collections found</p>
          <p className="text-sm mt-2">Be the first to create one!</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.id}
            id={collection.id}
            name={collection.name}
            description={collection.description || undefined}
            coverUrl={collection.cover_url || undefined}
            itemCount={collection.item_count}
            isCurated={collection.is_curated}
            isAiGenerated={collection.is_ai_generated}
            isPublic={collection.is_public}
            creatorHandle={collection.creator?.handle}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Collections</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/collections/ai-builder')}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Create
          </Button>
          <Button onClick={() => navigate('/collections/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      <Tabs defaultValue="curated" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="curated">Curated</TabsTrigger>
          <TabsTrigger value="ai">AI Generated</TabsTrigger>
          <TabsTrigger value="user">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="curated" className="mt-6">
          <CollectionGrid collections={curatedCollections} />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <CollectionGrid collections={aiCollections} />
        </TabsContent>

        <TabsContent value="user" className="mt-6">
          <CollectionGrid collections={userCollections} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
