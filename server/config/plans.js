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
 */
export const UNLIMITED_PACKAGE_LIMIT = 999999;

export const PLANS = [
  {
    id: "free",
    name: "Starter Package",
    price: 0,
    currency: "EGP",
    billingInterval: "month",
    packageLimit: 3,
    customDomain: false,
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
    packageLimit: 10,
    customDomain: false,
    features: [
      "Custom subdomain",
      "Up to 10 property listings",
      "Basic branding",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro Package",
    price: 1000,
    currency: "EGP",
    billingInterval: "month",
    packageLimit: 50,
    customDomain: true,
    features: [
      "Everything in Plus",
      "Up to 50 property listings",
      "Custom domain name (e.g. ahmed.com)",
      "Full customization",
    ],
  },
  {
    id: "ultra",
    name: "Ultra Package",
    price: 5000,
    currency: "EGP",
    billingInterval: "month",
    packageLimit: UNLIMITED_PACKAGE_LIMIT,
    customDomain: true,
    features: [
      "Everything in Pro",
      "Unlimited property listings",
      "Dedicated mobile app for your website",
      "Dedicated manager",
    ],
  },
];

/** Quick id → plan lookup for server-side validation. */
export const PLANS_BY_ID = Object.fromEntries(
  PLANS.map((plan) => [plan.id, plan]),
);
