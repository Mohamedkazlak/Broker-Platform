import { brokerModel } from "../models/brokerModel.js";
import { isValidCustomDomainFormat } from "../config/domains.js";
import { getBrokerByCustomDomainCached } from "./customDomainBrokerCache.js";
import {
  isPlatformHost,
  normalizeCustomDomainHost,
} from "./customDomainHost.js";

export { isPlatformHost, normalizeCustomDomainHost };

/**
 * Active custom domain of the broker that owns a subdomain, or null.
 *
 * Shares the cache (TTL, miss caching, in-flight de-duplication) with
 * resolveActiveCustomDomain, so a busy subdomain costs at most one database
 * query per TTL window. Keys are prefixed with "subdomain:", which can never
 * collide with a hostname because hostnames cannot contain ":".
 *
 * @param {string} subdomain
 * @returns {Promise<{ id: string, subdomain: string, custom_domain: string, domain_status: string, is_active: boolean } | null>}
 */
export async function resolveActiveCustomDomainForSubdomain(subdomain) {
  const key = String(subdomain ?? "")
    .trim()
    .toLowerCase();
  if (!key) return null;

  return getBrokerByCustomDomainCached(`subdomain:${key}`, () =>
    brokerModel.findActiveCustomDomainBySubdomain(key),
  );
}

/**
 * Active broker for a custom domain, or null.
 *
 * Platform hosts are never looked up. The result is cached (60s hit / 30s
 * miss). Only a broker with is_active and domain_status 'active' is returned.
 *
 * @param {string} host raw host, Host header, or origin hostname
 * @returns {Promise<(Record<string, unknown> & { id: string, subdomain: string }) | null>}
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
