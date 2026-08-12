import { Building2, Crown, Globe, Star, Zap } from "lucide-react";

/**
 * Client-side mirror of the server plan catalog (`server/config/plans.js`).
 *
 * Prices, listing limits and domain capability stay server-owned and arrive via
 * GET /api/plans. What lives here is only what the browser needs before (or
 * without) that call: the plan id union, the category grouping used by the
 * marketing page, and the per-plan icon/colour styling shared by all three
 * plan UIs.
 */

export type PlanId = "free" | "plus" | "pro" | "max" | "ultra";

export type PackageCategory = "personal" | "enterprise";

/** Tab order. Personal is the self-serve default. */
export const PACKAGE_CATEGORIES: PackageCategory[] = ["personal", "enterprise"];

export const DEFAULT_PACKAGE_CATEGORY: PackageCategory = "personal";

/**
 * Which ladders each plan is offered under. `free` appears in both: it is a
 * single package with one set of limits, shown as the entry point of each tab.
 */
export const PLAN_CATEGORIES: Record<PlanId, PackageCategory[]> = {
  free: ["personal", "enterprise"],
  plus: ["personal"],
  pro: ["personal"],
  max: ["personal"],
  ultra: ["enterprise"],
};

/** Plan ids in catalog order, filtered to one category. */
export function planIdsForCategory(category: PackageCategory): PlanId[] {
  return (Object.keys(PLAN_CATEGORIES) as PlanId[]).filter((id) =>
    PLAN_CATEGORIES[id].includes(category),
  );
}

/** Shape of a plan as returned by GET /api/plans. */
export interface ApiPlan {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  billingInterval: string;
  categories: PackageCategory[];
  packageLimit: number;
  customDomain: boolean;
  /** What the card leads with: the listing allowance or the custom domain. */
  headline: "listings" | "domain";
  recommended: boolean;
  features: string[];
}

/** Plans above this limit are shown as "unlimited" rather than a raw count. */
export const UNLIMITED_PACKAGE_LIMIT = 999999;

export const planIcons: Record<PlanId, typeof Globe> = {
  free: Globe,
  plus: Building2,
  pro: Star,
  max: Crown,
  ultra: Zap,
};

export interface PlanColors {
  border: string;
  icon: string;
  badge?: string;
  button: string;
  /** Soft fill for the card body (used on highlighted / accented plans). */
  surface?: string;
}

export const planColors: Record<PlanId, PlanColors> = {
  free: {
    border: "border-border hover:border-blue-300 border-t-4 border-t-blue-500",
    icon: "bg-blue-100 text-blue-600",
    button: "hover:bg-blue-600 hover:text-white hover:border-blue-600",
  },
  plus: {
    border:
      "border-border hover:border-emerald-300 border-t-4 border-t-emerald-500",
    icon: "bg-emerald-100 text-emerald-600",
    button: "hover:bg-emerald-600 hover:text-white hover:border-emerald-600",
  },
  pro: {
    border:
      "border-orange-200 hover:border-orange-300 border-t-4 border-t-orange-500 shadow-sm",
    icon: "bg-orange-100 text-orange-600",
    badge: "bg-orange-100 text-orange-700",
    button:
      "bg-orange-500 text-white hover:bg-orange-600 border-orange-500 hover:border-orange-600",
    surface: "bg-orange-50/50",
  },
  max: {
    border:
      "border-border hover:border-yellow-300 border-t-4 border-t-yellow-400",
    icon: "bg-yellow-100 text-yellow-700",
    button: "hover:bg-yellow-400 hover:text-yellow-950 hover:border-yellow-400",
  },
  ultra: {
    border:
      "border-border hover:border-purple-300 border-t-4 border-t-purple-500",
    icon: "bg-purple-100 text-purple-600",
    button: "hover:bg-purple-600 hover:text-white hover:border-purple-600",
  },
};
