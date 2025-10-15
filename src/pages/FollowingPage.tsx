import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function FollowingPage() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Button onClick={() => navigate(-1)} variant="ghost">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="text-center py-12 space-y-4">
        <h1 className="text-3xl font-bold">Following</h1>
        <p className="text-muted-foreground">Ready for new functionality</p>
      </div>
    </div>
  );
}
