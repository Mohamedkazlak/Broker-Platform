import { Home, Key, TrendingUp, Shield, Users, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const serviceDefs = [
  { key: 'sales', icon: Home },
  { key: 'rentals', icon: Key },
  { key: 'market', icon: TrendingUp },
  { key: 'secure', icon: Shield },
  { key: 'agents', icon: Users },
  { key: 'premium', icon: Award },
] as const;

export function ServicesSection() {
  const { t } = useTranslation('home');

  return (
    <section className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-accent font-medium text-sm uppercase tracking-wider">
            {t('services.eyebrow')}
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">
            {t('services.heading')}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t('services.description')}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceDefs.map((service, index) => (
            <div
              key={service.key}
              className="group p-8 bg-card rounded-2xl border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl gradient-hero flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {t(`services.items.${service.key}.title`)}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t(`services.items.${service.key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
