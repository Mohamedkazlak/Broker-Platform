import crypto from "crypto";
import {
  REACHI_BASE_URL,
  REACHI_API_KEY,
  REACHI_WEBHOOK_SECRET,
  assertReachiConfigured,
} from "../config/reachiPayment.js";

/**
 * Thin HTTP client for payment.reachi.ai's session API. Every platform talks
 * to CyberSource only through this gateway — we never see card data.
 */

/**
 * POST /api/sessions — create (or idempotently replay) a checkout session.
 *
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.amount decimal string, e.g. "300.00"
 * @param {string} [params.currency]
 * @param {string} [params.description]
 * @param {{name?:string, email?:string, phone?:string}} [params.customer]
 * @param {string} params.returnUrl
 * @param {string} [params.logoUrl]
 * @param {{name:string, quantity:number, amount:string}[]} [params.items]
 */
export async function createPaymentSession({
  orderId,
  amount,
  currency,
  description,
  customer,
  returnUrl,
  logoUrl,
  items,
}) {
  assertReachiConfigured();

  const res = await fetch(`${REACHI_BASE_URL}/api/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REACHI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order_id: orderId,
      amount,
      currency,
      description,
      customer,
      return_url: returnUrl,
      logo_url: logoUrl,
      items,
    }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // Pass through Reachi's own 4xx as-is (e.g. 400 "return_url not on an
    // allowed domain" is US sending bad input, not a gateway outage — losing
    // that distinction as a blanket 502 is exactly what turned a fixable
    // config mismatch into an opaque crash for the checkout caller). Only
    // fall back to 502 for a genuinely unexpected upstream status.
    const status = res.status >= 400 && res.status < 500 ? res.status : 502;
    throw Object.assign(
      new Error(body?.error || `Reachi session creation failed (${res.status})`),
      { status, details: body?.details },
    );
  }

  return body; // { session_id, pay_url, expires_at }
}

/**
 * POST /api/sessions/:sessionId/refund
 */
export async function refundPaymentSession(sessionId, { amount, reason }) {
  assertReachiConfigured();

  const res = await fetch(
    `${REACHI_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REACHI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, reason }),
    },
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const status = res.status >= 400 && res.status < 500 ? res.status : 502;
    throw Object.assign(
      new Error(body?.error || `Reachi refund failed (${res.status})`),
      { status, details: body?.details },
    );
  }
  return body;
}

/**
 * Verifies the `sig` query param appended to return_url. UX sanity-check
 * only — never treat a passing check here as proof of payment, only the
 * webhook is authoritative.
 */
export function verifyReturnSignature({ orderId, sessionId, status, sig }) {
  if (!REACHI_WEBHOOK_SECRET || !sig) return false;
  const expected = crypto
    .createHmac("sha256", REACHI_WEBHOOK_SECRET)
    .update(`${orderId}|${sessionId}|${status}`)
    .digest("hex");
  return safeCompare(expected, sig);
}

/**
 * Verifies X-Reachi-Signature on an incoming webhook. `rawBody` must be the
 * exact raw request bytes (Buffer or string) — never the re-serialized JSON.
 */
export function verifyWebhookSignature(rawBody, signature) {
  if (!REACHI_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto
    .createHmac("sha256", REACHI_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return safeCompare(expected, signature);
}

function safeCompare(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
