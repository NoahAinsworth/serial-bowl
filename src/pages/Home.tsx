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
          Rate shows, share thoughts, and connect with fellow TV enthusiasts
        </p>
        <Button onClick={() => navigate('/auth')} size="lg">
          Get Started
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-6">
      {/* Wordmark */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold tracking-[0.5em] mx-auto">
          <span className="inline-block" style={{ color: '#4DA6FF' }}>S</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#FFD84D' }}>E</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>R</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>I</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#FFD84D' }}>A</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>L</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>B</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#FFD84D' }}>O</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>W</span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-block" style={{ color: '#4DA6FF' }}>L</span>
        </h1>
        <p className="text-muted-foreground mt-4">Browse shows using the search above</p>
      </div>
    </div>
  );
}
