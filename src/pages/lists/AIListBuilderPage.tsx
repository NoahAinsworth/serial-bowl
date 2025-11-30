import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AIListBuilderPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/lists')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Lists
      </Button>

      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">AI List Builder</h1>
      </div>
      
      <div className="text-center py-20 text-muted-foreground">
        <p>AI-powered list generation coming soon...</p>
        <p className="text-sm mt-2">Create lists with natural language prompts</p>
      </div>
    </div>
  );
}
