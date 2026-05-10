import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Globe,
  Check,
  ArrowRight,
  Building2,
  Star,
  Zap,
} from 'lucide-react';

import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Footer } from '@/components/layout/Footer';

type PlanKey = 'starter' | 'plus' | 'pro' | 'ultra';

interface PlanDef {
  key: PlanKey;
  price: string;
  highlighted: boolean;
  icon: typeof Globe;
  colors: {
    border: string;
    icon: string;
    badge?: string;
    button: string;
  };
}

const planDefs: PlanDef[] = [
  {
    key: 'starter',
    price: '0',
    highlighted: false,
    icon: Globe,
    colors: {
      border: 'border-border hover:border-blue-300 border-t-4 border-t-blue-500',
      icon: 'bg-blue-100 text-blue-600',
      button: 'hover:bg-blue-600 hover:text-white hover:border-blue-600',
    },
  },
  {
    key: 'plus',
    price: '1,000',
    highlighted: false,
    icon: Building2,
    colors: {
      border: 'border-border hover:border-emerald-300 border-t-4 border-t-emerald-500',
      icon: 'bg-emerald-100 text-emerald-600',
      button: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
    },
  },
  {
    key: 'pro',
    price: '2,000',
    highlighted: true,
    icon: Star,
    colors: {
      border: 'border-accent shadow-gold border-t-4 border-t-accent',
      icon: 'bg-accent text-accent-foreground',
      badge: 'bg-accent text-accent-foreground',
      button: 'hover:opacity-90 transition-opacity',
    },
  },
  {
    key: 'ultra',
    price: '4,000',
    highlighted: false,
    icon: Zap,
    colors: {
      border: 'border-border hover:border-purple-300 border-t-4 border-t-purple-500',
      icon: 'bg-purple-100 text-purple-600',
      button: 'hover:bg-purple-600 hover:text-white hover:border-purple-600',
    },
  },
];

export default function Pricing() {
  const { t, i18n } = useTranslation('pricing');
  const isRtl = i18n.dir() === 'rtl';

  const faqItems = ['q1', 'q2', 'q3', 'q4'] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary via-primary to-primary/90">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            {t('hero.headlinePart1')}{' '}
            <span className="text-accent">{t('hero.headlineHighlight')}</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t('hero.subheadline')}
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 -mt-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {planDefs.map((plan, index) => {
              const features = t(`plans.${plan.key}.features`, { returnObjects: true }) as string[];

              return (
                <Card
                  key={plan.key}
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-card-hover animate-fade-in opacity-0 ${plan.colors.border} ${plan.highlighted
                    ? 'scale-105 z-10'
                    : 'hover:-translate-y-1'
                    }`}
                  style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'forwards' }}
                >
                  {plan.highlighted && (
                    <div className={`absolute top-0 inset-x-0 text-center py-1.5 text-sm font-semibold ${plan.colors.badge}`}>
                      {t('mostPopular')}
                    </div>
                  )}
                  <CardHeader className={plan.highlighted ? 'pt-10' : ''}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.colors.icon}`}>
                      <plan.icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="font-display text-xl">{t(`plans.${plan.key}.name`)}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {t(`plans.${plan.key}.description`)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground ms-2">{t('currencyPerMonth')}</span>
                    </div>
                    <ul className="space-y-3">
                      {features.map((feature) => (
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
                        {t('getStarted')}
                        <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              {t('faq.heading')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t('faq.subheading')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {faqItems.map((item) => (
              <div key={item} className="bg-card rounded-xl p-6 border border-border">
                <h3 className="font-display font-semibold text-foreground mb-2">
                  {t(`faq.${item}Title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`faq.${item}Answer`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
