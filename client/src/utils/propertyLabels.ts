import type { TFunction } from "i18next";
import {
  EGYPT_GOVERNORATES,
  isValidGovernorate,
  type GovernorateSlug,
} from "@/constants/governorates";
import type { Property } from "@/components/properties/PropertyCard";

function lookupOrRaw(
  t: TFunction<"property">,
  key: string,
  fallback: string,
): string {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

const GOVERNORATE_ALIASES: Record<string, GovernorateSlug> =
  EGYPT_GOVERNORATES.reduce(
    (acc, slug) => {
      acc[slug] = slug;
      acc[slug.replace(/-/g, " ")] = slug;
      return acc;
    },
    {} as Record<string, GovernorateSlug>,
  );

// Common English display names and Arabic governorate names → slug
Object.assign(GOVERNORATE_ALIASES, {
  matrouh: "matrouh",
  "marsa matrouh": "matrouh",
  "port said": "port-said",
  "beni suef": "beni-suef",
  "kafr el sheikh": "kafr-el-sheikh",
  "red sea": "red-sea",
  "new valley": "new-valley",
  "south sinai": "south-sinai",
  "north sinai": "north-sinai",
  sharqia: "sharkia",
  القاهرة: "cairo",
  الجيزة: "giza",
  الإسكندرية: "alexandria",
  مطروح: "matrouh",
  "البحر الأحمر": "red-sea",
  الشرقية: "sharkia",
  "جنوب سيناء": "south-sinai",
  "شمال سيناء": "north-sinai",
  "الوادي الجديد": "new-valley",
  "كفر الشيخ": "kafr-el-sheikh",
  "بني سويف": "beni-suef",
  بورسعيد: "port-said",
});

const BUILDING_TYPE_ALIASES: Record<
  string,
  "apartment" | "villa" | "commercial"
> = {
  apartment: "apartment",
  apartments: "apartment",
  apartement: "apartment",
  appartment: "apartment",
  flat: "apartment",
  villa: "villa",
  villas: "villa",
  commercial: "commercial",
  "commercial units": "commercial",
  "commercial unit": "commercial",
  office: "commercial",
  offices: "commercial",
  شقة: "apartment",
  فيلا: "villa",
  تجاري: "commercial",
  "وحدات تجارية": "commercial",
};

const AREA_ALIASES: Record<string, string> = {
  maadi: "maadi",
  المعادي: "maadi",
  "new cairo": "newCairo",
  "القاهرة الجديدة": "newCairo",
  "fifth settlement": "fifthSettlement",
  "5th settlement": "fifthSettlement",
  "التجمع الخامس": "fifthSettlement",
  zamalek: "zamalek",
  الزمالك: "zamalek",
  heliopolis: "heliopolis",
  "مصر الجديدة": "heliopolis",
  "nasr city": "nasrCity",
  "مدينة نصر": "nasrCity",
  "6th of october": "sixthOctober",
  "6 october": "sixthOctober",
  "السادس من أكتوبر": "sixthOctober",
  "sheikh zayed": "sheikhZayed",
  "الشيخ زايد": "sheikhZayed",
  mokattam: "mokattam",
  المقطم: "mokattam",
  downtown: "downtown",
  "وسط البلد": "downtown",
  "garden city": "gardenCity",
  "جاردن سيتي": "gardenCity",
  rehab: "rehab",
  الرحاب: "rehab",
  madinaty: "madinaty",
  مدينتي: "madinaty",
  dokki: "dokki",
  الدقي: "dokki",
  mohandessin: "mohandessin",
  المهندسين: "mohandessin",
  agouza: "agouza",
  العجوزة: "agouza",
  giza: "giza",
  الجيزة: "giza",
  cairo: "cairo",
  القاهرة: "cairo",
  alexandria: "alexandria",
  الإسكندرية: "alexandria",
  "new capital": "newCapital",
  "العاصمة الإدارية": "newCapital",
  "administrative capital": "newCapital",
};

const COUNTRY_ALIASES: Record<string, string> = {
  egypt: "egypt",
  مصر: "egypt",
  "saudi arabia": "saudiArabia",
  saudi: "saudiArabia",
  ksa: "saudiArabia",
  السعودية: "saudiArabia",
  uae: "uae",
  "united arab emirates": "uae",
  emirates: "uae",
  الإمارات: "uae",
  kuwait: "kuwait",
  الكويت: "kuwait",
  qatar: "qatar",
  قطر: "qatar",
  bahrain: "bahrain",
  البحرين: "bahrain",
  oman: "oman",
  عمان: "oman",
  jordan: "jordan",
  الأردن: "jordan",
  lebanon: "lebanon",
  لبنان: "lebanon",
};

function normalizeAlias<T extends string>(
  value: string,
  aliases: Record<string, T>,
  slugs?: readonly T[],
): T | null {
  const trimmed = value.trim();
  const fromAlias = aliases[trimmed.toLowerCase()];
  if (fromAlias) return fromAlias;
  if (slugs?.includes(trimmed as T)) return trimmed as T;
  return null;
}

export function translatedBuildingType(
  t: TFunction<"property">,
  value?: string | null,
): string | null {
  if (!value) return null;
  const norm = normalizeAlias(value, BUILDING_TYPE_ALIASES, [
    "apartment",
    "villa",
    "commercial",
  ]);
  if (norm) {
    return t(`listing.buildingTypes.${norm}`, { defaultValue: value });
  }
  return value;
}

export function translatedPropertyTitle(
  t: TFunction<"property">,
  title?: string | null,
  buildingType?: string | null,
): string {
  if (!title) {
    return translatedBuildingType(t, buildingType) ?? "";
  }
  const norm = normalizeAlias(title, BUILDING_TYPE_ALIASES, [
    "apartment",
    "villa",
    "commercial",
  ]);
  if (norm) {
    return t(`listing.buildingTypes.${norm}`, { defaultValue: title });
  }
  return title;
}

export function translatedLocationArea(
  t: TFunction<"property">,
  value?: string | null,
): string {
  if (!value) return "";
  return value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      const norm = AREA_ALIASES[trimmed.toLowerCase()];
      if (norm) {
        return lookupOrRaw(t, `listing.areaLabels.${norm}`, trimmed);
      }
      return trimmed;
    })
    .filter(Boolean)
    .join(", ");
}

