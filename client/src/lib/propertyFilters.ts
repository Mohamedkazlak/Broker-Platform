export type ListingType = "all" | "sale" | "rent";
export type BuildingTypeFilter = "all" | "apartment" | "villa" | "commercial";

export interface PropertyFilterState {
  q: string;
  type: ListingType;
  building: BuildingTypeFilter;
  /** "" | "0" (studio) | "1"…"7" (7 means 7+) */
  beds: string;
  baths: string;
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
}

export const EMPTY_PROPERTY_FILTERS: PropertyFilterState = {
  q: "",
  type: "sale",
  building: "all",
  beds: "",
  baths: "",
  priceMin: "",
  priceMax: "",
  areaMin: "",
  areaMax: "",
};

export const BUILDING_TYPE_OPTIONS = [
  "apartment",
  "villa",
  "commercial",
] as const;

export const BED_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7"] as const;
export const BATH_OPTIONS = ["1", "2", "3", "4", "5", "6", "7"] as const;

function parseOptionalNumber(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parsePropertyFiltersFromSearchParams(
  params: URLSearchParams,
): PropertyFilterState {
  const typeParam = params.get("type");
  const type: ListingType =
    typeParam === "sale" || typeParam === "rent" || typeParam === "all"
      ? typeParam
      : typeParam
        ? "all"
        : "sale";

  const buildingParam = params.get("building");
  const building: BuildingTypeFilter =
    buildingParam === "apartment" ||
    buildingParam === "villa" ||
    buildingParam === "commercial"
      ? buildingParam
      : "all";

  // Back-compat for older `price=min-max` / `area=min-max` links
  let priceMin = params.get("priceMin") || "";
  let priceMax = params.get("priceMax") || "";
  let areaMin = params.get("areaMin") || "";
  let areaMax = params.get("areaMax") || "";

  const legacyPrice = params.get("price");
  if (legacyPrice && !priceMin && !priceMax) {
    const [min, max] = legacyPrice.split("-");
    priceMin = min || "";
    priceMax = max || "";
  }
  const legacyArea = params.get("area");
  if (legacyArea && !areaMin && !areaMax) {
    const [min, max] = legacyArea.split("-");
    areaMin = min || "";
    areaMax = max || "";
  }

  return {
    q: params.get("q") || "",
    type,
    building,
    beds: params.get("beds") || "",
    baths: params.get("baths") || "",
    priceMin,
    priceMax,
    areaMin,
    areaMax,
  };
}

export function propertyFiltersToSearchParams(
  filters: PropertyFilterState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.building !== "all") params.set("building", filters.building);
  if (filters.beds) params.set("beds", filters.beds);
  if (filters.baths) params.set("baths", filters.baths);
  if (filters.priceMin) params.set("priceMin", filters.priceMin);
  if (filters.priceMax) params.set("priceMax", filters.priceMax);
  if (filters.areaMin) params.set("areaMin", filters.areaMin);
  if (filters.areaMax) params.set("areaMax", filters.areaMax);
  return params;
}

export function hasActivePropertyFilters(
  filters: PropertyFilterState,
): boolean {
  return (
    Boolean(filters.q) ||
    filters.building !== "all" ||
    Boolean(filters.beds) ||
    Boolean(filters.baths) ||
    Boolean(filters.priceMin) ||
    Boolean(filters.priceMax) ||
    Boolean(filters.areaMin) ||
    Boolean(filters.areaMax)
  );
}

export interface FilterableProperty {
  title: string;
  location: string;
  city: string | null;
  property_type: "rent" | "sale";
  building_type?: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  price: number;
  area_sqft: number | null;
}

export function applyPropertyFilters<T extends FilterableProperty>(
  properties: T[],
  filters: PropertyFilterState,
): T[] {
  let filtered = [...properties];

  if (filters.type !== "all") {
    filtered = filtered.filter((p) => p.property_type === filters.type);
  }

  if (filters.building !== "all") {
    filtered = filtered.filter((p) => p.building_type === filters.building);
  }

  if (filters.beds !== "") {
    const beds = Number(filters.beds);
    if (beds === 0) {
      filtered = filtered.filter((p) => p.bedrooms === 0);
    } else if (beds >= 7) {
      filtered = filtered.filter((p) => p.bedrooms != null && p.bedrooms >= 7);
    } else {
      filtered = filtered.filter(
        (p) => p.bedrooms != null && p.bedrooms >= beds,
      );
    }
  }

  if (filters.baths !== "") {
    const baths = Number(filters.baths);
    if (baths >= 7) {
      filtered = filtered.filter(
        (p) => p.bathrooms != null && p.bathrooms >= 7,
      );
    } else {
      filtered = filtered.filter(
        (p) => p.bathrooms != null && p.bathrooms >= baths,
      );
    }
  }

  const priceMin = parseOptionalNumber(filters.priceMin);
  const priceMax = parseOptionalNumber(filters.priceMax);
  if (priceMin != null || priceMax != null) {
    filtered = filtered.filter((p) => {
      if (priceMin != null && p.price < priceMin) return false;
      if (priceMax != null && p.price > priceMax) return false;
      return true;
    });
  }

  const areaMin = parseOptionalNumber(filters.areaMin);
  const areaMax = parseOptionalNumber(filters.areaMax);
  if (areaMin != null || areaMax != null) {
    filtered = filtered.filter((p) => {
      if (p.area_sqft == null) return false;
      if (areaMin != null && p.area_sqft < areaMin) return false;
      if (areaMax != null && p.area_sqft > areaMax) return false;
      return true;
    });
  }

  if (filters.q) {
    const query = filters.q.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        (p.city && p.city.toLowerCase().includes(query)),
    );
  }

  return filtered;
}
