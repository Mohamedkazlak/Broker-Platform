/**
 * Where a broker's site lives, and how the old subdomain hands visitors over
 * to the broker's custom domain.
 */

/**
 * HTTP status for the old-subdomain -> custom-domain page redirect.
 * 302 while this is being rolled out (browsers do not cache it). Change to 301
 * once the setup is confirmed, so browsers and search engines remember it.
 */
export const BROKER_SUBDOMAIN_REDIRECT_STATUS = 302;

/**
 * Platform domain that broker subdomains live under. Used to build the
 * fallback https://<subdomain>.<apex> origin for brokers without an active
 * custom domain.
 */
export const PLATFORM_APEX_DOMAIN = (
  process.env.PLATFORM_APEX_DOMAIN || "myflats.store"
)
  .trim()
  .toLowerCase();

/**
 * Only hosts directly under one of these domains are redirected. Local
 * (*.localhost), IP, and staging (*.onrender.com) hosts are never redirected.
 */
export const BROKER_SUBDOMAIN_REDIRECT_APEXES = [
  PLATFORM_APEX_DOMAIN,
  "myflats.com",
];

/**
 * Requests under these paths are never redirected, so old browser tabs,
 * the API and payment-provider webhooks keep working on the subdomain.
 * "/api" already covers the webhooks mounted under it; the explicit entries
 * keep them exempt if they are ever moved.
 */
export const BROKER_SUBDOMAIN_REDIRECT_EXEMPT_PREFIXES = [
  "/api",
  "/api/webhooks",
  "/api/payments/webhook",
];
