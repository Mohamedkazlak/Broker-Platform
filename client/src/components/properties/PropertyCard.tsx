import { Link } from "react-router-dom";
import { MapPin, Bed, Bath, Square, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { PropertyWhatsAppButton } from "@/components/properties/PropertyWhatsAppButton";
import { PropertyImage } from "@/components/properties/PropertyImage";
import { usePropertyDisplayText } from "@/hooks/usePropertyDisplayText";
import { translatedFurnished } from "@/utils/propertyLabels";

export interface Property {
  id: string;
  title: string;
  description: string | null;
  property_type: "rent" | "sale";
  price: number;
  currency: string;
  location: string;
  city: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  furnished: boolean | "furnished" | "unfurnished" | "semi-furnished";
  featured: boolean;
  status: string;
  /** Cover photo (first gallery image). */
  image_url?: string | null;
  /** Ordered gallery; index 0 is the cover. */
  image_urls?: string[] | null;
  video_urls?: string[] | null;
  created_at: string;
  /** Optional: from add-property form */
  property_code?: string;
  contract_duration?: string | null;
  price_negotiable?: boolean;
  building_type?: "apartment" | "villa" | "commercial" | string;
  apartment_level?: number | string | null;
  villa_levels?: number | string | null;
  finishing?: string | null;
  amenities?: string[];
}

const LISTING_FALLBACK =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80";

interface PropertyCardProps {
  property: Property;
  featured?: boolean;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const { t, i18n } = useTranslation(["property", "governorates"]);
  const tGov = i18n.getFixedT(i18n.language, "governorates");
  const localeNum = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
  const badgeCase = i18n.language?.startsWith("ar")
    ? "normal-case tracking-normal"
    : "uppercase tracking-wide";

  const furnishingChipLabel = (): string | null => {
    const f = property.furnished;
    if (typeof f === "boolean") return f ? translatedFurnished(t, f) : null;
    if (!f || f === "unfurnished") return null;
    return translatedFurnished(t, f);
  };

  const furnishingChip = furnishingChipLabel();

  const displayText = usePropertyDisplayText(property, i18n.language, {
    includeDescription: false,
  });

  const formatPrice = (
    price: number,
    currency: string,
    type: "rent" | "sale",
  ) => {
    const formatted = new Intl.NumberFormat(
      i18n.language === "ar" ? "ar-EG" : "en-US",
      {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    ).format(price);

    return type === "rent"
      ? `${formatted}${t("listing.priceSuffixMonthShort")}`
      : formatted;
  };

  return (
    <Link
      to={`/properties/${property.id}`}
      className="property-card group block bg-card rounded-2xl overflow-hidden shadow-card border border-border/50"
    >
      {/* Image Container — cover photo (first gallery image) */}
      <div className="relative overflow-hidden h-56">
        <PropertyImage
          src={property.image_url || property.image_urls?.[0]}
          alt={displayText.title}
          className="property-image w-full h-full object-cover"
          unavailableClassName="property-image w-full h-full"
          emptyFallbackSrc={LISTING_FALLBACK}
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-4 start-4 flex gap-2">
          <Badge
            className={`${
              property.property_type === "rent"
                ? "bg-navy text-primary-foreground"
                : "bg-accent text-accent-foreground"
            } font-medium text-xs ${badgeCase}`}
          >
            {property.property_type === "rent"
              ? t("listing.forRent")
              : t("listing.forSale")}
          </Badge>
          {property.featured && (
            <Badge
              className={`bg-accent text-accent-foreground font-medium text-xs ${i18n.language?.startsWith("ar") ? "normal-case tracking-normal" : ""}`}
            >
              {t("listing.featured")}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-4 end-4 flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
            }}
            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors group/fav"
            aria-label={t("listing.ariaFavorite")}
          >
            <Heart className="w-5 h-5 text-muted-foreground group-hover/fav:text-destructive transition-colors" />
          </button>
          <PropertyWhatsAppButton propertyId={property.id} variant="icon" />
        </div>

        {/* Price */}
        <div className="absolute bottom-4 start-4">
          <p className="text-2xl font-display font-bold text-white">
            {formatPrice(
              property.price,
              property.currency,
              property.property_type,
            )}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title & Location */}
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {displayText.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
            <MapPin className="w-4 h-4 text-accent" />
            <span className="text-sm line-clamp-1">{displayText.location}</span>
          </div>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-muted-foreground">
          {property.bedrooms !== null && (
            <div className="flex items-center gap-1.5">
              <Bed className="w-4 h-4" />
              <span className="text-sm">
                {property.bedrooms}{" "}
                {property.building_type === "commercial"
                  ? t("listing.offices")
                  : t("listing.beds")}
              </span>
            </div>
          )}
          {property.bathrooms !== null && (
            <div className="flex items-center gap-1.5">
              <Bath className="w-4 h-4" />
              <span className="text-sm">
                {property.bathrooms} {t("listing.baths")}
              </span>
            </div>
          )}
          {property.area_sqft !== null && (
            <div className="flex items-center gap-1.5">
              <Square className="w-4 h-4" />
              <span className="text-sm">
                {property.area_sqft.toLocaleString(localeNum)}{" "}
                {t("listing.areaUnit")}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {furnishingChip && (
            <span className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs rounded-full font-medium">
              {furnishingChip}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
