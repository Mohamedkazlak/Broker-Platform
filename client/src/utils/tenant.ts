/**
 * Tenant resolution utility.
 *
 * Detects whether the React app is running on the main marketing domain
 * (e.g. localhost, myflats.store) or on a broker-scoped subdomain (e.g.
 * ahmed.localhost, ahmed.myflats.store) — and exposes that decision to the
 * rest of the app through a single consistent shape.
 */

export type TenantType = "main" | "subdomain";

export interface TenantInfo {
  type: TenantType;
  subdomain: string | null;
  hostname: string;
}

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

const APEX_HOSTS = new Set([
  "localhost",
  "myflats.store",
  "myflats.com",
  "onrender.com",
]);

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function extractSubdomain(hostname: string): string | null {
  if (!hostname) return null;
  const host = hostname.toLowerCase().trim();

  if (host === "localhost" || host === "::1" || IP_REGEX.test(host)) {
    return null;
  }

  const parts = host.split(".");

  // foo.localhost → ["foo", "localhost"]
  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    const label = parts[0];
    if (RESERVED_LABELS.has(label)) return null;
    return label;
  }

  // Match against the longest known apex (myflats.store, onrender.com, …).
  for (let i = 0; i < parts.length - 1; i++) {
    const candidateApex = parts.slice(i).join(".");
    if (APEX_HOSTS.has(candidateApex)) {
      if (i === 0) return null; // hostname IS the apex
      const label = parts[0];
      if (RESERVED_LABELS.has(label)) return null;
      return label;
    }
  }

  // Generic fallback for other production domains: subdomain.domain.tld
  if (parts.length >= 3) {
    const label = parts[0];
    if (RESERVED_LABELS.has(label)) return null;
    return label;
  }

  return null;
}

/**
 * Resolve the tenant for the current browser window.
 * Returns `{ type: 'main', subdomain: null }` on the main site.
 * Returns `{ type: 'subdomain', subdomain: 'ahmed' }` on `ahmed.localhost`.
 *
 * Falls back to a `?broker=ahmed` query param so the app can still be
 * exercised on plain `localhost` without editing the hosts file.
 */
export function getTenant(): TenantInfo {
  if (typeof window === "undefined") {
    return { type: "main", subdomain: null, hostname: "" };
  }

  const hostname = window.location.hostname;
  let subdomain = extractSubdomain(hostname);

  if (!subdomain) {
    const params = new URLSearchParams(window.location.search);
    const override = params.get("broker");
    if (override) subdomain = override.toLowerCase();
  }

  return {
    hostname,
    subdomain,
    type: subdomain ? "subdomain" : "main",
  };
}

/** Convenience accessors. */
export function getCurrentSubdomain(): string | null {
  return getTenant().subdomain;
}

export function isSubdomainTenant(): boolean {
  return getTenant().type === "subdomain";
}

/**
 * Resolve the apex (main-site) hostname for the current browser window.
 *
 * Examples (current window → returned apex):
 *   localhost                  → localhost
 *   ahmed.localhost            → localhost
 *   myflats.store                 → myflats.store
 *   www.myflats.store             → myflats.store
 *   ahmed.myflats.store           → myflats.store
 *   foo.bar.lovable.app        → lovable.app
 *   ahmed.example.co           → example.co  (generic fallback)
 */
function resolveApexHostname(hostname: string): string {
  const host = hostname.toLowerCase().trim();
  if (!host) return host;

  if (APEX_HOSTS.has(host)) return host;
  if (host === "::1" || IP_REGEX.test(host)) return host;

  const parts = host.split(".");

  // Longest matching known apex suffix wins (handles foo.bar.myflats.store → myflats.store).
  for (let i = 0; i < parts.length; i++) {
    const candidate = parts.slice(i).join(".");
    if (APEX_HOSTS.has(candidate)) return candidate;
  }

  // foo.localhost (not in APEX_HOSTS as a multi-part) → localhost.
  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    return "localhost";
  }

  // Generic fallback: drop the leftmost label (subdomain.domain.tld → domain.tld).
  if (parts.length >= 3) {
    return parts.slice(1).join(".");
  }

  return host;
}

/**
 * Build a URL that points at a specific tenant on the same root domain
 * the user is currently on. Useful for "Go to your dashboard" links.
 */
export function buildTenantUrl(
  subdomain: string,
  pathname: string = "/",
): string {
  if (typeof window === "undefined") return pathname;

  const { protocol, port, hostname } = window.location;
  const apex = resolveApexHostname(hostname);

  const portPart = port ? `:${port}` : "";
  return `${protocol}//${subdomain}.${apex}${portPart}${pathname}`;
}

/**
 * Build a URL that points at the main (apex) site, dropping any tenant
 * subdomain the visitor is currently on.
 *
 * Example: from `nosuchbroker.localhost:8080/en/` → `http://localhost:8080/`.
 */
export function buildMainSiteUrl(pathname: string = "/"): string {
  if (typeof window === "undefined") return pathname;

  const { protocol, port, hostname } = window.location;
  const apex = resolveApexHostname(hostname);

  const portPart = port ? `:${port}` : "";
  return `${protocol}//${apex}${portPart}${pathname}`;
}
