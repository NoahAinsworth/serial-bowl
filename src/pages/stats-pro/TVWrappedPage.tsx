import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TVWrappedPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/profile')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>

      <div className="flex items-center gap-2">
        <Gift className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Your TV Wrapped</h1>
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      
      <div className="text-center py-20 text-muted-foreground">
        <p>Your personalized TV year in review coming soon...</p>
        <p className="text-sm mt-2">Share your watch stats and TV persona</p>
      </div>
    </div>
  );
}
