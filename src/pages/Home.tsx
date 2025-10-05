import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import cerealBowlLogo from '@/assets/cereal-bowl-logo.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <img src={cerealBowlLogo} alt="Serialcereal Logo" className="w-32 h-32 neon-glow" />
          <p className="text-xl text-muted-foreground">Your TV social network</p>
        </div>
        <p className="text-muted-foreground">
          Rate shows, share thoughts, and connect with fellow TV enthusiasts
        </p>
        <Button onClick={() => navigate('/auth')} size="lg" className="btn-glow">
          Get Started
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      <h1 className="text-3xl font-bold neon-glow text-center">Your Feed</h1>
      
      <Card className="p-12 text-center">
        <p className="text-muted-foreground mb-4">No thoughts yet. Be the first to post!</p>
        <Button onClick={() => navigate('/post')} className="btn-glow">
          Create Post
        </Button>
      </Card>

      <div className="mt-8 text-center">
        <Button onClick={() => navigate('/search')} variant="outline" className="mr-2">
          Search Shows
        </Button>
        <Button onClick={() => navigate('/post')} className="btn-glow">
          Create Post
        </Button>
      </div>
    </div>
  );
}
