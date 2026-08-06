/**
 * Subscription plan catalog — the single source of truth for plan pricing,
 * listing limits, and domain capabilities. Served verbatim by GET /api/plans
 * and reused by the registration / plan-selection flow.
 *
 * Prices are monthly amounts in EGP. `packageLimit` is the max number of
 * property listings; `UNLIMITED_PACKAGE_LIMIT` is a large sentinel that keeps
 * the NOT NULL integer `brokers.package_limit` column valid for "unlimited"
 * plans. `customDomain` indicates whether the plan can map a custom domain
 * (the rest stay on a *.subdomain host).
 *
 * Plans are grouped into two customer-facing categories. `categories` is a
 * list rather than a single value because the free plan is offered as the
 * entry point of both ladders with identical limits — it is one package row,
 * shown under two tabs. `brokers.package_category` records which ladder a
 * broker actually signed up through, which is the part a free plan can't tell
 * us from `package` alone.
 *
 * `headline` decides what a plan card leads with: "listings" leads with the
 * listing allowance, "domain" leads with the custom-domain capability (for Max
 * and Ultra the domain is the selling point, not the listing count).
 */
export const UNLIMITED_PACKAGE_LIMIT = 999999;

export const PACKAGE_CATEGORIES = ["personal", "enterprise"];

export const DEFAULT_PACKAGE_CATEGORY = "personal";

export const PLANS = [
  {
    id: "free",
    name: "Starter Package",
    price: 0,
    currency: "EGP",
    billingInterval: "month",
    categories: ["personal", "enterprise"],
    packageLimit: 3,
    customDomain: false,
    headline: "listings",
    recommended: false,
    features: [
      "Standard subdomain",
      "Up to 3 property listings",
      "Standard responsive website",
      "Community support",
    ],
  },
  {
    id: "plus",
    name: "Plus Package",
    price: 300,
    currency: "EGP",
    billingInterval: "month",
    categories: ["personal"],
    packageLimit: 10,
    customDomain: false,
    headline: "listings",
    recommended: false,
    features: [
      "Custom subdomain",
      "Up to 10 property listings",
      "Background & icon customization",
      "Social media links",
    ],
  },
  {
    id: "pro",
    name: "Pro Package",
    price: 1000,
    currency: "EGP",
    billingInterval: "month",
    categories: ["personal"],
    packageLimit: 50,
    customDomain: false,
    headline: "listings",
    recommended: true,
    features: [
      "Custom subdomain",
      "Up to 50 property listings",
      "Background & icon customization",
      "Social media links",
    ],
  },
  {
    id: "max",
    name: "Max Package",
    price: 3000,
    currency: "EGP",
    billingInterval: "month",
    categories: ["personal"],
    packageLimit: 100,
    customDomain: true,
    headline: "domain",
    recommended: false,
    features: [
      "Your own domain (.com, .me or .online)",
      "Or keep a custom subdomain",
      "Up to 100 property listings",
      "Background & icon customization",
      "Social media links",
    ],
  },
  {
    id: "ultra",
    name: "Ultra Package",
    price: 5000,
    currency: "EGP",
    billingInterval: "month",
    categories: ["enterprise"],
    packageLimit: UNLIMITED_PACKAGE_LIMIT,
    customDomain: true,
    headline: "domain",
    recommended: false,
    features: [
      "Your own domain (.com, .me or .online)",
      "Or keep a custom subdomain",
      "Unlimited property listings",
      "Background & icon customization",
      "Social media links",
      "Dedicated mobile app for your website",
      "Dedicated manager",
    ],
  },
];

/** Quick id → plan lookup for server-side validation. */
export const PLANS_BY_ID = Object.fromEntries(
  PLANS.map((plan) => [plan.id, plan]),
);

/** Plans offered under a customer-facing category, in catalog order. */
export function plansForCategory(category) {
  return PLANS.filter((plan) => plan.categories.includes(category));
}

/**
 * Resolve the category to store on a broker for a plan they just chose.
 *
 * The requested category is only honoured when the plan is actually offered
 * under it (the free plan is the only one where the client has a real choice);
 * anything else falls back to the plan's own single category so a tampered or
 * missing value can't put a broker in the wrong ladder.
 */
export function resolvePackageCategory(planId, requestedCategory) {
  const plan = PLANS_BY_ID[planId];
  if (!plan) return DEFAULT_PACKAGE_CATEGORY;

  if (requestedCategory && plan.categories.includes(requestedCategory)) {
    return requestedCategory;
  }
  return plan.categories[0] ?? DEFAULT_PACKAGE_CATEGORY;
}
