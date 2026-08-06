import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Grid, List, X, ArrowUpDown } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard, Property } from "@/components/properties/PropertyCard";
import { PropertySearchFilters } from "@/components/properties/PropertySearchFilters";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBroker } from "@/contexts/BrokerContext";
import { propertyService } from "@/services/propertyService";
import { translatedBuildingType } from "@/utils/propertyLabels";
import { DEFAULT_HERO_IMAGE, hasBrandingAccess } from "@/lib/brokerBranding";
import {
  EMPTY_PROPERTY_FILTERS,
  PropertyFilterState,
  applyPropertyFilters,
  hasActivePropertyFilters,
  parsePropertyFiltersFromSearchParams,
  propertyFiltersToSearchParams,
} from "@/lib/propertyFilters";
import { cn } from "@/lib/utils";

export default function Properties() {
  const { broker, isLoading: brokerLoading } = useBroker();
  const { t } = useTranslation("property");
  const { t: tCommon } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState<PropertyFilterState>(() =>
    parsePropertyFiltersFromSearchParams(searchParams),
  );
  const [baseProperties, setBaseProperties] = useState<Property[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [fullFilterHeight, setFullFilterHeight] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fullFilterRef = useRef<HTMLDivElement>(null);

  const filteredProperties = useMemo(() => {
    const filtered = applyPropertyFilters(baseProperties, filters);

    if (sortBy === "price-low") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      filtered.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
    }

    return filtered;
  }, [baseProperties, filters, sortBy]);

  useEffect(() => {
    setFilters(parsePropertyFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (brokerLoading) return;

    async function fetchProperties() {
      setIsLoading(true);
      try {
        const apiFilters: { status?: string; broker_id?: string } = {
          status: "active",
        };
        if (broker?.id && broker.id !== "demo-broker-id")
          apiFilters.broker_id = broker.id;
        const apiData = await propertyService.getAll(apiFilters);
        setBaseProperties(Array.isArray(apiData) ? apiData : []);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProperties();
  }, [brokerLoading, broker?.id]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setMinimized(!entry.isIntersecting);
      },
      {
        // Collapse once the full filter block scrolls under the navbar
        rootMargin: "-80px 0px 0px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (minimized) return;
    const node = fullFilterRef.current;
    if (!node) return;

    const update = () =>
      setFullFilterHeight(node.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [minimized]);

  const syncFiltersToUrl = (next: PropertyFilterState) => {
    setFilters(next);
    setSearchParams(propertyFiltersToSearchParams(next), { replace: true });
  };

  const clearFilters = () => {
    setFilters(EMPTY_PROPERTY_FILTERS);
    setSortBy("newest");
    setSearchParams({});
  };

  const active = hasActivePropertyFilters(filters);

  const heroImage =
    broker && hasBrandingAccess(broker.package) && broker.hero_background_url
      ? broker.hero_background_url
      : DEFAULT_HERO_IMAGE;

  const sortAndView = (compact?: boolean) => (
    <div className="flex items-center gap-2 shrink-0 ms-auto">
      {compact ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d0d5dd] bg-white text-[#344054] hover:bg-secondary/60"
              aria-label={t("browse.sortPlaceholder")}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
              <DropdownMenuRadioItem value="newest">
                {t("browse.sortNewest")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price-low">
                {t("browse.sortPriceLow")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price-high">
                {t("browse.sortPriceHigh")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 rounded-full px-4">
              <ArrowUpDown className="w-4 h-4 me-2" />
              {t("browse.sortPlaceholder")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
              <DropdownMenuRadioItem value="newest">
                {t("browse.sortNewest")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price-low">
                {t("browse.sortPriceLow")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price-high">
                {t("browse.sortPriceHigh")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="flex items-center gap-1 border border-[#d0d5dd] rounded-full p-1 shadow-sm bg-white">
        <button
          type="button"
          onClick={() => setViewMode("grid")}
          className={cn(
            "p-2 rounded-full",
            viewMode === "grid"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label={t("browse.ariaGridView")}
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className={cn(
            "p-2 rounded-full",
            viewMode === "list"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label={t("browse.ariaListView")}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const activeChips = active && (
    <div className="flex items-center gap-2 mt-3 flex-wrap">
      <span className="text-sm text-primary-foreground/70">
        {t("browse.activeFilters")}
      </span>
      {filters.q && (
        <FilterChip
          label={`${t("browse.searchChipPrefix")} ${filters.q}`}
          onClear={() => syncFiltersToUrl({ ...filters, q: "" })}
        />
      )}
      {filters.building !== "all" && (
        <FilterChip
          label={
            translatedBuildingType(t, filters.building) ?? filters.building
          }
          onClear={() => syncFiltersToUrl({ ...filters, building: "all" })}
        />
      )}
      {(filters.beds || filters.baths) && (
        <FilterChip
          label={[
            filters.beds
              ? filters.beds === "0"
                ? t("filters.studio")
                : filters.beds === "7"
                  ? t("filters.bedsSevenPlus")
                  : t("filters.bedsPlus", { count: Number(filters.beds) })
              : null,
            filters.baths
              ? filters.baths === "7"
                ? t("filters.bathsSevenPlus")
                : t("filters.bathsPlus", { count: Number(filters.baths) })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          onClear={() => syncFiltersToUrl({ ...filters, beds: "", baths: "" })}
        />
      )}
      {(filters.priceMin || filters.priceMax) && (
        <FilterChip
          label={t("filters.price")}
          onClear={() =>
            syncFiltersToUrl({
              ...filters,
              priceMin: "",
              priceMax: "",
            })
          }
        />
      )}
      {(filters.areaMin || filters.areaMax) && (
        <FilterChip
          label={t("filters.area")}
          onClear={() =>
            syncFiltersToUrl({
              ...filters,
              areaMin: "",
              areaMax: "",
            })
          }
        />
      )}
      <button
        type="button"
        onClick={clearFilters}
        className="text-sm text-accent hover:underline"
      >
        {tCommon("actions.clearAll")}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        {/* Hero band: background image + blur through title & filters */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt=""
              className="w-full h-full object-cover scale-110 blur-[3px]"
            />
            <div className="absolute inset-0 gradient-hero opacity-55" />
          </div>

          <div className="relative z-10 container mx-auto px-4 pt-14 pb-6 md:pt-16">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
              {t("browse.heading")}
            </h1>
            <p className="mt-2 text-primary-foreground/80">
              {t("browse.subheading")}
            </p>
          </div>

          {/* Sentinel: when this leaves the viewport under the navbar, minimize */}
          <div
            ref={sentinelRef}
            className="relative z-10 h-px w-full"
            aria-hidden
          />

          {/* Full filters over the blurred background */}
          {!minimized && (
            <div ref={fullFilterRef} className="relative z-10 pb-8">
              <div className="container mx-auto px-4">
                <PropertySearchFilters
                  variant="hero"
                  value={filters}
                  onChange={syncFiltersToUrl}
                  onSubmit={() => syncFiltersToUrl(filters)}
                  trailing={sortAndView(false)}
                />
                {activeChips}
              </div>
            </div>
          )}
        </section>

        {/* Spacer keeps scroll position stable when switching to compact */}
        {minimized && <div style={{ height: fullFilterHeight }} aria-hidden />}

        {/* Compact sticky bar */}
        {minimized && (
          <div className="fixed top-16 lg:top-20 inset-x-0 z-40 border-b border-border bg-white/95 backdrop-blur-md shadow-sm py-2.5">
            <div className="container mx-auto px-4">
              <PropertySearchFilters
                compact
                value={filters}
                onChange={syncFiltersToUrl}
                onSubmit={() => syncFiltersToUrl(filters)}
                trailing={sortAndView(true)}
              />
            </div>
          </div>
        )}

        {/* Results */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              <Trans
                i18nKey="browse.showingCount"
                t={t}
                values={{ count: filteredProperties.length }}
                components={{
                  strong: <span className="font-medium text-foreground" />,
                }}
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
                {t("browse.noResultsTitle")}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t("browse.noResultsSubtitle")}
              </p>
              <Button onClick={clearFilters}>
                {tCommon("actions.clearFilters")}
              </Button>
            </div>
          ) : (
            <div
              className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
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

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary rounded-full text-sm">
      {label}
      <button type="button" onClick={onClear} aria-label="Clear filter">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
