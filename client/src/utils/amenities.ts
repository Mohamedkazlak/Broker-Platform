import type { TFunction } from "i18next";

/**
 * Canonical amenity keys persisted on properties (dashboard + API).
 * Legacy rows may store English or Arabic checkbox labels — see {@link amenityStoredToKey}.
 */
export const AMENITY_KEYS = [
  "elevator",
  "parking",
  "balcony",
  "centralAc",
  "gas",
  "security",
  "pool",
  "garden",
  "gym",
  "laundry",
  "petFriendly",
  "smartHome",
] as const;

export type AmenityKey = (typeof AMENITY_KEYS)[number];

const LABEL_ROWS: readonly (readonly [AmenityKey, string, string])[] = [
  ["elevator", "Elevator", "المصعد"],
  ["parking", "Parking", "الجراج"],
  ["balcony", "Balcony / Terrace", "البلكونة"],
  ["centralAc", "Central A/C", "المكيف المركزي"],
  ["gas", "Natural Gas", "الغاز الطبيعي"],
  ["security", "Security / CCTV", "الأمن / الكاميرات"],
  ["pool", "Swimming Pool", "حمام السباحة"],
  ["garden", "Garden", "الحديقة"],
  ["gym", "Gym / Fitness Center", "مركز الجيم"],
  ["laundry", "Laundry Room", "المغسلة"],
  ["petFriendly", "Pet Friendly", "الحيوانات الأليفة"],
  ["smartHome", "Smart Home", "المنزل الذكي"],
] as const;

const lookup = (): Map<string, AmenityKey> => {
  const m = new Map<string, AmenityKey>();
  for (const [key, en, ar] of LABEL_ROWS) {
    m.set(en.trim().toLowerCase(), key);
    m.set(ar.trim().toLowerCase(), key);
    m.set(String(key).trim().toLowerCase(), key);
  }
  return m;
};

const LOOKUP = lookup();

/** Map a stored amenity string (legacy label or canonical key) to its canonical key, if known. */
export function amenityStoredToKey(stored: string): AmenityKey | null {
  const n = stored.trim().toLowerCase();
  const hit = LOOKUP.get(n);
  return hit ?? null;
}

/**
 * Normalize persisted amenities to canonical keys where possible (keeps unknown custom strings).
 */
export function normalizeAmenityPersistedList(entries: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (typeof e !== "string") continue;
    const trimmed = e.trim();
    if (!trimmed) continue;
    const key = amenityStoredToKey(trimmed);
    const canon = key ?? trimmed;
    if (seen.has(canon)) continue;
    seen.add(canon);
    out.push(canon);
  }
  return out;
}

/** Resolved label for the current locale (property namespace). Falls back to raw text for customs. */
export function translatedAmenityLabel(
  stored: string,
  t: TFunction<"property">,
): string {
  const key = amenityStoredToKey(stored);
  if (key) {
    return t(`listing.amenityLabels.${key}`, { defaultValue: stored });
  }
  return stored;
}
