import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { propertyService } from '@/services/propertyService';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Bed,
  Bath,
  Square,
  Building2,
  Paintbrush,
  Armchair,
  Heart,
  Share2,
  Phone,
  Mail,
  Check,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Property } from '@/components/properties/PropertyCard';
import { useBroker } from '@/contexts/BrokerContext';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80';

export default function PropertyDetails() {
  const { id } = useParams();
  const { broker } = useBroker();
  const [property, setProperty] = useState<(Property & { media?: { url: string, type: 'image' | 'video' }[] }) | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProperty() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await propertyService.getById(id);
        
        // Construct unified media array
        const media: { url: string, type: 'image' | 'video' }[] = [];
        
        // Add main image if valid
        if (data.image_url) {
          media.push({ url: data.image_url, type: 'image' });
        }
        
        const propertyDataResponse = data as Property & { image_urls?: string[], video_urls?: string[] };
        
        // Add extra images
        if (Array.isArray(propertyDataResponse.image_urls)) {
          propertyDataResponse.image_urls.forEach((url: string) => {
             if (url && url !== propertyDataResponse.image_url) { // Avoid duplicating the main image
                 media.push({ url, type: 'image' });
             }
          });
        }
        
        // Add videos
        if (Array.isArray(propertyDataResponse.video_urls)) {
          propertyDataResponse.video_urls.forEach((url: string) => {
             if (url) media.push({ url, type: 'video' });
          });
        }

        const propertyData = {
          ...data,
          media: media.length > 0 ? media : [{ url: DEFAULT_IMAGE, type: 'image' }],
        };
        setProperty(propertyData as Property & { media: { url: string, type: 'image' | 'video' }[] });
      } catch (error) {
        console.error('Error fetching property:', error);
        setProperty(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProperty();
  }, [id]);

  const mediaList = property?.media || [{ url: DEFAULT_IMAGE, type: 'image' }];

  const nextImage = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  const prevImage = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const formatPrice = (price: number, currency: string, type: 'rent' | 'sale') => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

    return type === 'rent' ? `${formatted}/month` : formatted;
  };

  const toTitleCase = (value: string) =>
    value
      .replace(/-/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const furnishedLabel = (value: Property['furnished']) => {
    if (typeof value === 'boolean') return value ? 'Furnished' : 'Unfurnished';
    if (!value) return 'Unfurnished';
    return toTitleCase(value);
  };

  const showFurnishedAsTag = (value: Property['furnished']) => {
    if (typeof value === 'boolean') return value;
    return value === 'furnished' || value === 'semi-furnished';
  };

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Property not found</h1>
          <p className="mt-2 text-muted-foreground">The property you're looking for doesn't exist.</p>
          <Button asChild className="mt-6">
            <Link to="/properties">Browse Properties</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        <div className="relative h-[50vh] md:h-[70vh] bg-black overflow-hidden flex items-center justify-center">
          {mediaList[currentMediaIndex].type === 'video' ? (
            <video
              key={mediaList[currentMediaIndex].url}
              src={mediaList[currentMediaIndex].url}
              className="w-full h-full object-contain"
              controls
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              key={mediaList[currentMediaIndex].url}
              src={mediaList[currentMediaIndex].url}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          )}

          {/* Navigation */}
          {mediaList.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                aria-label="Previous Media"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                aria-label="Next Media"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {mediaList.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMediaIndex(index)}
                    aria-label={`Go to media ${index + 1}`}
                    className={`w-3 h-3 rounded-full transition-all ${index === currentMediaIndex
                      ? 'bg-white scale-110'
                      : 'bg-white/50 hover:bg-white/70'
                      }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge
              className={`${property.property_type === 'rent'
                ? 'bg-navy text-primary-foreground'
                : 'bg-accent text-accent-foreground'
                } font-medium uppercase text-sm`}
            >
              For {property.property_type}
            </Badge>
            {property.featured && (
              <Badge className="bg-accent text-accent-foreground font-medium">
                Featured
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors">
              <Heart className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                      {property.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <MapPin className="w-5 h-5 text-accent" />
                      <span>
                        {property.location}
                        {property.city && `, ${property.city}`}
                        {property.country && `, ${property.country}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold text-primary">
                      {formatPrice(property.price, property.currency, property.property_type)}
                    </p>
                    {property.price_negotiable && (
                      <p className="text-sm text-accent font-medium">Price is negotiable</p>
                    )}
                    {property.property_type === 'rent' && (
                      <p className="text-sm text-muted-foreground">+ utilities</p>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap items-center gap-6 mt-6 py-4 border-t border-b border-border">
                  {property.bedrooms !== null && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Bed className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{property.bedrooms}</p>
                        <p className="text-xs text-muted-foreground">{property.building_type === 'commercial' ? 'Offices' : 'Bedrooms'}</p>
                      </div>
                    </div>
                  )}
                  {property.bathrooms !== null && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Bath className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{property.bathrooms}</p>
                        <p className="text-xs text-muted-foreground">Bathrooms</p>
                      </div>
                    </div>
                  )}
                  {property.area_sqft !== null && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Square className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{property.area_sqft.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">m³</p>
                      </div>
                    </div>
                  )}
                  {property.building_type === 'apartment' && property.apartment_level && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{property.apartment_level}</p>
                        <p className="text-xs text-muted-foreground">Apartment Level</p>
                      </div>
                    </div>
                  )}
                  {property.building_type === 'villa' && property.villa_levels && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{property.villa_levels}</p>
                        <p className="text-xs text-muted-foreground">Level{property.villa_levels === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                  )}
                  {property.finishing && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Paintbrush className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{toTitleCase(property.finishing)}</p>
                        <p className="text-xs text-muted-foreground">Type of Finishing</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Armchair className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{furnishedLabel(property.furnished)}</p>
                      <p className="text-xs text-muted-foreground">Type of Furnishing</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  About This Property
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {property.description}
                  </p>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Amenities & Features
                </h2>
                {(property.amenities?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                          <Check className="w-3 h-3 text-accent" />
                        </div>
                        <span className="text-sm text-foreground">{amenity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No amenities listed.</p>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {mediaList.length > 1 && (
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                    Gallery
                  </h2>
                  <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
                    {mediaList.map((media, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMediaIndex(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${index === currentMediaIndex
                          ? 'border-accent'
                          : 'border-transparent hover:border-border'
                          }`}
                      >
                         {media.type === 'video' ? (
                            <video
                              key={media.url}
                              src={media.url}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              playsInline
                            />
                         ) : (
                            <img
                              key={media.url}
                              src={media.url}
                              alt={`${property.title} media ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                         )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Contact Card */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                    Interested in this property?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Get in touch with our team to learn more.
                  </p>

                  <div className="space-y-3">
                    <Button
                      size="lg"
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-950 border-0 font-medium"
                      asChild
                    >
                      <a href={`tel:${broker?.phone_number || '+1 (555) 123-4567'}`}>
                        <Phone className="w-5 h-5" />
                        Call Agent
                      </a>
                    </Button>
                    <Button variant="outline" size="lg" className="w-full" asChild>
                      <a href={`mailto:${broker?.email || 'contact@myflat.com'}`}>
                        <Mail className="w-5 h-5" />
                        Email Inquiry
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="bg-secondary/50 rounded-2xl p-6">
                  <h4 className="font-medium text-foreground mb-4">Quick Facts</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Property Type</span>
                      <span className="font-medium text-foreground capitalize">
                        For {property.property_type}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium text-foreground capitalize">
                        {property.status}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Furnished</span>
                      <span className="font-medium text-foreground">
                        {furnishedLabel(property.furnished)}
                      </span>
                    </li>
                    {property.area_sqft && (
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Price/Sq Ft</span>
                        <span className="font-medium text-foreground">
                          {property.currency === 'USD' ? '$' : property.currency || 'EGP'} {Math.round(property.price / property.area_sqft).toLocaleString()}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
