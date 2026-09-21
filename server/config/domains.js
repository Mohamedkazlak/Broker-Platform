/**
 * Custom-domain config.
 *
 * Availability and live wholesale pricing come from name.com — see
 * server/services/nameComClient.js and server/services/domainPricing.js
 * (USD wholesale + EGP conversion at the current exchange rate, no markup).
 * A domain is also "taken" if it already exists in brokers.custom_domain,
 * regardless of what the registrar says.
 *
 * Max/Ultra may register any TLD name.com sells. The domain-setup picker
 * leads with COMMON_CUSTOM_DOMAIN_TLDS (up to 50); searching the list
 * looks up the rest of the name.com catalog. DOMAIN_TLD_PRICES /
 * priceForDomain are the old flat EGP table, kept only as a last-resort
 * fallback when a live quote and the TLD catalog are both unavailable.
 */
export const DOMAIN_CURRENCY = "EGP";

/**
 * Common extensions we offer, in picker order. We show up to 50 that
 * name.com currently sells; extras below the first 50 are backups if a
 * well-known TLD has no registration price.
 */
export const COMMON_CUSTOM_DOMAIN_TLDS = [
  "com",
  "net",
  "org",
  "io",
  "co",
  "me",
  "online",
  "store",
  "app",
  "dev",
  "ai",
  "xyz",
  "info",
  "biz",
  "pro",
  "us",
  "uk",
  "co.uk",
  "ca",
  "de",
  "fr",
  "it",
  "es",
  "nl",
  "in",
  "eu",
  "au",
  "com.au",
  "eg",
  "tv",
  "cc",
  "site",
  "website",
  "tech",
  "cloud",
  "shop",
  "blog",
  "live",
  "club",
  "top",
  "space",
  "world",
  "digital",
  "agency",
  "studio",
  "design",
  "media",
  "news",
  "group",
  "company",
  "one",
  "link",
  "page",
  "work",
  "email",
  "life",
  "today",
  "art",
  "global",
  "solutions",
];

/**
 * Basic domain shape: label(.label)+.tld — purely a format gate, not a DNS
 * lookup. Multi-part suffixes like .co.uk are allowed; name.com is the source
 * of truth for whether that TLD is actually for sale.
 */
export const CUSTOM_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;

export function isValidCustomDomainFormat(domain) {
  return CUSTOM_DOMAIN_PATTERN.test(
    String(domain ?? "")
      .trim()
      .toLowerCase(),
  );
}

export const DOMAIN_TLD_PRICES = {
  com: 350,
  me: 400,
  online: 250,
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

/** The domain's last label, lowercased. Prefer catalog matching for multi-part TLDs. */
export function getDomainTld(domain) {
  return String(domain ?? "")
    .trim()
    .toLowerCase()
    .split(".")
    .pop();
}

/** Flat price lookup by the domain's last label. Last-resort fallback only. */
export function priceForDomain(domain) {
  return DOMAIN_TLD_PRICES[getDomainTld(domain)] ?? DEFAULT_DOMAIN_PRICE;
}
