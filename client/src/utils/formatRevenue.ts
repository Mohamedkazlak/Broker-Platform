export interface RevenueStats {
  total: number;
  selling: number;
  renting: number;
  currency: string;
}

export function countActiveCities(
  properties: { city: string | null; status: string }[],
): number {
  const cities = new Set(
    properties
      .filter((property) => property.status === "active")
      .map((property) => property.city?.trim().toLowerCase())
      .filter(Boolean),
  );
  return cities.size;
}

export function computeMonthlyRevenue(
  properties: { price: number; status: string; currency: string }[],
): Pick<RevenueStats, "total" | "currency"> {
  const { total, currency } = computeRevenue(properties);
  return { total, currency };
}

export function computeRevenue(
  properties: { price: number; status: string; currency: string }[],
): RevenueStats {
  let selling = 0;
  let renting = 0;
  const closed = properties.filter(
    (p) => p.status === "sold" || p.status === "rented",
  );
  const currency = closed[0]?.currency ?? "EGP";

  for (const property of properties) {
    if (property.status === "sold") selling += property.price;
    if (property.status === "rented") renting += property.price;
  }

  return { total: selling + renting, selling, renting, currency };
}

export function formatRevenue(
  amount: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
