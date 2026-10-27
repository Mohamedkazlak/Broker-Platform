/**
 * Tenant resolution utility.
 *
 * Detects whether the React app is running on the main marketing domain
 * (e.g. localhost, brokersplatform.shop) or on a broker-scoped subdomain (e.g.
 * ahmed.localhost, ahmed.brokersplatform.shop) — and exposes that decision to the
 * rest of the app through a single consistent shape.
 */

export type TenantType = "main" | "subdomain" | "custom";

export interface TenantInfo {
  type: TenantType;
  subdomain: string | null;
  hostname: string;
  /** True while a non-platform host is still being resolved. */
  pendingCustom?: boolean;
}

/** Platform apex; keep in sync with server PLATFORM_BASE_DOMAIN / APEX_HOSTS. */
export const PLATFORM_BASE_DOMAIN = (
  (import.meta.env.VITE_PLATFORM_BASE_DOMAIN as string | undefined)?.trim() ||
  "brokersplatform.shop"
).toLowerCase();

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

// Keep in sync with server/middleware/subdomain.middleware.js (APEX_HOSTS).
const APEX_HOSTS = new Set(["localhost", PLATFORM_BASE_DOMAIN, "onrender.com"]);

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

  // Match against the longest known apex (brokersplatform.shop, onrender.com, …).
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

const APEX_SUFFIXES = [PLATFORM_BASE_DOMAIN, "onrender.com"] as const;

/**
 * Platform hosts keep the existing main-site / subdomain behavior.
 * Keep in sync with server/utils/customDomainHost.js.
 */
export function isPlatformHost(host: string): boolean {
  const hostname = stripHostPort(host);
  if (!hostname) return true;
  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    IP_REGEX.test(hostname)
  ) {
    return true;
  }
  if (hostname.includes(":")) return true;
  if (APEX_HOSTS.has(hostname)) return true;

  const parts = hostname.split(".");
  if (parts[parts.length - 1] === "localhost") return true;

  for (let i = 1; i < parts.length; i++) {
    const suffix = parts.slice(i).join(".");
    if ((APEX_SUFFIXES as readonly string[]).includes(suffix)) return true;
  }
  return false;
}

