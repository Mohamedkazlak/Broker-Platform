import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Square, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface Property {
  id: string;
  title: string;
  description: string | null;
  property_type: 'rent' | 'sale';
  price: number;
  currency: string;
  location: string;
  city: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  furnished: boolean | 'furnished' | 'unfurnished' | 'semi-furnished';
  featured: boolean;
  status: string;
  image_url?: string;
  created_at: string;
  /** Optional: from add-property form */
  property_code?: string;
  contract_duration?: string | null;
  price_negotiable?: boolean;
  building_type?: 'apartment' | 'villa' | 'commercial' | string;
  apartment_level?: number | string | null;
  villa_levels?: number | string | null;
  finishing?: string | null;
  amenities?: string[];
}

interface PropertyCardProps {
  property: Property;
  featured?: boolean;
}

export function PropertyCard({ property, featured = false }: PropertyCardProps) {
  const isFurnished = (value: Property['furnished']) => {
    if (typeof value === 'boolean') return value;
    return value === 'furnished' || value === 'semi-furnished';
  };

  const formatPrice = (price: number, currency: string, type: 'rent' | 'sale') => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

    return type === 'rent' ? `${formatted}/mo` : formatted;
  };

  return (
    <Link
      to={`/properties/${property.id}`}
      className="property-card group block bg-card rounded-2xl overflow-hidden shadow-card border border-border/50"
    >
      {/* Image Container */}
      <div className="relative overflow-hidden h-56">
        <img
          src={property.image_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80'}
          alt={property.title}
          className="property-image w-full h-full object-cover"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge
            className={`${property.property_type === 'rent'
              ? 'bg-navy text-primary-foreground'
              : 'bg-accent text-accent-foreground'
              } font-medium uppercase text-xs`}
          >
            For {property.property_type}
          </Badge>
          {property.featured && (
            <Badge className="bg-accent text-accent-foreground font-medium">
              Featured
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            // Handle favorite
          }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors group/fav"
        >
          <Heart className="w-5 h-5 text-muted-foreground group-hover/fav:text-destructive transition-colors" />
        </button>

        {/* Price */}
        <div className="absolute bottom-4 left-4">
          <p className="text-2xl font-display font-bold text-white">
            {formatPrice(property.price, property.currency, property.property_type)}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title & Location */}
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
            <MapPin className="w-4 h-4 text-accent" />
            <span className="text-sm line-clamp-1">
              {property.location}
              {property.city && `, ${property.city}`}
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-muted-foreground">
          {property.bedrooms !== null && (
            <div className="flex items-center gap-1.5">
              <Bed className="w-4 h-4" />
              <span className="text-sm">{property.bedrooms} {property.building_type === 'commercial' ? 'Offices' : 'Beds'}</span>
            </div>
          )}
          {property.bathrooms !== null && (
            <div className="flex items-center gap-1.5">
              <Bath className="w-4 h-4" />
              <span className="text-sm">{property.bathrooms} Baths</span>
            </div>
          )}
          {property.area_sqft !== null && (
            <div className="flex items-center gap-1.5">
              <Square className="w-4 h-4" />
              <span className="text-sm">{property.area_sqft.toLocaleString()} m³</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {isFurnished(property.furnished) && (
            <span className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs rounded-full font-medium">
              Furnished
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
