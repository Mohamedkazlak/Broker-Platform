/**
 * Custom-domain config.
 *
 * Availability and live wholesale pricing come from name.com — see
 * server/services/nameComClient.js and server/services/domainPricing.js
 * (USD wholesale + EGP conversion at the current exchange rate, no markup).
 * A domain is also "taken" if it already exists in brokers.custom_domain,
 * regardless of what the registrar says.
 *
 * Source of truth for what brokers may buy: getTldCatalog() in
 * domainPricing.js — COMMON_CUSTOM_DOMAIN_TLDS in order ∩ name.com
 * registration prices, capped at FEATURED_CUSTOM_DOMAIN_TLD_LIMIT (50).
 * The preference list below may be longer; extras are only backups when
 * an earlier entry has no registration price. Off-list / full-catalog
 * TLDs are not sold. DOMAIN_TLD_PRICES / priceForDomain are the old flat
 * EGP table, kept only as a last-resort display fallback elsewhere.
 */

/**
 * Platform apex for broker subdomains (<slug>.<PLATFORM_BASE_DOMAIN>).
 * Migrated from myflats.store → brokersplatform.shop. Override with
 * PLATFORM_BASE_DOMAIN (or legacy PLATFORM_APEX_DOMAIN). Client mirror:
 * VITE_PLATFORM_BASE_DOMAIN.
 */
export const PLATFORM_BASE_DOMAIN = (
  process.env.PLATFORM_BASE_DOMAIN ||
  process.env.PLATFORM_APEX_DOMAIN ||
  "brokersplatform.shop"
)
  .trim()
  .toLowerCase();

export const DOMAIN_CURRENCY = "EGP";

/** How many featured TLDs brokers see and the server will sell. */
export const FEATURED_CUSTOM_DOMAIN_TLD_LIMIT = 50;

/**
 * Pending checkout hold on a custom domain before the Reachi session
 * expires (overridden by the gateway's expires_at when present).
 */
export const DOMAIN_HOLD_TTL_MS = 30 * 60 * 1000;

/**
 * Preferred extensions, in picker order. getTldCatalog() keeps the first
 * FEATURED_CUSTOM_DOMAIN_TLD_LIMIT that name.com currently sells.
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
