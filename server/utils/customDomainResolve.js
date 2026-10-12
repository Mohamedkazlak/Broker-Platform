import { brokerModel } from "../models/brokerModel.js";
import { isValidCustomDomainFormat } from "../config/domains.js";
import { getBrokerByCustomDomainCached } from "./customDomainBrokerCache.js";
import {
  isPlatformHost,
  normalizeCustomDomainHost,
} from "./customDomainHost.js";

export { isPlatformHost, normalizeCustomDomainHost };

/** Cap a hung Supabase lookup so custom-domain HTML/API aren't stuck forever. */
const CUSTOM_DOMAIN_LOOKUP_TIMEOUT_MS = 4_000;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        Object.assign(new Error(`${label} timed out after ${ms}ms`), {
          status: 503,
          statusCode: 503,
        }),
      );
    }, ms);
    if (typeof timer.unref === "function") timer.unref();
  });

  // If the timeout wins, keep the underlying promise from becoming an
  // unhandled rejection when it later settles.
  void Promise.resolve(promise).catch(() => {});

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

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

  return withTimeout(
    getBrokerByCustomDomainCached(`subdomain:${key}`, () =>
      brokerModel.findActiveCustomDomainBySubdomain(key),
    ),
    CUSTOM_DOMAIN_LOOKUP_TIMEOUT_MS,
    `custom-domain subdomain lookup (${key})`,
  );
}

/**
 * Active broker for a custom domain, or null.
 *
 * Platform hosts are never looked up. The result is cached (60s hit / 30s
 * miss). Only a broker with is_active and domain_status 'active' is returned.
 * Lookups that hang longer than CUSTOM_DOMAIN_LOOKUP_TIMEOUT_MS reject with
 * status 503 — callers must not treat that as "domain unknown".
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

  return withTimeout(
    getBrokerByCustomDomainCached(domain, () =>
      brokerModel.findActiveByCustomDomain(domain),
    ),
    CUSTOM_DOMAIN_LOOKUP_TIMEOUT_MS,
    `custom-domain lookup (${domain})`,
  );
}
