import { PLANS_BY_ID } from "../config/plans.js";
import { DOMAIN_CURRENCY } from "../config/domains.js";
import { quoteDomainForOrder } from "../services/domainPricing.js";

/**
 * Compute an order total from server-side config only: the plan price plus
 * the custom-domain fee (live name.com quote for a new registration, TLD
 * catalog / flat fallback when the broker already holds the name). Never
 * trusts client input.
 *
 * Takes a broker-shaped object, so it works both for a broker row as it stands
 * and for a hypothetical one (a requested plan change) built by spreading the
 * requested package / domain over the current row.
 *
 * @param {object} order
 * @param {{ domainAlreadyOwned?: boolean }} [options]
 */
export async function buildOrderSummary(order, { domainAlreadyOwned = false } = {}) {
  const plan = PLANS_BY_ID[order.package] ?? null;
  const planPrice = plan?.price ?? 0;
  const isCustom = order.domain_type === "custom" && !!order.custom_domain;
  let domainPrice = 0;

  if (isCustom) {
    const quote = await quoteDomainForOrder(order.custom_domain, {
      alreadyOwned: domainAlreadyOwned,
    });
    domainPrice = quote.priceEGP;
  }

  return {
    package: order.package,
    planName: plan?.name ?? order.package,
    planPrice,
    currency: plan?.currency ?? DOMAIN_CURRENCY,
    domainType: order.domain_type,
    customDomain: isCustom ? order.custom_domain : null,
    domainPrice,
    total: planPrice + domainPrice,
  };
}

/**
 * Same totals as buildOrderSummary, from a registration domain payload.
 */
export async function buildRegistrationOrderSummary(pkg, domain) {
  const isCustom = domain?.domain_type === "custom" && !!domain?.custom_domain;
  return buildOrderSummary({
    package: pkg,
    domain_type: domain?.domain_type ?? "subdomain",
    custom_domain: isCustom ? domain.custom_domain : null,
  });
}
