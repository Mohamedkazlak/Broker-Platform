/**
 * Subdomain extraction middleware.
 *
 * Reads the request hostname (and the explicit X-Tenant-Subdomain header as a
 * fallback for proxied / cross-origin requests) and decides whether the request
 * targets the main marketing platform, a broker subdomain, or a broker custom
 * domain.
 *
 * Attaches:
 *   req.hostnameRaw    string  — the raw hostname (no port)
 *   req.subdomain      string|null  — the broker's subdomain, or null on the main site
 *   req.tenantType     "main" | "subdomain" | "custom"
 *
 * Examples:
 *   ahmed.localhost          → { subdomain: "ahmed", tenantType: "subdomain" }
 *   localhost                → { subdomain: null,    tenantType: "main"      }
 *   127.0.0.1                → { subdomain: null,    tenantType: "main"      }
 *   ahmed.myflats.store      → { subdomain: "ahmed", tenantType: "subdomain" }
 *   www.myflats.store        → { subdomain: null,    tenantType: "main"      }
 *   myflats.store            → { subdomain: null,    tenantType: "main"      }
 *   kazlak.live              → { subdomain: <that broker's subdomain>, tenantType: "custom" }
 *                              when brokers.custom_domain matches and the broker
 *                              is_active with domain_status 'active'; otherwise
 *                              the same result as before this check.
 */

import { isPlatformHost } from "../utils/customDomainHost.js";
import { resolveActiveCustomDomain } from "../utils/customDomainResolve.js";

// Hostnames that are NEVER tenants, even if they appear as a subdomain label.
const RESERVED_LABELS = new Set([
  "www",
  "api",
  "app",
  "admin",
  "static",
  "cdn",
  "assets",
  "mail",
  "broker-platform-957u",
]);

// Domains that are treated as the apex (main) host. Anything to the left of
// these is considered the tenant subdomain.
const APEX_HOSTS = new Set([
  "localhost",
  "myflats.store",
  "myflats.com",
  "onrender.com",
]);

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function extractSubdomain(hostname) {
  if (!hostname) return null;

  const host = hostname.toLowerCase().trim();

  // Bare IPs and `localhost` alone are always the main platform.
  if (host === "localhost" || IP_REGEX.test(host) || host === "::1") {
    return null;
  }

  const parts = host.split(".");

  // foo.localhost  → ["foo", "localhost"]
  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    const label = parts[0];
    if (RESERVED_LABELS.has(label)) return null;
    return label;
  }

  // Find the apex match: the longest suffix that is in APEX_HOSTS.
  // e.g. "ahmed.myflats.store" → apex "myflats.store" → subdomain "ahmed".
  for (let i = 0; i < parts.length - 1; i++) {
    const candidateApex = parts.slice(i).join(".");
    if (APEX_HOSTS.has(candidateApex)) {
      if (i === 0) return null; // hostname IS the apex
      const label = parts[0];
      if (RESERVED_LABELS.has(label)) return null;
      return label;
    }
  }

  // Generic fallback: subdomain.domain.tld
  if (parts.length >= 3) {
    const label = parts[0];
    if (RESERVED_LABELS.has(label)) return null;
    return label;
  }

  return null;
}

function applyPlatformHost(req, rawHost) {
  let subdomain = extractSubdomain(rawHost);

  // Header fallback — useful when a reverse proxy / Vite dev proxy rewrites
  // the Host (it shouldn't, but we double-check for reliability).
  // Not used once a custom domain has already resolved to a broker: that
  // broker comes only from brokers.custom_domain.
  if (!subdomain) {
    const headerSub = req.headers["x-tenant-subdomain"];
    if (typeof headerSub === "string" && headerSub.trim()) {
      subdomain = headerSub.trim().toLowerCase();
    }
  }

  req.hostnameRaw = rawHost;
  req.subdomain = subdomain || null;
  req.tenantType = subdomain ? "subdomain" : "main";
}

/**
 * Fingerprinted Vite assets and favicons never need a broker row. Looking them
 * up in Supabase on every cold cache miss added seconds to the main JS download
 * on custom domains and left visitors staring at an empty #root.
 */
function isStaticAssetPath(pathname) {
  const path = String(pathname || "");
  return (
    path.startsWith("/assets/") ||
    path === "/icon.ico" ||
    path === "/favicon.ico" ||
    path === "/robots.txt"
  );
}

export async function subdomainMiddleware(req, _res, next) {
  // req.hostname strips the port; fall back to the Host header if missing.
  const rawHost =
    req.hostname || (req.headers.host ? req.headers.host.split(":")[0] : "");

  if (isStaticAssetPath(req.path)) {
    req.hostnameRaw = rawHost;
    req.subdomain = null;
    req.tenantType = "main";
    return next();
  }

  try {
    if (!isPlatformHost(rawHost)) {
      let broker = null;
      try {
        broker = await resolveActiveCustomDomain(rawHost);
      } catch (err) {
        // Soft-fail: still serve HTML/API. A hung Supabase lookup must not
        // leave the visitor on a blank document while middleware waits.
        console.warn(
          `[subdomain] custom-domain resolve failed for ${rawHost}:`,
          err?.message || err,
        );
      }
      if (broker?.subdomain) {
        req.hostnameRaw = rawHost;
        req.subdomain = broker.subdomain;
        req.tenantType = "custom";
        return next();
      }

      // Not an active custom domain. Keep today's platform/subdomain result,
      // but do not trust X-Tenant-Subdomain: that header could name a
      // different broker than the one this domain belongs to.
      const subdomain = extractSubdomain(rawHost);
      req.hostnameRaw = rawHost;
      req.subdomain = subdomain || null;
      req.tenantType = subdomain ? "subdomain" : "main";
      return next();
    }
  } catch (error) {
    return next(error);
  }

  applyPlatformHost(req, rawHost);
  next();
}

export default subdomainMiddleware;
