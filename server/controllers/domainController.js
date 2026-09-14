import { brokerModel } from "../models/brokerModel.js";
import {
  priceForDomain,
  isAllowedCustomDomainTld,
  DOMAIN_CURRENCY,
} from "../config/domains.js";
import { checkDomainAvailability } from "../services/nameComClient.js";

/** Basic domain shape: label(.label)+.tld — purely a format gate, not a DNS lookup. */
const DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/**
 * GET /api/domains/check-custom?domain=ahmed.com
 * Public, advisory-only. A domain is taken if it's already claimed by another
 * broker, or if name.com reports it as registered. Price is always our own
 * flat lookup by TLD — name.com is only consulted for availability, never
 * for pricing.
 */
export const checkCustomDomain = async (req, res, next) => {
  try {
    const domain = String(req.query.domain ?? "")
      .trim()
      .toLowerCase();

    if (!domain || !DOMAIN_PATTERN.test(domain)) {
      return res.json({ available: false, reason: "invalid" });
    }

    if (!isAllowedCustomDomainTld(domain)) {
      return res.json({ available: false, reason: "unsupportedTld" });
    }

    const price = priceForDomain(domain);

    const existing = await brokerModel.findByCustomDomain(domain);
    if (existing) {
      return res.json({
        available: false,
        reason: "taken",
        price,
        currency: DOMAIN_CURRENCY,
      });
    }

    let availableAtRegistrar;
    try {
      availableAtRegistrar = await checkDomainAvailability(domain);
    } catch (lookupError) {
      // A broken/timed-out call to name.com must never be read as "available" —
      // fail closed and log so this doesn't silently let someone "buy" a
      // domain we never actually confirmed was free.
      console.error(
        `name.com availability check failed for ${domain}:`,
        lookupError,
      );
      return res.json({
        available: false,
        reason: "checkFailed",
        price,
        currency: DOMAIN_CURRENCY,
      });
    }

    if (!availableAtRegistrar) {
      return res.json({
        available: false,
        reason: "taken",
        price,
        currency: DOMAIN_CURRENCY,
      });
    }

    return res.json({ available: true, price, currency: DOMAIN_CURRENCY });
  } catch (error) {
    next(error);
  }
};
