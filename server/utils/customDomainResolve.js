import { brokerModel } from "../models/brokerModel.js";
import { isValidCustomDomainFormat } from "../config/domains.js";
import { getBrokerByCustomDomainCached } from "./customDomainBrokerCache.js";
import {
  isPlatformHost,
  normalizeCustomDomainHost,
} from "./customDomainHost.js";

export { isPlatformHost, normalizeCustomDomainHost };

/**
 * Active broker for a custom domain, or null.
 *
 * Platform hosts are never looked up. The result is cached (60s hit / 30s
 * miss). Only a broker with is_active and domain_status 'active' is returned.
 *
 * @param {string} host raw host, Host header, or origin hostname
 * @returns {Promise<{ id: string, subdomain: string } | null>}
 */
export async function resolveActiveCustomDomain(host) {
  if (isPlatformHost(host)) return null;

  const domain = normalizeCustomDomainHost(host);
  if (!domain || isPlatformHost(domain) || !isValidCustomDomainFormat(domain)) {
    return null;
  }

  return getBrokerByCustomDomainCached(domain, () =>
    brokerModel.findActiveByCustomDomain(domain),
  );
}
