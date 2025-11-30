import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PremiumPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Free',
      price: { monthly: 0, yearly: 0 },
      icon: null,
      features: [
        'Track unlimited shows & episodes',
        'Create public lists',
        'Social features & activity feed',
        'Basic statistics',
        'Community collections',
      ],
      buttonText: 'Current Plan',
      buttonVariant: 'outline' as const,
      popular: false,
    },
    {
      name: 'Plus',
      price: { monthly: 4.99, yearly: 47.99 },
      icon: Sparkles,
      features: [
        'Everything in Free',
        'Premium themes & customization',
        'Advanced statistics & analytics',
        'Priority support',
        'Ad-free experience',
        'Custom profile badges',
      ],
      buttonText: 'Coming Soon',
      buttonVariant: 'default' as const,
      popular: true,
    },
    {
      name: 'Pro',
      price: { monthly: 9.99, yearly: 95.99 },
      icon: Zap,
      features: [
        'Everything in Plus',
        'Host unlimited watch parties',
        'Unlimited AI recommendations',
        'Early access to new features',
        'Export your data anytime',
        'Premium API access',
      ],
      buttonText: 'Coming Soon',
      buttonVariant: 'default' as const,
      popular: false,
    },
  ];

  return (
    <div className="container mx-auto p-4 pb-24 max-w-6xl">
      <Button variant="ghost" onClick={() => navigate('/profile')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>

      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Crown className="h-8 w-8 text-yellow-500" />
          <h1 className="text-4xl font-bold">Premium Plans</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Unlock powerful features to enhance your TV tracking experience
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Button
          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
          onClick={() => setBillingCycle('monthly')}
          size="sm"
        >
          Monthly
        </Button>
        <Button
          variant={billingCycle === 'yearly' ? 'default' : 'outline'}
          onClick={() => setBillingCycle('yearly')}
          size="sm"
        >
          Yearly
          <span className="ml-2 text-xs bg-primary/20 px-2 py-0.5 rounded">Save 20%</span>
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const price = plan.price[billingCycle];
          
          return (
            <Card
              key={plan.name}
              className={`p-6 space-y-6 relative ${
                plan.popular ? 'border-primary border-2' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </div>
              )}
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {Icon && <Icon className="h-5 w-5 text-primary" />}
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${price}</span>
                  <span className="text-muted-foreground">
                    /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.buttonVariant}
                disabled={plan.name === 'Free' || plan.buttonText === 'Coming Soon'}
              >
                {plan.buttonText}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Beta Notice */}
      <Card className="p-6 text-center bg-muted/50">
        <h3 className="font-semibold mb-2">Currently in Beta</h3>
        <p className="text-sm text-muted-foreground mb-4">
          All features are currently free while we're in beta. Premium plans will be available soon!
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/manage-subscription')}
        >
          Manage Subscription
        </Button>
      </Card>

      {/* FAQ Section */}
      <div className="mt-12 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel your subscription at any time with no penalties.
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
            <p className="text-sm text-muted-foreground">
              We accept all major credit cards and payment methods through Stripe.
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold mb-2">Is there a free trial?</h4>
            <p className="text-sm text-muted-foreground">
              While in beta, all features are free. Once we launch, we'll offer a 14-day free trial for premium plans.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
