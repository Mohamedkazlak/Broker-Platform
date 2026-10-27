import {
  checkDomainAvailability,
  listTldRegistrationPrices,
} from "./nameComClient.js";
import { getUsdToEgpRate } from "./exchangeRate.js";
import {
  COMMON_CUSTOM_DOMAIN_TLDS,
  FEATURED_CUSTOM_DOMAIN_TLD_LIMIT,
  getDomainTld,
} from "../config/domains.js";

const TLD_CATALOG_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let catalogCache = null;
let catalogCachedAt = 0;

/**
 * Convert name.com's USD wholesale price to EGP at the current rate.
 * No markup — straight conversion. EGP is rounded to the nearest pound;
 * USD is returned as name.com sent it.
 *
 * @param {number} priceUsd
 * @returns {Promise<{ priceUSD: number, priceEGP: number }>}
 */
export async function convertWholesaleUsd(priceUsd) {
  const usdToEgp = await getUsdToEgpRate();
  return {
    priceUSD: priceUsd,
    priceEGP: Math.round(priceUsd * usdToEgp),
  };
}

/**
 * Live, no-markup wholesale quote for a custom domain: exactly what
 * name.com would charge us (USD), plus that amount converted to EGP.
 *
 * Availability and price both come from the same name.com call, so this
 * never issues two requests for one domain. Deliberately never falls back
 * to a guessed/flat price on failure. Premium domains are refused.
 *
 * @param {string} domain e.g. "ahmed.com"
 * @returns {Promise<{ priceUSD: number, priceEGP: number }>}
 * @throws with `.reason = "taken"` when name.com reports the domain isn't
 *   purchasable; `.reason = "premium"` when name.com marks it premium; a
 *   plain error otherwise (availability check failed, name.com didn't
 *   return a price, or the exchange rate lookup failed).
 */
export async function getLiveDomainPrice(domain) {
  const { purchasable, premium, priceUsd } =
    await checkDomainAvailability(domain);

  if (premium) {
    throw Object.assign(
      new Error(`${domain} is a premium domain and is not available`),
      { status: 409, reason: "premium" },
    );
  }

  if (!purchasable) {
    throw Object.assign(
      new Error(`${domain} is not currently purchasable at name.com`),
      { status: 409, reason: "taken" },
    );
  }

  if (
    typeof priceUsd !== "number" ||
    !Number.isFinite(priceUsd) ||
    priceUsd <= 0
  ) {
    throw Object.assign(
      new Error(`name.com didn't return a purchase price for ${domain}`),
      { status: 502 },
    );
  }

  return convertWholesaleUsd(priceUsd);
}

/**
 * Keep only the featured common extensions, in picker order, that name.com
 * sells. This is the source of truth for what brokers see and may buy.
 */
function toOfferedCatalog(tlds) {
  const byTld = new Map(tlds.map((row) => [row.tld, row]));
  return COMMON_CUSTOM_DOMAIN_TLDS.map((tld) => byTld.get(tld))
    .filter(Boolean)
    .slice(0, FEATURED_CUSTOM_DOMAIN_TLD_LIMIT);
}

/**
 * Longest catalog TLD that is a suffix of `domain` (so example.co.uk matches
 * co.uk, not uk).
 */
export function findCatalogTld(domain, catalog) {
  const normalized = String(domain ?? "")
    .trim()
    .toLowerCase();
  if (!normalized || !Array.isArray(catalog) || catalog.length === 0) {
    return null;
  }

  const tlds = catalog
    .map((row) => row.tld)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return (
    tlds.find((tld) => normalized === tld || normalized.endsWith(`.${tld}`)) ??
    null
  );
}

async function loadFullTldCatalog() {
  const rows = await listTldRegistrationPrices();
  const usdToEgp = await getUsdToEgpRate();
  const seen = new Set();
  const tlds = [];

  for (const row of rows) {
    if (seen.has(row.tld)) continue;
    seen.add(row.tld);
    tlds.push({
      tld: row.tld,
      priceUSD: row.priceUsd,
      priceEGP: Math.round(row.priceUsd * usdToEgp),
    });
  }

  return tlds;
}

