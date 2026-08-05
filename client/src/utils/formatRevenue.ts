export interface RevenueStats {
  total: number;
  selling: number;
  renting: number;
  currency: string;
}

export interface RevenueProperty {
  id?: string;
  title?: string;
  price: number;
  status: string;
  currency: string;
  closed_at?: string | null;
  updated_at?: string | null;
  property_type?: string;
  location?: string | null;
  city?: string | null;
}

export interface MonthlyRevenuePoint {
  /** YYYY-MM */
  key: string;
  year: number;
  month: number;
  selling: number;
  renting: number;
  total: number;
}

function resolveCurrency(properties: RevenueProperty[]): string {
  const closed = properties.filter(
    (p) => p.status === "sold" || p.status === "rented",
  );
  return closed[0]?.currency ?? properties[0]?.currency ?? "EGP";
}

function closeDate(property: RevenueProperty): Date | null {
  const raw = property.closed_at || property.updated_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function startOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
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

/**
 * Lifetime totals for sold + rented listing prices.
 */
export function computeRevenue(properties: RevenueProperty[]): RevenueStats {
  let selling = 0;
  let renting = 0;

  for (const property of properties) {
    if (property.status === "sold") selling += Number(property.price) || 0;
    if (property.status === "rented") renting += Number(property.price) || 0;
  }

  return {
    total: selling + renting,
    selling,
    renting,
    currency: resolveCurrency(properties),
  };
}

/**
 * Revenue for a calendar month:
 * - Sold: full price if closed in that month (one-time)
 * - Rented: monthly rent if still rented and closed on/before that month
 */
export function computeRevenueForMonth(
  properties: RevenueProperty[],
  year: number,
  monthIndex: number,
): RevenueStats {
  const monthStart = startOfMonth(year, monthIndex);
  const monthEnd = endOfMonth(year, monthIndex);
  let selling = 0;
  let renting = 0;

  for (const property of properties) {
    const price = Number(property.price) || 0;
    const closed = closeDate(property);

    if (property.status === "sold") {
      if (closed && closed >= monthStart && closed <= monthEnd) {
        selling += price;
      }
      continue;
    }

    if (property.status === "rented") {
      if (closed && closed <= monthEnd) {
        renting += price;
      }
    }
  }

  return {
    total: selling + renting,
    selling,
    renting,
    currency: resolveCurrency(properties),
  };
}

/** Current calendar month revenue (sold closes + active rents). */
export function computeMonthlyRevenue(
  properties: RevenueProperty[],
  referenceDate: Date = new Date(),
): Pick<RevenueStats, "total" | "currency"> &
  Pick<RevenueStats, "selling" | "renting"> {
  return computeRevenueForMonth(
    properties,
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
  );
}

/** Last N calendar months of revenue (oldest → newest). */
export function computeMonthlyRevenueSeries(
  properties: RevenueProperty[],
  months = 12,
  referenceDate: Date = new Date(),
): MonthlyRevenuePoint[] {
  const points: MonthlyRevenuePoint[] = [];
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(year, month - offset, 1);
    const y = date.getFullYear();
    const m = date.getMonth();
    const stats = computeRevenueForMonth(properties, y, m);
    points.push({
      key: monthKey(y, m),
      year: y,
      month: m,
      selling: stats.selling,
      renting: stats.renting,
      total: stats.total,
    });
  }

  return points;
}

export function listClosedDeals(
  properties: RevenueProperty[],
): RevenueProperty[] {
  return properties
    .filter((p) => p.status === "sold" || p.status === "rented")
    .sort((a, b) => {
      const aTime = closeDate(a)?.getTime() ?? 0;
      const bTime = closeDate(b)?.getTime() ?? 0;
      return bTime - aTime;
    });
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
