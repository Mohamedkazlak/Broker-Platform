import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Building2,
  LayoutDashboard,
  Users,
  Zap,
  Smartphone,
  Search,
  ArrowRight,
  Sparkles
} from 'lucide-react';

import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Footer } from '@/components/layout/Footer';

const featureDefs = [
  { key: 'subdomain', icon: Building2, color: 'bg-blue-100 text-blue-600' },
  { key: 'propertyManagement', icon: LayoutDashboard, color: 'bg-green-100 text-green-600' },
  { key: 'leadManagement', icon: Users, color: 'bg-purple-100 text-purple-600' },
  { key: 'instantSetup', icon: Zap, color: 'bg-amber-100 text-amber-600' },
  { key: 'mobileResponsive', icon: Smartphone, color: 'bg-rose-100 text-rose-600' },
  { key: 'seoOptimized', icon: Search, color: 'bg-teal-100 text-teal-600' },
] as const;

export default function Platform() {
  const { t, i18n } = useTranslation('platform');
  const isRtl = i18n.dir() === 'rtl';
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as { scrollTo?: string } | null;
    if (!state?.scrollTo) return;
    const targetId = state.scrollTo;
    const scroll = () => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
    };
    const frame = requestAnimationFrame(scroll);
    navigate(location.pathname, { replace: true, state: null });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Blue Gradient Background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80"
            alt=""
            className="w-full h-full object-cover opacity-40 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/95 via-primary/90 to-primary/80 mix-blend-multiply" />
        </div>

        {/* Wave decoration at bottom */}
        <div className="absolute bottom-0 inset-x-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 mb-8">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-primary-foreground text-sm font-medium">
              {t('hero.badge')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight max-w-4xl mx-auto">
            {t('hero.headlinePart1')}
            <br />
            <span className="text-accent">{t('hero.headlineHighlight')}</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            {t('hero.subheadline')}
          </p>

          {/* CTA Button */}
          <div className="mt-10">
            <Button
              asChild
              size="xl"
              variant="hero"
            >
              <Link to="/register" className="gap-2">
                {t('hero.ctaButton')}
                <ArrowRight className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {t('features.heading')}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('features.subheading')}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {featureDefs.map((feature) => (
              <div
                key={feature.key}
                className="bg-card rounded-2xl p-6 border border-border hover:shadow-card-hover transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {t(`features.items.${feature.key}.title`)}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(`features.items.${feature.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('finalCta.heading')}
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            {t('finalCta.subheading')}
          </p>
          <Button asChild size="xl" variant="hero">
            <Link to="/register" className="gap-2">
              {t('finalCta.button')}
              <ArrowRight className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