/**
 * Every TLD name.com currently sells, with 1-year list prices. Cached so
 * getTldCatalog() can intersect with COMMON_CUSTOM_DOMAIN_TLDS without
 * re-paging name.com. Not sold directly — only the featured subset is.
 *
 * @returns {Promise<Array<{ tld: string, priceUSD: number, priceEGP: number }>>}
 */
export async function getFullTldCatalog() {
  const isStale = Date.now() - catalogCachedAt > TLD_CATALOG_TTL_MS;

  if (catalogCache && !isStale) {
    return catalogCache;
  }

  try {
    const tlds = await loadFullTldCatalog();
    catalogCache = tlds;
    catalogCachedAt = Date.now();
    return catalogCache;
  } catch (error) {
    if (catalogCache) {
      console.error(
        "Failed to refresh name.com TLD catalog, serving stale cached value:",
        error,
      );
      return catalogCache;
    }
    throw error;
  }
}

/**
 * The featured TLDs brokers see (up to FEATURED_CUSTOM_DOMAIN_TLD_LIMIT),
 * with 1-year list prices in USD and EGP from name.com. Source of truth for
 * what we sell.
 *
 * @returns {Promise<Array<{ tld: string, priceUSD: number, priceEGP: number }>>}
 */
export async function getTldCatalog() {
  return toOfferedCatalog(await getFullTldCatalog());
}

/**
 * Fail closed: domain TLD must be in the same featured catalog the picker
 * shows. Catalog load failures and an empty offer list both reject.
 *
 * @param {string} domain
 */
export async function assertOfferedCustomDomainTld(domain) {
  let catalog;
  try {
    catalog = await getTldCatalog();
  } catch (error) {
    console.error("TLD catalog unavailable while validating domain:", error);
    throw Object.assign(
      new Error("Couldn't load domain extension prices right now"),
      { status: 502, reason: "catalogUnavailable" },
    );
  }

  if (!catalog.length || !findCatalogTld(domain, catalog)) {
    throw Object.assign(
      new Error("That domain extension isn't supported"),
      { status: 400, reason: "unsupportedTld" },
    );
  }
}

/**
 * Search only the featured catalog (same 50 the picker shows). Exact
 * matches first, then prefix.
 *
 * @param {string} query
 * @returns {Promise<Array<{ tld: string, priceUSD: number, priceEGP: number }>>}
 */
export async function searchTldCatalog(query) {
  const needle = String(query ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\.+/, "");
  const offered = await getTldCatalog();
  if (!needle) return offered;

  const exact = [];
  const prefix = [];

  for (const row of offered) {
    if (row.tld === needle) exact.push(row);
    else if (row.tld.startsWith(needle)) prefix.push(row);
  }

  return [...exact, ...prefix];
}

/**
 * List price for a domain's TLD from the featured catalog (non-premium).
 * Returns null when the TLD isn't offered.
 */
export async function quoteTldListPrice(domain) {
  const catalog = await getTldCatalog();
  const tld = findCatalogTld(domain, catalog) ?? getDomainTld(domain);
  const row = catalog.find((entry) => entry.tld === tld);
  if (!row) return null;
  return { priceUSD: row.priceUSD, priceEGP: row.priceEGP, tld: row.tld };
}

/**
 * Price a custom domain for an order. New registrations use the live
 * availability quote (and fail if the name isn't for sale). Domains the
 * broker already holds are a one-time purchase already paid — renewals and
 * plan-change checkouts charge 0 for the domain line.
 *
 * @param {string} domain
 * @param {{ alreadyOwned?: boolean }} [options]
 */
export async function quoteDomainForOrder(
  domain,
  { alreadyOwned = false } = {},
) {
  if (alreadyOwned) {
    return { priceUSD: null, priceEGP: 0 };
  }

  return getLiveDomainPrice(domain);
}
