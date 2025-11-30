import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WatchPartyPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Watch Parties</h1>
        </div>
        <Button onClick={() => {}}>
          <Plus className="mr-2 h-4 w-4" />
          Create Party
        </Button>
      </div>

      <div className="text-center py-20 text-muted-foreground">
        <p>Watch parties feature coming soon...</p>
        <p className="text-sm mt-2">Watch shows together with friends and compete for Binge Points</p>
      </div>
    </div>
  );
}
