import { PLATFORM_APEX_DOMAIN } from "../config/brokerHost.js";

/**
 * A broker's custom domain is live only when the broker is active and the
 * domain finished provisioning (domain_status 'active').
 *
 * @param {{ custom_domain?: string|null, domain_status?: string|null, is_active?: boolean|null } | null | undefined} broker
 */
export function hasActiveCustomDomain(broker) {
  if (!broker) return false;
  const domain = String(broker.custom_domain ?? "").trim();
  return !!domain && broker.domain_status === "active" && broker.is_active === true;
}

/**
 * The origin visitors should use for a broker's site:
 *   https://<custom_domain>             when the custom domain is active
 *   https://<subdomain>.<platform apex> otherwise
 *
 * The subdomain stays the broker's internal key and fallback; it is not
 * changed or removed.
 *
 * @param {{ subdomain: string, custom_domain?: string|null, domain_status?: string|null, is_active?: boolean|null }} broker
 * @returns {string} origin without a trailing slash
 */
export function getBrokerPublicOrigin(broker) {
  if (hasActiveCustomDomain(broker)) {
    const domain = String(broker.custom_domain)
      .trim()
      .toLowerCase()
      .replace(/^www\./, "");
    return `https://${domain}`;
  }
  return `https://${broker.subdomain}.${PLATFORM_APEX_DOMAIN}`;
}
