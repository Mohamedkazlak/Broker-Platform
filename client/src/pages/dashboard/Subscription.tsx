import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildSubdomainRedirect } from '@/lib/sessionRelay';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Check, Star, Zap, Building2, Globe, Loader2 } from 'lucide-react';

const planIcons: Record<string, typeof Globe> = {
  free: Globe,
  plus: Building2,
  pro: Star,
  ultra: Zap,
};

const planColors: Record<string, { border: string; icon: string; badge?: string; button: string }> = {
  free: {
    border: 'border-border hover:border-blue-300 border-t-4 border-t-blue-500',
    icon: 'bg-blue-100 text-blue-600',
    button: 'hover:bg-blue-600 hover:text-white hover:border-blue-600',
  },
  plus: {
    border: 'border-border hover:border-emerald-300 border-t-4 border-t-emerald-500',
    icon: 'bg-emerald-100 text-emerald-600',
    button: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
  },
  pro: {
    border: 'border-accent shadow-gold border-t-4 border-t-accent',
    icon: 'bg-accent text-accent-foreground',
    badge: 'bg-accent text-accent-foreground',
    button: 'hover:opacity-90 transition-opacity',
  },
  ultra: {
    border: 'border-border hover:border-purple-300 border-t-4 border-t-purple-500',
    icon: 'bg-purple-100 text-purple-600',
    button: 'hover:bg-purple-600 hover:text-white hover:border-purple-600',
  },
};

export default function Subscription() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('dashboard');
  const { t: tPricing } = useTranslation('pricing');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const planIds = ['free', 'plus', 'pro', 'ultra'] as const;

  const plans = planIds.map((id) => {
    const featuresVal = tPricing(`plans.${id}.features`, { returnObjects: true }) as string[];
    return {
      id,
      name: tPricing(`plans.${id}.name`),
      price: tPricing(`plans.${id}.price`),
      description: tPricing(`plans.${id}.description`),
      features: Array.isArray(featuresVal) ? featuresVal : [],
      icon: planIcons[id],
      highlighted: id === 'pro',
      colors: planColors[id],
    };
  });

  const handleSelectPlan = async (planId: string) => {
    if (!profile?.broker_id) {
      toast({
        title: t('subscription.toasts.errorTitle'),
        description: t('subscription.toasts.noPlatform'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(planId);
    try {
      const { error } = await supabase
        .from('brokers')
        .update({
          package: planId as Database['public']['Enums']['subscription_plan_enum'],
        })
        .eq('id', profile.broker_id);

      if (error) throw error;

      toast({
        title: t('subscription.toasts.selectedTitle'),
        description: t('subscription.toasts.selectedDescription'),
      });

      let brokerSubdomain = sessionStorage.getItem('broker_subdomain');
      if (!brokerSubdomain) {
        const { data: brokerData } = await supabase
          .from('brokers')
          .select('subdomain')
          .eq('id', profile.broker_id)
          .single();
        brokerSubdomain = brokerData?.subdomain || null;
      }

      sessionStorage.removeItem('broker_subdomain');

      if (brokerSubdomain) {
        const redirectUrl = await buildSubdomainRedirect(brokerSubdomain, '/dashboard');
        window.location.href = redirectUrl;
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error updating plan:', err);
      toast({
        title: t('subscription.toasts.updateFailedTitle'),
        description: t('subscription.toasts.updateFailedDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold mb-4">
            {t('subscription.heading')}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t('subscription.subheading')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${plan.colors.border}`}
            >
              {plan.highlighted && (
                <div
                  className={`absolute inset-x-0 top-0 text-center py-1.5 text-xs font-bold ${
                    plan.colors.badge || ''
                  }`}
                >
                  {t('subscription.recommended')}
                </div>
              )}
              <CardHeader className={plan.highlighted ? 'pt-8' : ''}>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.colors.icon}`}
                >
                  <plan.icon className="w-6 h-6" />
                </div>
                <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-muted-foreground h-10">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground ms-2">
                    {tPricing('pricePerMonth')}
                  </span>
                </div>
                <ul className="space-y-3 min-h-[150px]">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.colors.icon}`}
                      >
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isLoading !== null}
                  className={`w-full transition-colors duration-300 ${plan.colors.button}`}
                  variant={plan.highlighted ? 'hero' : 'outline'}
                >
                  {isLoading === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('subscription.selectPlan')
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
