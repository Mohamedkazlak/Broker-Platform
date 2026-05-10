import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Grid, List, X } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PropertyCard, Property } from '@/components/properties/PropertyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBroker } from '@/contexts/BrokerContext';
import { propertyService } from '@/services/propertyService';

export default function Properties() {
  const { broker, isLoading: brokerLoading } = useBroker();
  const { t } = useTranslation('property');
  const { t: tCommon } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('type') || 'all');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState('all');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || 'all');

  const [baseProperties, setBaseProperties] = useState<Property[]>([]);

  const uniqueCities = useMemo(
    () => [...new Set(baseProperties.map((p) => p.city).filter(Boolean))].sort(),
    [baseProperties],
  );

  const filteredProperties = useMemo(() => {
    let filtered = [...baseProperties];

    if (propertyType !== 'all') {
      filtered = filtered.filter((p) => p.property_type === propertyType);
    }

    if (selectedCity !== 'all') {
      filtered = filtered.filter((p) => p.city === selectedCity);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.location.toLowerCase().includes(query) ||
          (p.city && p.city.toLowerCase().includes(query)),
      );
    }

    if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      filtered.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
    }

    return filtered;
  }, [baseProperties, propertyType, selectedCity, searchQuery, sortBy]);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setPropertyType(searchParams.get('type') || 'all');
    setSelectedCity(searchParams.get('city') || 'all');
  }, [searchParams]);

  /** One network fetch per tenant — filters/sort/search applied in memory after load. */
  useEffect(() => {
    if (brokerLoading) return;

    async function fetchProperties() {
      setIsLoading(true);
      try {
        const filters: { status?: string; broker_id?: string } = { status: 'active' };
        if (broker?.id && broker.id !== 'demo-broker-id') filters.broker_id = broker.id;
        const apiData = await propertyService.getAll(filters);
        setBaseProperties(Array.isArray(apiData) ? apiData : []);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProperties();
  }, [brokerLoading, broker?.id]);

  const clearFilters = () => {
    setSearchQuery('');
    setPropertyType('all');
    setSortBy('newest');
    setPriceRange('all');
    setSelectedCity('all');
    setSearchParams({});
  };

  const hasActiveFilters =
    searchQuery || propertyType !== 'all' || priceRange !== 'all' || selectedCity !== 'all';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        {/* Header */}
        <div className="bg-primary py-16">
          <div className="container mx-auto px-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
              {t('browse.heading')}
            </h1>
            <p className="mt-2 text-primary-foreground/80">{t('browse.subheading')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="sticky top-16 lg:top-20 z-40 bg-background border-b border-border py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('browse.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-10"
                />
              </div>

              {/* Property Type */}
              <Select
                value={propertyType}
                onValueChange={(val) => {
                  setPropertyType(val);
                  setSearchParams((prev) => {
                    const newParams = new URLSearchParams(prev);
                    if (val === 'all') newParams.delete('type');
                    else newParams.set('type', val);
                    return newParams;
                  });
                }}
              >
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder={t('browse.typePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('browse.allTypes')}</SelectItem>
                  <SelectItem value="rent">{t('listing.forRent')}</SelectItem>
                  <SelectItem value="sale">{t('listing.forSale')}</SelectItem>
                </SelectContent>
              </Select>

              {/* City Filter */}
              <Select
                value={selectedCity}
                onValueChange={(val) => {
                  setSelectedCity(val);
                  setSearchParams((prev) => {
                    const newParams = new URLSearchParams(prev);
                    if (val === 'all') newParams.delete('city');
                    else newParams.set('city', val);
                    return newParams;
                  });
                }}
              >
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder={t('browse.cityPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('browse.allCities')}</SelectItem>
                  {uniqueCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder={t('browse.sortPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('browse.sortNewest')}</SelectItem>
                  <SelectItem value="price-low">{t('browse.sortPriceLow')}</SelectItem>
                  <SelectItem value="price-high">{t('browse.sortPriceHigh')}</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 border border-input rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label={t('browse.ariaGridView')}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label={t('browse.ariaListView')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="text-sm text-muted-foreground">{t('browse.activeFilters')}</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-full text-sm">
                    {t('browse.searchChipPrefix')} {searchQuery}
                    <button onClick={() => setSearchQuery('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {propertyType !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-full text-sm">
                    {propertyType === 'rent' ? t('listing.forRent') : t('listing.forSale')}
                    <button onClick={() => setPropertyType('all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button onClick={clearFilters} className="text-sm text-primary hover:underline">
                  {tCommon('actions.clearAll')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              <Trans
                i18nKey="browse.showingCount"
                t={t}
                values={{ count: filteredProperties.length }}
                components={{ strong: <span className="font-medium text-foreground" /> }}
              />
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-2xl h-56 mb-4" />
                  <div className="bg-muted rounded h-6 w-3/4 mb-2" />
                  <div className="bg-muted rounded h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {t('browse.noResultsTitle')}
              </h3>
              <p className="text-muted-foreground mb-6">{t('browse.noResultsSubtitle')}</p>
              <Button onClick={clearFilters}>{tCommon('actions.clearFilters')}</Button>
            </div>
          ) : (
            <div
              className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
            >
              {filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