function stripHostPort(host: string): string {
  const value = host.trim().toLowerCase();
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

const CUSTOM_DOMAIN_SESSION_KEY = "broker_custom_domain_host";

interface CustomDomainCacheEntry {
  host: string;
  subdomain: string | null;
}

/** Public broker row returned by /api/tenant/resolve (in-memory only). */
export type PrefetchedCustomDomainBroker = {
  id: string;
  subdomain: string;
  [key: string]: unknown;
};

let customDomainMemory: CustomDomainCacheEntry | null = null;
let customDomainInflight: Promise<CustomDomainCacheEntry> | null = null;
let prefetchedCustomDomainBroker: PrefetchedCustomDomainBroker | null = null;

function readCustomDomainCache(
  hostname: string,
): CustomDomainCacheEntry | null {
  const host = hostname.toLowerCase();
  if (customDomainMemory?.host === host) return customDomainMemory;

  try {
    const raw = window.sessionStorage.getItem(CUSTOM_DOMAIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomDomainCacheEntry;
    if (
      parsed?.host === host &&
      (parsed.subdomain === null || typeof parsed.subdomain === "string")
    ) {
      customDomainMemory = parsed;
      return parsed;
    }
  } catch {
    /* sessionStorage unavailable or unreadable */
  }
  return null;
}

function writeCustomDomainCache(entry: CustomDomainCacheEntry) {
  customDomainMemory = entry;
  try {
    window.sessionStorage.setItem(
      CUSTOM_DOMAIN_SESSION_KEY,
      JSON.stringify(entry),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/** True when this host was already resolved earlier in the session. */
export function hasResolvedCustomDomain(hostname: string): boolean {
  if (typeof window === "undefined") return false;
  return readCustomDomainCache(hostname) !== null;
}

function resolveApiBase(): string {
  const explicit = import.meta.env.VITE_API_URL as string | undefined;
  if (import.meta.env.DEV) return "/api";
  if (explicit) return explicit.replace(/\/$/, "");
  if (typeof window !== "undefined") return `${window.location.origin}/api`;
  return "/api";
}

function rememberPrefetchedBroker(
  host: string,
  body: {
    subdomain?: unknown;
    broker?: unknown;
  },
) {
  const subdomain =
    typeof body?.subdomain === "string" && body.subdomain.trim()
      ? body.subdomain.trim().toLowerCase()
      : null;

  const raw = body?.broker;
  if (
    subdomain &&
    raw &&
    typeof raw === "object" &&
    typeof (raw as PrefetchedCustomDomainBroker).id === "string" &&
    typeof (raw as PrefetchedCustomDomainBroker).subdomain === "string"
  ) {
    prefetchedCustomDomainBroker = {
      ...(raw as PrefetchedCustomDomainBroker),
      subdomain,
    };
  } else {
    prefetchedCustomDomainBroker = null;
  }

  return { host, subdomain };
}

/**
 * Broker profile from the latest successful /api/tenant/resolve for this
 * host, if any. Used to skip a second public brokers query on first paint.
 */
export function getPrefetchedCustomDomainBroker(
  subdomain: string | null | undefined,
): PrefetchedCustomDomainBroker | null {
  if (!subdomain || !prefetchedCustomDomainBroker) return null;
  if (prefetchedCustomDomainBroker.subdomain !== subdomain.toLowerCase()) {
    return null;
  }
  return prefetchedCustomDomainBroker;
}

/**
 * Resolve a non-platform host once per session.
 * Remembers `{ subdomain }` or a 404 (`subdomain: null`) in sessionStorage.
 * When the API returns a public `broker` payload, keeps it in memory for
 * BrokerProvider to consume without another network hop.
 */
/** Don't leave the SPA on a blank shell if /tenant/resolve hangs. */
const CUSTOM_DOMAIN_RESOLVE_TIMEOUT_MS = 8_000;

export function ensureBrokerCustomDomain(): Promise<CustomDomainCacheEntry | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  const host = window.location.hostname.toLowerCase();
  if (isPlatformHost(host)) return Promise.resolve(null);

  const cached = readCustomDomainCache(host);
  if (cached) return Promise.resolve(cached);

  if (!customDomainInflight) {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      CUSTOM_DOMAIN_RESOLVE_TIMEOUT_MS,
    );

    customDomainInflight = fetch(
      `${resolveApiBase()}/tenant/resolve?host=${encodeURIComponent(host)}`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    )
      .then(async (res) => {
        if (res.ok) {
          const body = (await res.json()) as {
            subdomain?: unknown;
            broker?: unknown;
          };
          const entry = rememberPrefetchedBroker(host, body);
          writeCustomDomainCache(entry);
          return entry;
        }
        if (res.status === 404) {
          prefetchedCustomDomainBroker = null;
          const entry = { host, subdomain: null };
          writeCustomDomainCache(entry);
          return entry;
        }
        // Don't remember a 429/500/503 for the whole session; a reload can retry.
        prefetchedCustomDomainBroker = null;
        const entry = { host, subdomain: null };
        customDomainMemory = entry;
        return entry;
      })
      .catch(() => {
        prefetchedCustomDomainBroker = null;
        const entry = { host, subdomain: null as string | null };
        customDomainMemory = entry;
        return entry;
      })
      .finally(() => {
        window.clearTimeout(timer);
        customDomainInflight = null;
      });
  }

  return customDomainInflight;
}

/**
 * Resolve the tenant for the current browser window.
 * Returns `{ type: 'main', subdomain: null }` on the main site.
 * Returns `{ type: 'subdomain', subdomain: 'ahmed' }` on `ahmed.localhost`.
 * Returns `{ type: 'custom', subdomain }` on an active custom domain such as
 * `kazlak.live`, after `ensureBrokerCustomDomain()` has run.
 *
 * Falls back to a `?broker=ahmed` query param so the app can still be
 * exercised on plain `localhost` without editing the hosts file.
 */
export function getTenant(): TenantInfo {
  if (typeof window === "undefined") {
    return { type: "main", subdomain: null, hostname: "" };
  }

  const hostname = window.location.hostname;
  if (!isPlatformHost(hostname)) {
    const cached = readCustomDomainCache(hostname);
    if (!cached) {
      return {
        type: "custom",
        subdomain: null,
        hostname,
        pendingCustom: true,
      };
    }
    return {
      type: "custom",
      subdomain: cached.subdomain,
      hostname,
    };
  }

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
  const tenant = getTenant();
  if (tenant.pendingCustom) return false;
  return (
    tenant.type === "subdomain" ||
    (tenant.type === "custom" && !!tenant.subdomain)
  );
}

/**
 * Resolve the apex (main-site) hostname for the current browser window.
 *
 * Examples (current window → returned apex):
 *   localhost                       → localhost
 *   ahmed.localhost                 → localhost
 *   brokersplatform.shop            → brokersplatform.shop
 *   www.brokersplatform.shop        → brokersplatform.shop
 *   ahmed.brokersplatform.shop      → brokersplatform.shop
 *   foo.bar.lovable.app             → lovable.app
 *   ahmed.example.co                → example.co  (generic fallback)
 */
function resolveApexHostname(hostname: string): string {
  const host = hostname.toLowerCase().trim();
  if (!host) return host;

  if (APEX_HOSTS.has(host)) return host;
  if (host === "::1" || IP_REGEX.test(host)) return host;

  const parts = host.split(".");

  // Longest matching known apex suffix wins (handles foo.bar.brokersplatform.shop).
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

/** Production default when a custom domain links back to the main host. */
const DEFAULT_MAIN_SITE_ORIGIN = `https://${PLATFORM_BASE_DOMAIN}`;

/**
 * Parse VITE_MAIN_SITE_ORIGIN (an origin like https://brokersplatform.shop).
 * Trailing slashes are stripped. Returns null when unset or invalid.
 */
function parseMainSiteOrigin(
  raw: string | undefined,
): { protocol: string; apex: string; portPart: string } | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!url.hostname) return null;
    return {
      protocol: url.protocol,
      apex: url.hostname,
      portPart: url.port ? `:${url.port}` : "",
    };
  } catch {
    return null;
  }
}

/**
 * Apex used when building a platform URL.
 * On a custom domain the current host is not the platform, so links back to
 * login and the main site use VITE_MAIN_SITE_ORIGIN when set, otherwise
 * https://<PLATFORM_BASE_DOMAIN>. Platform hosts keep the current window origin.
 */
function platformApexFromWindow(): {
  protocol: string;
  apex: string;
  portPart: string;
} {
  const { protocol, port, hostname } = window.location;
  if (isPlatformHost(hostname)) {
    return {
      protocol,
      apex: resolveApexHostname(hostname),
      portPart: port ? `:${port}` : "",
    };
  }
  const configured = parseMainSiteOrigin(
    import.meta.env.VITE_MAIN_SITE_ORIGIN as string | undefined,
  );
  if (configured) return configured;
  return parseMainSiteOrigin(DEFAULT_MAIN_SITE_ORIGIN)!;
}

export function buildTenantUrl(
  subdomain: string,
  pathname: string = "/",
): string {
  if (typeof window === "undefined") return pathname;

  const tenant = getTenant();
  // Already browsing this broker on their custom domain: stay there.
  if (
    tenant.type === "custom" &&
    tenant.subdomain === subdomain &&
    !tenant.pendingCustom
  ) {
    const { protocol, port, hostname } = window.location;
    const portPart = port ? `:${port}` : "";
    return `${protocol}//${hostname}${portPart}${pathname}`;
  }

  const { protocol, apex, portPart } = platformApexFromWindow();
  return `${protocol}//${subdomain}.${apex}${portPart}${pathname}`;
}

/** Fields of a broker row that decide where its public site lives. */
export interface BrokerHostFields {
  subdomain: string;
  custom_domain?: string | null;
  domain_status?: string | null;
  is_active?: boolean | null;
}

/**
 * A custom domain is live only when the broker is active and the domain
 * finished provisioning (domain_status 'active').
 * Keep in sync with server/utils/brokerPublicOrigin.js.
 */
export function hasActiveCustomDomain(
  broker: Partial<BrokerHostFields> | null | undefined,
): boolean {
  if (!broker) return false;
  const domain = String(broker.custom_domain ?? "").trim();
  return (
    !!domain && broker.domain_status === "active" && broker.is_active === true
  );
}

/**
 * The custom domain to show a broker's visitors, or null while it is not
 * active. Use this wherever the UI would otherwise show the subdomain.
 */
export function getActiveCustomDomain(
  broker: Partial<BrokerHostFields> | null | undefined,
): string | null {
  if (!hasActiveCustomDomain(broker)) return null;
  return String(broker!.custom_domain)
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

/**
 * The origin a broker's public site lives at:
 *   https://<custom_domain>      when the custom domain is active
 *   https://<subdomain>.<apex>   otherwise (the internal key and fallback)
 * Returned without a trailing slash.
 */
export function getBrokerPublicOrigin(broker: BrokerHostFields): string {
  const customDomain = getActiveCustomDomain(broker);
  if (customDomain) return `https://${customDomain}`;
  return buildTenantUrl(broker.subdomain, "");
}

/** A broker's public URL for `pathname`, on the custom domain when active. */
export function buildBrokerWebsiteUrl(
  broker: BrokerHostFields,
  pathname: string = "/",
): string {
  return `${getBrokerPublicOrigin(broker)}${pathname}`;
}

/**
 * True while browsing a broker's own custom domain (resolved, not pending).
 * Sign-in stays on this host, because the session only exists in this host's
 * browser storage. Plan change and payment do not: they run on the main host
 * (see buildMainHostRelayUrl in lib/sessionRelay.ts).
 */
export function isOnBrokerCustomDomain(): boolean {
  const tenant = getTenant();
  return (
    tenant.type === "custom" && !tenant.pendingCustom && !!tenant.subdomain
  );
}

/**
 * URL for a sign-in page. On a broker's custom domain it stays on the current
 * host; elsewhere it goes to the platform host as it always has.
 */
export function buildFlowUrl(pathname: string = "/"): string {
  if (typeof window === "undefined") return pathname;
  if (isOnBrokerCustomDomain()) {
    return `${window.location.origin}${pathname}`;
  }
  return buildMainSiteUrl(pathname);
}

/**
 * Build a URL that points at the main (apex) site, dropping any tenant
 * subdomain the visitor is currently on.
 *
 * Example: from `nosuchbroker.localhost:8080/en/` → `http://localhost:8080/`.
 */
export function buildMainSiteUrl(pathname: string = "/"): string {
  if (typeof window === "undefined") return pathname;

  const { protocol, apex, portPart } = platformApexFromWindow();
  return `${protocol}//${apex}${portPart}${pathname}`;
}
