import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ListBuilderPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/lists')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Lists
      </Button>

      <h1 className="text-3xl font-bold">List Builder</h1>
      
      <div className="text-center py-20 text-muted-foreground">
        <p>Drag-and-drop list builder coming soon...</p>
      </div>
    </div>
  );
}
