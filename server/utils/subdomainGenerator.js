import crypto from "crypto";
import { validateSubdomainFormat } from "./subdomainValidator.js";

/** Prefix for provisional subdomains assigned at signup before plan selection. */
export const PENDING_SUBDOMAIN_PREFIX = "p-";

export function isPendingSubdomain(subdomain) {
  return (
    typeof subdomain === "string" &&
    subdomain.startsWith(PENDING_SUBDOMAIN_PREFIX)
  );
}

/** Unique placeholder stored at registration until a real subdomain is assigned. */
export function createPendingSubdomain() {
  return `${PENDING_SUBDOMAIN_PREFIX}${crypto.randomBytes(8).toString("hex")}`;
}

function randomAlphanumeric(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function sanitizeFirstNameForSubdomain(firstName) {
  const base = String(firstName ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (base.length === 0) return "user";
  // Leave room for "-" + 6-char suffix within the 63-char DNS limit.
  return base.slice(0, 56);
}

/**
 * Builds a default subdomain: {firstName}-{randomAlphanumeric}.
 * Retries with a fresh suffix if the candidate is taken or invalid.
 */
export async function generateDefaultSubdomain(firstName, findIdBySubdomain) {
  const prefix = sanitizeFirstNameForSubdomain(firstName);

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${prefix}-${randomAlphanumeric(6)}`;
    const check = validateSubdomainFormat(candidate);
    if (!check.valid) continue;

    const existing = await findIdBySubdomain(check.normalized);
    if (!existing) return check.normalized;
  }

  throw new Error("Could not generate a unique default subdomain");
}
