import { brokerModel } from "../models/brokerModel.js";
import {
  DOMAIN_HELD_MESSAGE,
  paymentModel,
} from "../models/paymentModel.js";
import { DOMAIN_HOLD_TTL_MS } from "../config/domains.js";
import {
  assertOfferedCustomDomainTld,
  getLiveDomainPrice,
} from "./domainPricing.js";

/**
 * Re-check availability, lock a USD ceiling + EGP line, and confirm no other
 * live payment_sessions hold (or brokers.custom_domain claim) for this name.
 * Call once at Reachi checkout creation for a new custom-domain purchase.
 *
 * @param {string} domain
 * @param {{ excludeBrokerId?: string | null }} [options]
 * @returns {Promise<{ domain: string, priceUSD: number, priceEGP: number, holdExpiresAt: string }>}
 */
export async function lockCustomDomainForCheckout(
  domain,
  { excludeBrokerId = null } = {},
) {
  const normalized = String(domain ?? "")
    .trim()
    .toLowerCase();

  await assertOfferedCustomDomainTld(normalized);

  const taken = await brokerModel.findByCustomDomain(normalized);
  if (taken && taken.id !== excludeBrokerId) {
    throw Object.assign(new Error("Custom domain already taken"), {
      status: 409,
      reason: "taken",
    });
  }

  const liveHold = await paymentModel.findLiveHoldByCustomDomain(normalized);
  if (liveHold) {
    throw Object.assign(new Error(DOMAIN_HELD_MESSAGE), {
      status: 409,
      reason: "held",
    });
  }

  const quote = await getLiveDomainPrice(normalized);

  return {
    domain: normalized,
    priceUSD: quote.priceUSD,
    priceEGP: quote.priceEGP,
    holdExpiresAt: new Date(Date.now() + DOMAIN_HOLD_TTL_MS).toISOString(),
  };
}

/**
 * Whether this checkout is buying a new custom domain (vs renewing / keeping
 * one the broker already owns).
 */
export function isNewCustomDomainPurchase(summary, domainAlreadyOwned) {
  return (
    summary?.domainType === "custom" &&
    !!summary?.customDomain &&
    !domainAlreadyOwned
  );
}

/**
 * Apply a locked domain quote onto an order summary (plan + domain EGP only).
 */
export function applyLockedDomainQuote(summary, lock) {
  return {
    ...summary,
    customDomain: lock.domain,
    domainPrice: lock.priceEGP,
    total: summary.planPrice + lock.priceEGP,
  };
}
