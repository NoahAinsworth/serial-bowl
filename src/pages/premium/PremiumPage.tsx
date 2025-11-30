import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PremiumPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/profile')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>

      <div className="flex items-center gap-2">
        <Crown className="h-6 w-6 text-yellow-500" />
        <h1 className="text-3xl font-bold">Premium Plans</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <Card className="p-6 space-y-4">
          <h3 className="text-xl font-bold">Free</h3>
          <p className="text-2xl font-bold">$0</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ Basic features</li>
            <li>✓ Track shows & episodes</li>
            <li>✓ Public lists</li>
            <li>✓ Social features</li>
          </ul>
        </Card>

        <Card className="p-6 space-y-4 border-primary">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">Plus</h3>
          </div>
          <p className="text-2xl font-bold">Coming Soon</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ Everything in Free</li>
            <li>✓ Premium themes</li>
            <li>✓ Advanced stats</li>
            <li>✓ Priority support</li>
          </ul>
        </Card>

        <Card className="p-6 space-y-4 border-yellow-500">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h3 className="text-xl font-bold">Pro</h3>
          </div>
          <p className="text-2xl font-bold">Coming Soon</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ Everything in Plus</li>
            <li>✓ Watch parties</li>
            <li>✓ Unlimited AI features</li>
            <li>✓ Early access</li>
          </ul>
        </Card>
      </div>

      <div className="text-center py-10 text-muted-foreground">
        <p>Premium features are in development</p>
        <p className="text-sm mt-2">All features are currently free while in beta</p>
      </div>
    </div>
  );
}
