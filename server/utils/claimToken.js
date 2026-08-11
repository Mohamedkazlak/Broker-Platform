import crypto from "crypto";

/**
 * Opaque tokens handed to an unauthenticated caller (draft signup, no
 * broker session yet) so a pending page can poll status without a login.
 * Only the hash is stored server-side; the raw token never touches the DB.
 * Shared by the Instapay and Reachi payment flows.
 */

export function hashClaimToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createClaimToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashClaimToken(token) };
}
