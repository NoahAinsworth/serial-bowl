import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <img src={cerealBowlLogo} alt="Logo" className="w-32 h-32" />
          <p className="text-xl font-medium text-muted-foreground">Your TV social network</p>
        </div>
        <p className="text-muted-foreground">
          Discover and track your favorite TV shows
        </p>
        <Button onClick={() => navigate('/auth')} size="lg">
          Get Started
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-6 px-4">
      <div className="text-center py-12 space-y-4">
        <h1 className="text-3xl font-bold">Home Feed</h1>
        <p className="text-muted-foreground">Ready for new functionality</p>
      </div>
    </div>
  );
}
