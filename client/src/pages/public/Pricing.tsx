import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Check,
  ArrowRight,
  Building2,
  Image as ImageIcon,
  Users,
  Headphones,
  Star,
  Zap
} from 'lucide-react';

const pricingPlans = [
  {
    name: 'Starter Package',
    price: '0',
    description: 'Great for getting started and exploring the platform',
    features: [
      'Custom subdomain',
      'Up to 5 property listings',
      'Mobile responsive website',
    ],
    highlighted: false,
    icon: Globe,
    colors: {
      border: 'border-border hover:border-blue-300 border-t-4 border-t-blue-500',
      icon: 'bg-blue-100 text-blue-600',
      button: 'hover:bg-blue-600 hover:text-white hover:border-blue-600',
    }
  },
  {
    name: 'Plus Package',
    price: '1,000',
    description: 'Perfect for individual brokers starting out',
    features: [
      'Custom subdomain',
      'Up to 10 property listings',
      'Mobile responsive website',
      'Instant platform setup',
    ],
    highlighted: false,
    icon: Building2,
    colors: {
      border: 'border-border hover:border-emerald-300 border-t-4 border-t-emerald-500',
      icon: 'bg-emerald-100 text-emerald-600',
      button: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
    }
  },
  {
    name: 'Pro Package',
    price: '2,000',
    description: 'Best for growing real estate businesses',
    features: [
      'Everything in Plus',
      'Up to 50 property listings',
      'Full branding customization',
      'Featured property highlights',
      'Analytics dashboard',
      'Priority email support',
    ],
    highlighted: true,
    icon: Star,
    colors: {
      border: 'border-accent shadow-gold border-t-4 border-t-accent',
      icon: 'bg-accent text-accent-foreground',
      badge: 'bg-accent text-accent-foreground',
      button: 'hover:opacity-90 transition-opacity',
    }
  },
  {
    name: 'Ultra Package',
    price: '4,000',
    description: 'For agencies and top-tier brokers',
    features: [
      'Everything in Pro',
      'Unlimited property listings',
      'Advanced lead management',
      'Custom domain support',
      '24/7 priority support',
    ],
    highlighted: false,
    icon: Zap,
    colors: {
      border: 'border-border hover:border-purple-300 border-t-4 border-t-purple-500',
      icon: 'bg-purple-100 text-purple-600',
      button: 'hover:bg-purple-600 hover:text-white hover:border-purple-600',
    }
  },
];

import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Footer } from '@/components/layout/Footer';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary via-primary to-primary/90">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Simple, Transparent <span className="text-accent">Pricing</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Choose the plan that fits your business. All plans include a 14-day free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 -mt-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={plan.name}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-card-hover animate-fade-in opacity-0 ${plan.colors.border} ${plan.highlighted
                  ? 'scale-105 z-10'
                  : 'hover:-translate-y-1'
                  }`}
                style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'forwards' }}
              >
                {plan.highlighted && (
                  <div className={`absolute top-0 left-0 right-0 text-center py-1.5 text-sm font-semibold ${plan.colors.badge}`}>
                    Most Popular
                  </div>
                )}
                <CardHeader className={plan.highlighted ? 'pt-10' : ''}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.colors.icon}`}>
                    <plan.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">EGP/month</span>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.colors.icon}`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    className={`w-full transition-colors duration-300 ${plan.colors.button}`}
                    variant={plan.highlighted ? 'hero' : 'outline'}
                    size="lg"
                  >
                    <Link to="/register" className="gap-2">
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Have questions? We've got answers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-display font-semibold text-foreground mb-2">
                Can I upgrade my plan later?
              </h3>
              <p className="text-sm text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-display font-semibold text-foreground mb-2">
                Is there a free trial?
              </h3>
              <p className="text-sm text-muted-foreground">
                All plans include a 14-day free trial. No credit card required to start.
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-display font-semibold text-foreground mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards, bank transfers, and mobile payment options.
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-display font-semibold text-foreground mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription at any time with no hidden fees or penalties.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
