import { brokerModel } from "../models/brokerModel.js";
import {
  priceForDomain,
  HARDCODED_TAKEN_DOMAINS,
  DOMAIN_CURRENCY,
} from "../config/domains.js";

/** Basic domain shape: label(.label)+.tld — purely a format gate, not a DNS lookup. */
const DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/**
 * GET /api/domains/check-custom?domain=ahmed.com
 * Public, advisory-only. Mocks a registrar: a domain is taken if it's in our
 * hardcoded list or already claimed by another broker. Price is a flat lookup
 * by TLD. No external/network call is ever made.
 */
export const checkCustomDomain = async (req, res, next) => {
  try {
    const domain = String(req.query.domain ?? "")
      .trim()
      .toLowerCase();

    if (!domain || !DOMAIN_PATTERN.test(domain)) {
      return res.json({ available: false, reason: "invalid" });
    }

    const price = priceForDomain(domain);

    if (HARDCODED_TAKEN_DOMAINS.includes(domain)) {
      return res.json({
        available: false,
        reason: "taken",
        price,
        currency: DOMAIN_CURRENCY,
      });
    }

    const existing = await brokerModel.findByCustomDomain(domain);
    if (existing) {
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