export function translatedCountry(
  t: TFunction<"property">,
  value?: string | null,
): string {
  if (!value) return "";
  const norm = COUNTRY_ALIASES[value.trim().toLowerCase()];
  if (norm) {
    return lookupOrRaw(t, `listing.countryLabels.${norm}`, value);
  }
  return value;
}

const FINISHING_ALIASES: Record<
  string,
  "economic" | "medium" | "luxury" | "ultra"
> = {
  economic: "economic",
  medium: "medium",
  luxury: "luxury",
  ultra: "ultra",
  اقتصادي: "economic",
  متوسط: "medium",
  لوكس: "luxury",
  "سوبر لوكس": "ultra",
};

export function translatedFinishing(
  t: TFunction<"property">,
  value?: string | null,
): string {
  if (!value) return "";
  const norm =
    FINISHING_ALIASES[value.trim().toLowerCase()] ??
    (["economic", "medium", "luxury", "ultra"].includes(value)
      ? (value as "economic" | "medium" | "luxury" | "ultra")
      : null);
  if (norm) {
    return lookupOrRaw(t, `listing.finishingLabels.${norm}`, value);
  }
  return value;
}

const STATUS_ALIASES: Record<string, "active" | "sold" | "rented"> = {
  active: "active",
  sold: "sold",
  rented: "rented",
  نشط: "active",
  مباع: "sold",
  مؤجر: "rented",
  إيجار: "rented",
};

export function translatedStatus(
  t: TFunction<"property">,
  value?: string | null,
): string {
  if (!value) return "";
  const norm =
    STATUS_ALIASES[value.trim().toLowerCase()] ??
    (["active", "sold", "rented"].includes(value)
      ? (value as "active" | "sold" | "rented")
      : null);
  if (norm) {
    return lookupOrRaw(t, `listing.statusLabels.${norm}`, value);
  }
  return value;
}

export function translatedFurnished(
  t: TFunction<"property">,
  value: Property["furnished"],
): string {
  if (typeof value === "boolean") {
    return value
      ? t("listing.furnishedLabels.furnished")
      : t("listing.furnishedLabels.unfurnished");
  }
  if (!value) return t("listing.furnishedLabels.unfurnished");
  if (value === "furnished") return t("listing.furnishedLabels.furnished");
  if (value === "unfurnished") return t("listing.furnishedLabels.unfurnished");
  if (value === "semi-furnished")
    return t("listing.furnishedLabels.semiFurnished");
  return value;
}

const CONTRACT_DURATIONS = ["1", "2", "3", "6", "12", "24", "60"] as const;

export function translatedContractDuration(
  t: TFunction<"property">,
  value?: string | null,
): string | null {
  if (!value) return null;
  if (!(CONTRACT_DURATIONS as readonly string[]).includes(value)) return value;
  return lookupOrRaw(t, `listing.contractDurationLabels.${value}`, value);
}

export function translatedVillaLevels(
  t: TFunction<"property">,
  value?: number | string | null,
): string | null {
  if (value == null || value === "") return null;
  const key = String(value);
  if (["1", "2", "3"].includes(key)) {
    return lookupOrRaw(t, `listing.villaLevelLabels.${key}`, key);
  }
  const n = Number(value);
  if (!Number.isNaN(n)) {
    return n === 1
      ? t("details.levelCountSingle", { count: n })
      : t("details.levelCountPlural", { count: n });
  }
  return String(value);
}

export function translatedGovernorate(
  tGov: TFunction<"governorates">,
  value?: string | null,
): string {
  if (!value) return "";
  if (isValidGovernorate(value)) {
    return tGov(value);
  }
  const norm = GOVERNORATE_ALIASES[value.trim().toLowerCase()];
  if (norm) {
    return tGov(norm);
  }
  return value;
}

export function formatPropertyLocation(
  property: Pick<Property, "location" | "city" | "country">,
  t: TFunction<"property">,
  tGov: TFunction<"governorates">,
): string {
  const parts: string[] = [];
  if (property.location) {
    parts.push(translatedLocationArea(t, property.location));
  }
  const city = translatedGovernorate(tGov, property.city);
  if (city) parts.push(city);
  if (property.country) {
    parts.push(translatedCountry(t, property.country));
  }
  return parts.filter(Boolean).join(", ");
}
