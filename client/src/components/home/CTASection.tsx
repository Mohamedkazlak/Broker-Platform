import { ArrowRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useBroker } from '@/contexts/BrokerContext';

export function CTASection() {
  const { broker } = useBroker();
  const { t, i18n } = useTranslation('home');
  const isRtl = i18n.dir() === 'rtl';

  const trustBadges = [
    t('cta.trust.licensed'),
    t('cta.trust.experience'),
    t('cta.trust.clients'),
    t('cta.trust.support'),
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-hero" />

      {/* Decorative Elements */}
      <div className="absolute top-0 end-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 start-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-primary-foreground/90 text-sm font-medium mb-6">
            {t('cta.badge')}
          </span>

          <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground leading-tight">
            {t('cta.headlinePart1')}{' '}
            <span className="text-gradient-gold">{t('cta.headlineHighlight')}</span>
          </h2>

          <p className="mt-6 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t('cta.subheadline')}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="xl" asChild>
              <Link to="/properties" className="flex items-center gap-2">
                {t('cta.browseButton')}
                <ArrowRight className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <a href={`tel:${broker?.phone_number || '+1 (555) 123-4567'}`} className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                {t('cta.contactButton')}
              </a>
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="mt-16 pt-10 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-center gap-8 text-primary-foreground/60">
              {trustBadges.map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
