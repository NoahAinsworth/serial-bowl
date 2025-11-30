import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WatchPartyRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/watch-party')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Watch Parties
      </Button>

      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Watch Party Room</h1>
      </div>
      
      <div className="text-center py-20 text-muted-foreground">
        <p>Watch party room {id} coming soon...</p>
        <p className="text-sm mt-2">Group chat, progress tracking, and synchronized viewing</p>
      </div>
    </div>
  );
}
