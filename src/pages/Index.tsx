import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Tv, Users, MessageCircle, Star } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    navigate('/home');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl md:text-7xl font-bold neon-glow animate-fade-in">
            TV Social
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Rate, discuss, and connect with fellow TV enthusiasts. Your ultimate social network for television.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => navigate('/auth')} size="lg" className="btn-glow">
              Get Started
            </Button>
            <Button onClick={() => navigate('/search')} size="lg" variant="outline">
              Browse Shows
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <Card className="p-6 text-center space-y-4 hover-scale animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto">
              <Tv className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-lg">Rate & Review</h3>
            <p className="text-sm text-muted-foreground">
              Share your thoughts on your favorite shows, seasons, and episodes
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 hover-scale animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-lg">Connect</h3>
            <p className="text-sm text-muted-foreground">
              Follow friends and discover users with similar taste
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 hover-scale animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-lg">Discuss</h3>
            <p className="text-sm text-muted-foreground">
              Join conversations and share your TV hot takes
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 hover-scale animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto">
              <Star className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-lg">Discover</h3>
            <p className="text-sm text-muted-foreground">
              Find your next binge-worthy show based on community ratings
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
