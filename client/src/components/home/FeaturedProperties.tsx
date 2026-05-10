import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PropertyCard, Property } from '@/components/properties/PropertyCard';
import { useBroker } from '@/contexts/BrokerContext';
import { useAuth } from '@/contexts/AuthContext';
import { propertyService } from '@/services/propertyService';

export function FeaturedProperties() {
  const { broker, isLoading: brokerLoading } = useBroker();
  const { profile } = useAuth();
  const { t, i18n } = useTranslation('home');
  const isRtl = i18n.dir() === 'rtl';
  const [properties, setProperties] = useState<Property[]>([]);

  const effectiveBrokerId = profile?.broker_id ?? (broker?.id !== 'demo-broker-id' ? broker?.id : null);

  useEffect(() => {
    if (brokerLoading) return;

    async function fetchProperties() {
      try {
        const filters: { status: string; limit: number; broker_id?: string } = {
          status: 'active',
          limit: 6,
        };
        if (effectiveBrokerId) filters.broker_id = effectiveBrokerId;

        const data = await propertyService.getAll(filters);
        setProperties(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching properties:', error);
        setProperties([]);
      }
    }

    fetchProperties();
  }, [brokerLoading, effectiveBrokerId]);

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="text-accent font-medium text-sm uppercase tracking-wider">
              {t('featured.eyebrow')}
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">
              {t('featured.heading')}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl">
              {t('featured.description')}
            </p>
          </div>
          <Button variant="outline" size="lg" asChild>
            <Link to="/properties" className="flex items-center gap-2">
              {t('featured.viewAll')}
              <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </Link>
          </Button>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {properties.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              featured={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
