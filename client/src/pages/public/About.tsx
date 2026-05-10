import { CheckCircle, Users, Award, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Footer } from '@/components/layout/Footer';
import { useBroker } from '@/contexts/BrokerContext';

import { PublicNavbar } from '@/components/layout/PublicNavbar';

const valueDefs = [
  { key: 'trust', icon: Shield },
  { key: 'brokerFirst', icon: Users },
  { key: 'innovation', icon: Award },
  { key: 'seamless', icon: CheckCircle },
] as const;

const statKeys = ['activeBrokers', 'propertiesListed', 'platformUptime', 'dedicatedSupport'] as const;
const statValues: Record<(typeof statKeys)[number], string> = {
  activeBrokers: '500+',
  propertiesListed: '50k+',
  platformUptime: '99.9%',
  dedicatedSupport: '24/7',
};

export default function About() {
  const { broker } = useBroker();
  const { t } = useTranslation('about');
  const { t: tCommon } = useTranslation('common');

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative gradient-hero overflow-hidden pt-16">
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            {t('hero.headlinePrefix')}{' '}
            <span className="text-accent">{broker?.platform_name || tCommon('brand.name')}</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t('hero.subheadline')}
          </p>
        </div>
      </section>

      <main>
        {/* Story */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="text-accent font-medium text-sm uppercase tracking-wider">
                  {t('story.eyebrow')}
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-6">
                  {t('story.heading')}
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>{t('story.paragraph1')}</p>
                  <p>{t('story.paragraph2')}</p>
                  <p>{t('story.paragraph3')}</p>
                </div>
              </div>
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80"
                  alt={t('story.teamImageAlt')}
                  className="rounded-2xl shadow-xl"
                />
                <div className="absolute -bottom-8 -start-8 bg-card rounded-xl p-6 shadow-lg border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                      <Award className="w-8 h-8 text-accent" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-bold text-foreground">
                        {t('story.yearsBadgeValue')}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('story.yearsBadge')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 bg-secondary/50">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-accent font-medium text-sm uppercase tracking-wider">
                {t('values.eyebrow')}
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">
                {t('values.heading')}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {valueDefs.map((value) => (
                <div
                  key={value.key}
                  className="bg-card rounded-2xl p-8 text-center border border-border shadow-card"
                >
                  <div className="w-16 h-16 mx-auto rounded-xl gradient-hero flex items-center justify-center mb-6">
                    <value.icon className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                    {t(`values.items.${value.key}.title`)}
                  </h3>
                  <p className="text-muted-foreground">
                    {t(`values.items.${value.key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {statKeys.map((key) => (
                <div key={key} className="text-center">
                  <p className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">
                    {statValues[key]}
                  </p>
                  <p className="text-muted-foreground">{t(`stats.${key}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
