/**
 * Host classification for custom domains.
 *
 * A host is a platform host when it is the main site, a broker subdomain of
 * that site, localhost, an IP, or an onrender.com host. Anything else may be
 * a broker custom domain.
 *
 * Keep these rules in sync with isPlatformHost / normalizeCustomDomainHost
 * in client/src/utils/tenant.ts.
 */

import { PLATFORM_BASE_DOMAIN } from "../config/domains.js";

const APEX_HOSTS = new Set([
  "localhost",
  PLATFORM_BASE_DOMAIN,
  "onrender.com",
]);

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

/** Lowercase and drop a trailing :port. Leaves IPv6 untouched. */
export function stripHostPort(host) {
  const value = String(host ?? "")
    .trim()
    .toLowerCase();
  if (!value) return "";
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end === -1 ? value : value.slice(1, end);
  }
  const colon = value.indexOf(":");
  if (colon !== -1 && value.indexOf(":", colon + 1) === -1) {
    return value.slice(0, colon);
  }
  return value;
}

/**
 * True for brokersplatform.shop, www.brokersplatform.shop, any subdomain of
 * the platform apex, localhost (including *.localhost), an IP address, or
 * any onrender.com host.
 */
export function isPlatformHost(host) {
  const hostname = stripHostPort(host);
  if (!hostname) return true;
  if (hostname === "localhost" || hostname === "::1" || IP_REGEX.test(hostname)) {
    return true;
  }
  if (hostname.includes(":")) return true;
  if (APEX_HOSTS.has(hostname)) return true;

  const parts = hostname.split(".");
  if (parts[parts.length - 1] === "localhost") return true;

  for (let i = 1; i < parts.length; i++) {
    if (APEX_HOSTS.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

/**
 * Lookup key for brokers.custom_domain: lowercase, no port, one leading
 * "www." removed. www.kazlak.live and kazlak.live share one key.
 */
export function normalizeCustomDomainHost(host) {
  let hostname = stripHostPort(host);
  if (hostname.startsWith("www.")) hostname = hostname.slice(4);
  return hostname;
}
