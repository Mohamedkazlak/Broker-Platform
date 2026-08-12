import { PLANS_BY_ID } from "../config/plans.js";
import { priceForDomain, DOMAIN_CURRENCY } from "../config/domains.js";

/**
 * Compute an order total from server-side config only: the plan price plus the
 * mock domain price (re-derived from the flat TLD table when the order includes
 * a custom domain). Never trusts client input.
 *
 * Takes a broker-shaped object, so it works both for a broker row as it stands
 * and for a hypothetical one (a requested plan change) built by spreading the
 * requested package / domain over the current row.
 */
export function buildOrderSummary(order) {
  const plan = PLANS_BY_ID[order.package] ?? null;
  const planPrice = plan?.price ?? 0;
  const isCustom = order.domain_type === "custom" && !!order.custom_domain;
  const domainPrice = isCustom ? priceForDomain(order.custom_domain) : 0;

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
