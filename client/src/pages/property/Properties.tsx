import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Grid, List, X } from 'lucide-react';
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
  const { broker } = useBroker();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('type') || 'all');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState('all');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || 'all');

  const [baseProperties, setBaseProperties] = useState<Property[]>([]);

  const uniqueCities = [...new Set(baseProperties.map(p => p.city).filter(Boolean))].sort();

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setPropertyType(searchParams.get('type') || 'all');
    setSelectedCity(searchParams.get('city') || 'all');
  }, [searchParams]);

  useEffect(() => {
    async function fetchProperties() {
      setIsLoading(true);
      try {
        const filters: { status?: string; broker_id?: string } = { status: 'active' };
        if (broker?.id && broker.id !== 'demo-broker-id') filters.broker_id = broker.id;
        const apiData = await propertyService.getAll(filters);
        const dataToFilter = Array.isArray(apiData) ? apiData : [];

        setBaseProperties(dataToFilter);
        let filtered = [...dataToFilter];

        // Apply filters
        if (propertyType !== 'all') {
          filtered = filtered.filter(p => p.property_type === propertyType);
        }

        if (selectedCity !== 'all') {
          filtered = filtered.filter(p => p.city === selectedCity);
        }

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(query) ||
            p.location.toLowerCase().includes(query) ||
            (p.city && p.city.toLowerCase().includes(query))
          );
        }

        // Apply sorting
        if (sortBy === 'price-low') {
          filtered.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-high') {
          filtered.sort((a, b) => b.price - a.price);
        } else {
          // newest
          filtered.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
        }

        setProperties(filtered);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProperties();
  }, [broker, propertyType, sortBy, searchQuery, selectedCity]);

  const clearFilters = () => {
    setSearchQuery('');
    setPropertyType('all');
    setSortBy('newest');
    setPriceRange('all');
    setSelectedCity('all');
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || propertyType !== 'all' || priceRange !== 'all' || selectedCity !== 'all';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        {/* Header */}
        <div className="bg-primary py-16">
          <div className="container mx-auto px-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
              Browse Properties
            </h1>
            <p className="mt-2 text-primary-foreground/80">
              Find your perfect property from our curated selection
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="sticky top-16 lg:top-20 z-40 bg-background border-b border-border py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by location, city, or property name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Property Type */}
              <Select value={propertyType} onValueChange={(val) => {
                setPropertyType(val);
                setSearchParams(prev => {
                  const newParams = new URLSearchParams(prev);
                  if (val === 'all') newParams.delete('type');
                  else newParams.set('type', val);
                  return newParams;
                });
              }}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="rent">For Rent</SelectItem>
                  <SelectItem value="sale">For Sale</SelectItem>
                </SelectContent>
              </Select>

              {/* City Filter */}
              <Select value={selectedCity} onValueChange={(val) => {
                setSelectedCity(val);
                setSearchParams(prev => {
                  const newParams = new URLSearchParams(prev);
                  if (val === 'all') newParams.delete('city');
                  else newParams.set('city', val);
                  return newParams;
                });
              }}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {uniqueCities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 border border-input rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-full text-sm">
                    Search: {searchQuery}
                    <button onClick={() => setSearchQuery('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {propertyType !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-full text-sm">
                    {propertyType === 'rent' ? 'For Rent' : 'For Sale'}
                    <button onClick={() => setPropertyType('all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              Showing <span className="font-medium text-foreground">{properties.length}</span> properties
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
          ) : properties.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                No properties found
              </h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search or filter criteria
              </p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {properties.map((property) => (
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