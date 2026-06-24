/**
 * Subdomain validation shared by the availability check and the create flow.
 *
 * The frontend mirrors these rules for instant feedback, but this module is the
 * authoritative server-side check — never trust that the client validated.
 */

/**
 * Names that must never be claimed as a tenant subdomain because they collide
 * with platform infrastructure / routing or are otherwise sensitive.
 */
export const RESERVED_SUBDOMAINS = [
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "support",
  "dashboard",
  "staging",
  "blog",
  "status",
  "cdn",
  "assets",
  "static",
  "ftp",
  "smtp",
  "root",
  "broker",
  "tenant",
  "billing",
  "help",
  "docs",
];

/**
 * Valid DNS label: 3–63 chars, alphanumeric + hyphen, no leading/trailing
 * hyphen. (Single-char labels are also allowed by this pattern.)
 */
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

/**
 * Validates and normalizes a candidate subdomain.
 *
 * @param {string} input - raw user input
 * @returns {{ valid: false, reason: 'invalid' | 'reserved' } | { valid: true, normalized: string }}
 */
export function validateSubdomainFormat(input) {
  const normalized = String(input ?? "")
    .trim()
    .toLowerCase();

  if (!SUBDOMAIN_PATTERN.test(normalized)) {
    return { valid: false, reason: "invalid" };
  }

  if (RESERVED_SUBDOMAINS.includes(normalized)) {
    return { valid: false, reason: "reserved" };
  }

  return { valid: true, normalized };
}
