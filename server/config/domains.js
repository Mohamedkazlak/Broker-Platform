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

export const DOMAIN_TLD_PRICES = {
  com: 350,
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

/** Flat price lookup by the domain's TLD (last label). */
export function priceForDomain(domain) {
  const tld = String(domain).split(".").pop();
  return DOMAIN_TLD_PRICES[tld] ?? DEFAULT_DOMAIN_PRICE;
}
