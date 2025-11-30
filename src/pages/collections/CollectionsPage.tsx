import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CollectionsPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Collections</h1>
        <Button onClick={() => navigate('/collections/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Collection
        </Button>
      </div>

      <div className="text-center py-20 text-muted-foreground">
        <p>Collections feature coming soon...</p>
        <p className="text-sm mt-2">Curated show collections and AI-generated lists</p>
      </div>
    </div>
  );
}
