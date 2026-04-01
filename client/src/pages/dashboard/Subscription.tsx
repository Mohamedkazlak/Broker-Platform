import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildSubdomainRedirect } from '@/lib/sessionRelay';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Check, Star, Zap, Building2, Globe, Loader2 } from 'lucide-react';

const pricingPlans = [
    {
        id: 'free',
        name: 'Starter Package',
        price: '0',
        propertiesLimit: 5,
        description: 'Great for getting started and exploring the platform',
        features: ['Standard subdomain', 'Up to 5 property listings', 'Standard responsive website', 'Community support'],
        icon: Globe,
        highlighted: false,
        colors: {
            border: 'border-border hover:border-blue-300 border-t-4 border-t-blue-500',
            icon: 'bg-blue-100 text-blue-600',
            button: 'hover:bg-blue-600 hover:text-white hover:border-blue-600',
        }
    },
    {
        id: 'plus',
        name: 'Plus Package',
        price: '1,000',
        propertiesLimit: 10,
        description: 'Perfect for individual brokers starting out',
        features: ['Custom subdomain', 'Up to 10 property listings', 'Basic branding', 'Email support'],
        icon: Building2,
        highlighted: false,
        colors: {
            border: 'border-border hover:border-emerald-300 border-t-4 border-t-emerald-500',
            icon: 'bg-emerald-100 text-emerald-600',
            button: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
        }
    },
    {
        id: 'pro',
        name: 'Pro Package',
        price: '2,000',
        propertiesLimit: 50,
        description: 'Best for growing real estate businesses',
        features: ['Everything in Plus', 'Up to 50 property listings', 'Full customization', 'Analytics dashboard'],
        icon: Star,
        highlighted: true,
        colors: {
            border: 'border-accent shadow-gold border-t-4 border-t-accent',
            icon: 'bg-accent text-accent-foreground',
            badge: 'bg-accent text-accent-foreground',
            button: 'hover:opacity-90 transition-opacity',
        }
    },
    {
        id: 'ultra',
        name: 'Ultra Package',
        price: '4,000',
        propertiesLimit: Infinity,
        description: 'For agencies and top-tier brokers',
        features: ['Everything in Pro', 'Unlimited property listings', 'Custom domain', 'Dedicated manager'],
        icon: Zap,
        highlighted: false,
        colors: {
            border: 'border-border hover:border-purple-300 border-t-4 border-t-purple-500',
            icon: 'bg-purple-100 text-purple-600',
            button: 'hover:bg-purple-600 hover:text-white hover:border-purple-600',
        }
    },
];

export default function Subscription() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleSelectPlan = async (planId: string) => {
        if (!profile?.broker_id) {
            toast({
                title: 'Error',
                description: 'No associated platform found. Please register again.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(planId);
        try {
            const { error } = await supabase
                .from('brokers')
                .update({ package: planId as Database["public"]["Enums"]["subscription_plan_enum"] })
                .eq('id', profile.broker_id);

            if (error) throw error;

            toast({
                title: 'Plan Selected!',
                description: 'Your subscription plan has been successfully updated.',
            });

            // Get broker subdomain for redirect
            let brokerSubdomain = sessionStorage.getItem('broker_subdomain');
            if (!brokerSubdomain) {
                // Fallback: fetch from DB
                const { data: brokerData } = await supabase
                    .from('brokers')
                    .select('subdomain')
                    .eq('id', profile.broker_id)
                    .single();
                brokerSubdomain = brokerData?.subdomain || null;
            }

            // Clean up sessionStorage
            sessionStorage.removeItem('broker_subdomain');

            // Redirect to broker's subdomain dashboard with session tokens
            if (brokerSubdomain) {
                const redirectUrl = await buildSubdomainRedirect(brokerSubdomain, '/dashboard');
                window.location.href = redirectUrl;
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Error updating plan:', err);
            toast({
                title: 'Failed to update plan',
                description: 'Please try again later.',
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
                    <h1 className="font-display text-4xl font-bold mb-4">Select Your Subscription Plan</h1>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                        Choose the package that best fits your business needs to continue setup.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pricingPlans.map((plan) => (
                        <Card
                            key={plan.id}
                            className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${plan.colors.border}`}
                        >
                            {plan.highlighted && (
                                <div className={`absolute top-0 left-0 right-0 text-center py-1.5 text-xs font-bold ${plan.colors.badge || ''}`}>
                                    RECOMMENDED
                                </div>
                            )}
                            <CardHeader className={plan.highlighted ? 'pt-8' : ''}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.colors.icon}`}>
                                    <plan.icon className="w-6 h-6" />
                                </div>
                                <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
                                <CardDescription className="text-muted-foreground h-10">
                                    {plan.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-6">
                                    <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                                    <span className="text-muted-foreground ml-2">EGP/mo</span>
                                </div>
                                <ul className="space-y-3 min-h-[150px]">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
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
                                    onClick={() => handleSelectPlan(plan.id)}
                                    disabled={isLoading !== null}
                                    className={`w-full transition-colors duration-300 ${plan.colors.button}`}
                                    variant={plan.highlighted ? 'hero' : 'outline'}
                                >
                                    {isLoading === plan.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Select Plan'
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
