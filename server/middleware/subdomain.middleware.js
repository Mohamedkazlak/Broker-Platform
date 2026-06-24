/**
 * Subdomain extraction middleware.
 *
 * Reads the request hostname (and the explicit X-Tenant-Subdomain header as a
 * fallback for proxied / cross-origin requests) and decides whether the request
 * targets the main marketing platform or a broker-scoped subdomain (tenant).
 *
 * Attaches:
 *   req.hostnameRaw    string  — the raw hostname (no port)
 *   req.subdomain      string|null  — e.g. "ahmed", or null for the main site
 *   req.tenantType     "main" | "subdomain"
 *
 * Examples:
 *   ahmed.localhost          → { subdomain: "ahmed", tenantType: "subdomain" }
 *   localhost                → { subdomain: null,    tenantType: "main"      }
 *   127.0.0.1                → { subdomain: null,    tenantType: "main"      }
 *   ahmed.myflat.com         → { subdomain: "ahmed", tenantType: "subdomain" }
 *   www.myflat.com           → { subdomain: null,    tenantType: "main"      }
 *   myflat.com               → { subdomain: null,    tenantType: "main"      }
 */

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
const APEX_HOSTS = new Set(["localhost", "myflat.com", "onrender.com"]);

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
  // e.g. "ahmed.myflat.com" → apex "myflat.com" → subdomain "ahmed".
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

export function subdomainMiddleware(req, _res, next) {
  // req.hostname strips the port; fall back to the Host header if missing.
  const rawHost =
    req.hostname || (req.headers.host ? req.headers.host.split(":")[0] : "");

  let subdomain = extractSubdomain(rawHost);

  // Header fallback — useful when a reverse proxy / Vite dev proxy rewrites
  // the Host (it shouldn't, but we double-check for reliability).
  if (!subdomain) {
    const headerSub = req.headers["x-tenant-subdomain"];
    if (typeof headerSub === "string" && headerSub.trim()) {
      subdomain = headerSub.trim().toLowerCase();
    }
  }

  req.hostnameRaw = rawHost;
  req.subdomain = subdomain || null;
  req.tenantType = subdomain ? "subdomain" : "main";

  next();
}

export default subdomainMiddleware;
