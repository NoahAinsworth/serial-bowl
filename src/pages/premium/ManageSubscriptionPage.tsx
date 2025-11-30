import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ManageSubscriptionPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/premium')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Premium
      </Button>

      <div className="flex items-center gap-2">
        <Crown className="h-6 w-6 text-yellow-500" />
        <h1 className="text-3xl font-bold">Manage Subscription</h1>
      </div>
      
      <div className="text-center py-20 text-muted-foreground">
        <p>Subscription management coming soon...</p>
        <p className="text-sm mt-2">View billing, upgrade, or cancel your subscription</p>
      </div>
    </div>
  );
}
