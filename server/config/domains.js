/**
 * Custom-domain mock catalog.
 *
 * No registrar is contacted — availability and pricing are entirely simulated:
 *   - A domain is "taken" if it already exists in brokers.custom_domain or is in
 *     HARDCODED_TAKEN_DOMAINS (well-known names, for realism).
 *   - Price is a flat lookup by TLD; anything not listed falls back to
 *     DEFAULT_DOMAIN_PRICE. All amounts are made-up EGP figures.
 */
export const DOMAIN_CURRENCY = "EGP";

/**
 * The only extensions a broker may pick for a new custom domain. Kept separate
 * from DOMAIN_TLD_PRICES so restricting what's on sale never changes what an
 * already-registered domain is billed at.
 */
export const ALLOWED_CUSTOM_DOMAIN_TLDS = ["com", "me", "online"];

export const DOMAIN_TLD_PRICES = {
  com: 350,
  me: 400,
  online: 250,
  // Sold before the extension list was narrowed. Retained so existing brokers
  // keep their original price in order summaries; not selectable for new ones.
  net: 300,
  store: 500,
};

export const DEFAULT_DOMAIN_PRICE = 400;

/** Well-known domains that should always read as unavailable. */
export const HARDCODED_TAKEN_DOMAINS = [
  "google.com",
  "facebook.com",
  "amazon.com",
];

/** The domain's TLD (last label), lowercased. */
export function getDomainTld(domain) {
  return String(domain ?? "")
    .trim()
    .toLowerCase()
    .split(".")
    .pop();
}

/** Whether a domain's extension is one a broker is currently allowed to buy. */
export function isAllowedCustomDomainTld(domain) {
  return ALLOWED_CUSTOM_DOMAIN_TLDS.includes(getDomainTld(domain));
}

/** Flat price lookup by the domain's TLD (last label). */
export function priceForDomain(domain) {
  return DOMAIN_TLD_PRICES[getDomainTld(domain)] ?? DEFAULT_DOMAIN_PRICE;
}
