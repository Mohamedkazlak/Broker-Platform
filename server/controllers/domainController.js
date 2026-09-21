import { brokerModel } from "../models/brokerModel.js";
import {
  DOMAIN_CURRENCY,
  isValidCustomDomainFormat,
} from "../config/domains.js";
import {
  findCatalogTld,
  getFullTldCatalog,
  getLiveDomainPrice,
  getTldCatalog,
  searchTldCatalog,
} from "../services/domainPricing.js";

function dualPriceFields(quote) {
  return {
    price: quote.priceEGP,
    priceUSD: quote.priceUSD,
    priceEGP: quote.priceEGP,
    currency: DOMAIN_CURRENCY,
  };
}

/**
 * GET /api/domains/tlds
 * Public catalog of the common TLDs we offer, with 1-year list prices
 * (USD wholesale + EGP conversion, no markup). Pass ?q= to search the full
 * name.com catalog so an off-list extension still returns a live price.
 */
export const listCustomDomainTlds = async (req, res, next) => {
  try {
    const query = String(req.query.q ?? "").trim();
    const tlds = query
      ? await searchTldCatalog(query)
      : await getTldCatalog();
    return res.json({ tlds, currency: DOMAIN_CURRENCY });
  } catch (error) {
    console.error("name.com TLD catalog failed:", error);
    const status = error.status && error.status < 500 ? error.status : 502;
    return res.status(status).json({
      status: "error",
      error: "Couldn't load domain extension prices right now",
    });
  }
};

/**
 * GET /api/domains/check-custom?domain=ahmed.com
 * Public, advisory-only. A domain is taken if it's already claimed by another
 * broker, or if name.com reports it as registered/unpurchasable. Price is
 * name.com's own live wholesale USD, plus that amount converted to EGP
 * (no markup) — never the old flat TLD lookup.
 *
 * getLiveDomainPrice() makes the single name.com availability call itself
 * (it needs `purchasable` to know whether to even look at the price), so
 * there's no separate availability check here beyond it.
 */
export const checkCustomDomain = async (req, res, next) => {
  try {
    const domain = String(req.query.domain ?? "")
      .trim()
      .toLowerCase();

    if (!domain || !isValidCustomDomainFormat(domain)) {
      return res.json({ available: false, reason: "invalid" });
    }

    try {
      const catalog = await getFullTldCatalog();
      if (catalog.length > 0 && !findCatalogTld(domain, catalog)) {
        return res.json({ available: false, reason: "unsupportedTld" });
      }
    } catch (catalogError) {
      // Catalog is advisory for the picker. If it is down, still ask name.com
      // about this specific name rather than blocking every search.
      console.error(
        "TLD catalog unavailable during availability check:",
        catalogError,
      );
    }

    const existing = await brokerModel.findByCustomDomain(domain);
    if (existing) {
      return res.json({ available: false, reason: "taken" });
    }

    let quote;
    try {
      quote = await getLiveDomainPrice(domain);
    } catch (lookupError) {
      if (lookupError.reason === "taken") {
        return res.json({ available: false, reason: "taken" });
      }
      // A broken/timed-out call to name.com (or the exchange-rate API) must
      // never be read as "available" — fail closed and log so this doesn't
      // silently let someone "buy" a domain we never actually priced.
      console.error(`Live domain pricing failed for ${domain}:`, lookupError);
      return res.json({ available: false, reason: "checkFailed" });
    }

    return res.json({ available: true, ...dualPriceFields(quote) });
  } catch (error) {
    next(error);
  }
};
