import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdvancedStatsPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/profile')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>

      <div className="flex items-center gap-2">
        <BarChart className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Advanced Stats</h1>
      </div>
      
      <div className="text-center py-20 text-muted-foreground">
        <p>Advanced analytics coming soon...</p>
        <p className="text-sm mt-2">Calendar heatmap, genre breakdown, watch streaks, and more</p>
      </div>
    </div>
  );
}
