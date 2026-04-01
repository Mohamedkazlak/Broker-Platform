import { Search, MapPin, Home, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBroker } from '@/contexts/BrokerContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const { broker } = useBroker();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState<'all' | 'rent' | 'sale'>('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (propertyType !== 'all') params.set('type', propertyType);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&auto=format&fit=crop&q=80"
          alt="Luxury home"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-hero opacity-90" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-32 text-center">
        {/* Badge */}
        <div className="hero-text inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-primary-foreground/90 text-sm font-medium">
            {broker?.platform_name || 'Broker'} Real Estate Website
          </span>
        </div>

        {/* Headline */}
        <h1 className="hero-text hero-text-delay-1 font-display text-4xl md:text-5xl lg:text-7xl font-bold text-primary-foreground leading-tight max-w-4xl mx-auto">
          Find Your{' '}
          <span className="text-gradient-gold">Perfect</span>
          <br />
          Place to Call Home
        </h1>

        {/* Subheadline */}
        <p className="hero-text hero-text-delay-2 mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
          Discover exceptional properties handpicked by our trusted brokers.
          Your dream home is just a search away.
        </p>

        {/* Search Box */}
        <form
          onSubmit={handleSearch}
          className="hero-text hero-text-delay-3 mt-12 max-w-4xl mx-auto"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-white/20">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Property Type Toggle */}
              <div className="flex bg-secondary rounded-xl p-1">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'rent', label: 'Rent' },
                  { value: 'sale', label: 'Buy' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPropertyType(option.value as typeof propertyType)}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${propertyType === option.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Location Input */}
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter location, city, or neighborhood..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 h-12 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                />
              </div>

              {/* Search Button */}
              <Button type="submit" variant="hero" size="xl" className="lg:w-auto w-full">
                <Search className="w-5 h-5" />
                Search
              </Button>
            </div>
          </div>
        </form>

        {/* Stats */}
        <div className="hero-text mt-16 flex flex-wrap justify-center gap-8 lg:gap-16" style={{ animationDelay: '0.8s', opacity: 0 }}>
          {[
            { icon: Home, value: '2000+', label: 'Properties' },
            { icon: MapPin, value: '20+', label: 'Cities' },
            { icon: DollarSign, value: '$100M+', label: 'Sales Volume' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <stat.icon className="w-5 h-5 text-accent" />
                <span className="text-3xl font-display font-bold text-primary-foreground">
                  {stat.value}
                </span>
              </div>
              <span className="text-sm text-primary-foreground/70">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-primary-foreground/60 text-xs uppercase tracking-wider">Scroll</span>
        <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center pt-2">
          <div className="w-1.5 h-3 rounded-full bg-accent" />
        </div>
      </div>
    </section>
  );
}
