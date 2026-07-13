import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { propertyService } from "@/services/propertyService";
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
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Property } from "@/components/properties/PropertyCard";
import { PropertyWhatsAppButton } from "@/components/properties/PropertyWhatsAppButton";
import { PropertyImage } from "@/components/properties/PropertyImage";
import { useBroker } from "@/contexts/BrokerContext";
import { usePropertyDisplayText } from "@/hooks/usePropertyDisplayText";
import { amenityStoredToKey, translatedAmenityLabel } from "@/utils/amenities";
import {
  translatedBuildingType,
  translatedContractDuration,
  translatedFinishing,
  translatedFurnished,
  translatedStatus,
  translatedVillaLevels,
} from "@/utils/propertyLabels";
import { normalizePropertyGallery } from "@/utils/propertyImageLinks";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80";

export default function PropertyDetails() {
  const { id } = useParams();
  const { broker } = useBroker();
  const { t, i18n } = useTranslation(["property", "governorates"]);
  const tGov = i18n.getFixedT(i18n.language, "governorates");
  const isRtl = i18n.dir() === "rtl";
  const localeNum = isRtl ? "ar-EG" : "en-US";
  const badgeCase = isRtl
    ? "normal-case tracking-normal text-sm"
    : "uppercase text-sm tracking-wide";

  const [property, setProperty] = useState<
    (Property & { media?: { url: string; type: "image" | "video" }[] }) | null
  >(null);
  const [fetchLoading, setFetchLoading] = useState(Boolean(id));
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const displayText = usePropertyDisplayText(property, i18n.language);

  useEffect(() => {
    if (!id) {
      setFetchLoading(false);
      return undefined;
    }

    const ac = new AbortController();

    async function fetchProperty() {
      setFetchLoading(true);
      setProperty(null);
      try {
        const data = await propertyService.getById(id, { signal: ac.signal });

        const media: { url: string; type: "image" | "video" }[] = [];

        const propertyDataResponse = data as Property & {
          image_urls?: string[] | null;
          video_urls?: string[] | null;
        };

        const gallery = normalizePropertyGallery(
          propertyDataResponse.image_url,
          propertyDataResponse.image_urls,
        );

        for (const url of gallery) {
          media.push({ url, type: "image" });
        }

        if (Array.isArray(propertyDataResponse.video_urls)) {
          propertyDataResponse.video_urls.forEach((url: string) => {
            if (url) media.push({ url, type: "video" });
          });
        }

        const propertyData = {
          ...data,
          image_url: gallery[0] ?? propertyDataResponse.image_url,
          image_urls: gallery,
          media:
            media.length > 0
              ? media
              : [{ url: DEFAULT_IMAGE, type: "image" as const }],
        };
        setProperty(
          propertyData as Property & {
            media: { url: string; type: "image" | "video" }[];
          },
        );
      } catch (error) {
        if (ac.signal.aborted) return;
        console.error("Error fetching property:", error);
        setProperty(null);
      } finally {
        if (!ac.signal.aborted) {
          setFetchLoading(false);
        }
      }
    }

    void fetchProperty();
    return () => {
      ac.abort();
    };
  }, [id]);

  const mediaList = property?.media || [
    { url: DEFAULT_IMAGE, type: "image" as const },
  ];

  const nextImage = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  const prevImage = () => {
    setCurrentMediaIndex(
      (prev) => (prev - 1 + mediaList.length) % mediaList.length,
    );
  };

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
      ? `${formatted}${t("listing.priceSuffixMonth")}`
      : formatted;
  };

  if (fetchLoading || !id) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
            <div className="h-[40vh] bg-muted rounded-2xl" />
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="h-16 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("details.notFoundTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("details.notFoundSubtitle")}
          </p>
          <Button asChild className="mt-6">
            <Link to="/properties">{t("details.browseLink")}</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        <div className="relative h-[50vh] md:h-[70vh] bg-black overflow-hidden flex items-center justify-center">
          {mediaList[currentMediaIndex].type === "video" ? (
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
            <PropertyImage
              key={mediaList[currentMediaIndex].url}
              src={mediaList[currentMediaIndex].url}
              alt={displayText.title}
              className="max-w-full max-h-full w-auto h-auto object-contain"
              unavailableClassName="w-full h-full min-h-[40vh]"
              emptyFallbackSrc={
                mediaList.length === 1 ? DEFAULT_IMAGE : undefined
              }
            />
          )}

          {/* Navigation */}
          {mediaList.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute start-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                aria-label={t("details.prevMedia")}
              >
                <PrevIcon className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute end-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                aria-label={t("details.nextMedia")}
              >
                <NextIcon className="w-6 h-6" />
              </button>

              {/* Indicators */}
              <div className="absolute bottom-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 flex gap-2">
                {mediaList.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMediaIndex(index)}
                    aria-label={t("details.goToMedia", { index: index + 1 })}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentMediaIndex
                        ? "bg-white scale-110"
                        : "bg-white/50 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Badges */}
          <div className="absolute top-4 start-4 flex gap-2">
            <Badge
              className={`${
                property.property_type === "rent"
                  ? "bg-navy text-primary-foreground"
                  : "bg-accent text-accent-foreground"
              } font-medium ${badgeCase}`}
            >
              {property.property_type === "rent"
                ? t("listing.forRent")
                : t("listing.forSale")}
            </Badge>
            {property.featured && (
              <Badge
                className={`bg-accent text-accent-foreground font-medium ${isRtl ? "normal-case" : ""}`}
              >
                {t("listing.featured")}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="absolute top-4 end-4 flex gap-2">
            <button
              className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors"
              aria-label={t("listing.ariaFavorite")}
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors"
              aria-label={t("listing.ariaShare")}
            >
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
                      {displayText.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <MapPin className="w-5 h-5 text-accent" />
                      <span>{displayText.location}</span>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="font-display text-3xl font-bold text-primary">
                      {formatPrice(
                        property.price,
                        property.currency,
                        property.property_type,
                      )}
                    </p>
                    {property.price_negotiable && (
                      <p className="text-sm text-accent font-medium">
                        {t("details.priceNegotiable")}
                      </p>
                    )}
                    {property.property_type === "rent" && (
                      <p className="text-sm text-muted-foreground">
                        {t("details.plusUtilities")}
                      </p>
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
                        <p className="font-medium text-foreground">
                          {property.bedrooms}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {property.building_type === "commercial"
                            ? t("listing.offices")
                            : t("listing.bedrooms")}
                        </p>
                      </div>
                    </div>
                  )}
                  {property.bathrooms !== null && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Bath className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {property.bathrooms}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("listing.bathrooms")}
                        </p>
                      </div>
                    </div>
                  )}
                  {property.area_sqft !== null && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Square className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {property.area_sqft.toLocaleString(localeNum)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("listing.areaUnit")}
                        </p>
                      </div>
                    </div>
                  )}
                  {property.building_type === "apartment" &&
                    property.apartment_level && (
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {property.apartment_level}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("details.apartmentLevel")}
                          </p>
                        </div>
                      </div>
                    )}
                  {property.building_type === "villa" &&
                    property.villa_levels && (
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {property.villa_levels}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {translatedVillaLevels(t, property.villa_levels) ??
                              (property.villa_levels === 1 ||
                              property.villa_levels === "1"
                                ? t("details.levelSingle")
                                : t("details.levelPlural"))}
                          </p>
                        </div>
                      </div>
                    )}
                  {property.finishing && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Paintbrush className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {translatedFinishing(t, property.finishing)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("details.typeOfFinishing")}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Armchair className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {translatedFurnished(t, property.furnished)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("details.typeOfFurnishing")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  {t("details.aboutHeading")}
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {displayText.description}
                  </p>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  {t("details.amenitiesHeading")}
                </h2>
                {(property.amenities?.length ?? 0) > 0 ? (
                  <div
                    dir={isRtl ? "rtl" : "ltr"}
                    className="grid grid-cols-2 md:grid-cols-3 gap-4 text-start"
                  >
                    {property.amenities!.map((amenity) => (
                      <div
                        key={amenityStoredToKey(amenity) ?? amenity}
                        className="flex items-start gap-2 justify-start"
                      >
                        <div className="w-5 h-5 shrink-0 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-accent" />
                        </div>
                        <span className="text-sm text-foreground">
                          {translatedAmenityLabel(amenity, t)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("details.noAmenities")}
                  </p>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {mediaList.length > 1 && (
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                    {t("details.galleryHeading")}
                  </h2>
                  <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
                    {mediaList.map((media, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMediaIndex(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          index === currentMediaIndex
                            ? "border-accent"
                            : "border-transparent hover:border-border"
                        }`}
                      >
                        {media.type === "video" ? (
                          <video
                            key={media.url}
                            src={media.url}
                            className="w-full h-full object-cover pointer-events-none"
                            muted
                            playsInline
                          />
                        ) : (
                          <PropertyImage
                            key={media.url}
                            src={media.url}
                            alt={`${displayText.title} ${index + 1}`}
                            className="w-full h-full object-cover"
                            unavailableClassName="w-full h-full"
                            compact
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
                    {t("details.interestedHeading")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t("details.interestedDescription")}
                  </p>

                  <div className="space-y-3">
                    <Button
                      size="lg"
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-950 border-0 font-medium"
                      asChild
                    >
                      <a
                        href={`tel:${broker?.phone_number || "+1 (555) 123-4567"}`}
                      >
                        <Phone className="w-5 h-5" />
                        {t("details.callAgent")}
                      </a>
                    </Button>
                    {property.id && (
                      <PropertyWhatsAppButton propertyId={property.id} />
                    )}
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      asChild
                    >
                      <a
                        href={`mailto:${broker?.email || "contact@myflats.com"}`}
                      >
                        <Mail className="w-5 h-5" />
                        {t("details.emailInquiry")}
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="bg-secondary/50 rounded-2xl p-6">
                  <h4 className="font-medium text-foreground mb-4">
                    {t("details.quickFactsHeading")}
                  </h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("details.quickFactsType")}
                      </span>
                      <span className="font-medium text-foreground">
                        {property.property_type === "rent"
                          ? t("listing.forRent")
                          : t("listing.forSale")}
                      </span>
                    </li>
                    {property.building_type ? (
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("details.quickFactsBuilding")}
                        </span>
                        <span
                          className={`font-medium text-foreground ${isRtl ? "" : "capitalize"}`}
                        >
                          {translatedBuildingType(t, property.building_type)}
                        </span>
                      </li>
                    ) : null}
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("details.quickFactsStatus")}
                      </span>
                      <span
                        className={`font-medium text-foreground ${isRtl ? "" : "capitalize"}`}
                      >
                        {translatedStatus(t, property.status)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("details.quickFactsFurnished")}
                      </span>
                      <span className="font-medium text-foreground">
                        {translatedFurnished(t, property.furnished)}
                      </span>
                    </li>
                    {property.finishing ? (
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("details.quickFactsFinishing")}
                        </span>
                        <span className="font-medium text-foreground">
                          {translatedFinishing(t, property.finishing)}
                        </span>
                      </li>
                    ) : null}
                    {property.property_type === "rent" &&
                    property.contract_duration ? (
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("details.quickFactsContractDuration")}
                        </span>
                        <span className="font-medium text-foreground">
                          {translatedContractDuration(
                            t,
                            property.contract_duration,
                          )}
                        </span>
                      </li>
                    ) : null}
                    {property.area_sqft && (
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("details.quickFactsPricePerSqft")}
                        </span>
                        <span className="font-medium text-foreground">
                          {property.currency === "USD"
                            ? "$"
                            : property.currency || "EGP"}{" "}
                          {Math.round(
                            property.price / property.area_sqft,
                          ).toLocaleString(localeNum)}
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
