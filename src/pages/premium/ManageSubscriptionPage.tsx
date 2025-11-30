import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Calendar, CreditCard, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

export default function ManageSubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mock subscription data (will be replaced with real data when Stripe is integrated)
  const subscription = {
    tier: 'Free',
    status: 'active',
    billingCycle: null,
    nextBillingDate: null,
    amount: 0,
  };

  return (
    <div className="container mx-auto p-4 pb-24 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate('/premium')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Premium
      </Button>

      <div className="flex items-center gap-2 mb-6">
        <Crown className="h-6 w-6 text-yellow-500" />
        <h1 className="text-3xl font-bold">Manage Subscription</h1>
      </div>

      {/* Current Plan */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Current Plan</h2>
          </div>
          <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
            {subscription.status}
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-semibold">{subscription.tier}</span>
          </div>
          
          {subscription.billingCycle && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Billing Cycle</span>
              <span className="font-semibold capitalize">{subscription.billingCycle}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold">
              ${subscription.amount.toFixed(2)}{subscription.billingCycle ? '/mo' : ''}
            </span>
          </div>
          
          {subscription.nextBillingDate && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Next Billing Date</span>
              <span className="font-semibold">{subscription.nextBillingDate}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1"
            onClick={() => navigate('/premium')}
            disabled={subscription.tier !== 'Free'}
          >
            Upgrade Plan
          </Button>
          {subscription.tier !== 'Free' && (
            <Button variant="outline" className="flex-1" disabled>
              Cancel Subscription
            </Button>
          )}
        </div>
      </Card>

      {/* Payment Method */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Payment Method</h2>
        </div>
        
        {subscription.tier === 'Free' ? (
          <p className="text-sm text-muted-foreground">
            No payment method required for free plan
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-semibold">•••• •••• •••• 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/25</p>
              </div>
              <Badge variant="outline">Default</Badge>
            </div>
            <Button variant="outline" className="w-full" disabled>
              Update Payment Method
            </Button>
          </div>
        )}
      </Card>

      {/* Billing History */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Billing History</h2>
        </div>
        
        {subscription.tier === 'Free' ? (
          <p className="text-sm text-muted-foreground">
            No billing history for free plan
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-semibold">January 2024</p>
                <p className="text-sm text-muted-foreground">Paid on Jan 1, 2024</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">$4.99</p>
                <Button variant="ghost" size="sm" disabled>
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Beta Notice */}
      <Card className="p-6 mt-6 bg-muted/50 border-dashed">
        <div className="text-center">
          <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Beta Access</h3>
          <p className="text-sm text-muted-foreground">
            You're currently using the free beta version. All premium features are unlocked during beta.
            <br />
            Premium subscriptions will be available soon!
          </p>
        </div>
      </Card>
    </div>
  );
}
