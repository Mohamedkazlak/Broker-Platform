/**
 * Config for payment.reachi.ai — the shared checkout + CyberSource gateway
 * used by every Reachi platform. See the integration README this was built
 * from for the full HTTP contract.
 *
 * REACHI_PLATFORM_API_KEY / REACHI_PLATFORM_WEBHOOK_SECRET are provisioned
 * by whoever runs payment.reachi.ai (not self-service) — ask them to run
 * `flask create-platform <slug> "<name>" --webhook-url <APP_URL>/api/payments/webhook
 * --allowed-return-domain <APP_URL's host>` and hand you the two values.
 *
 * Production / test switch (Reachi has no sandbox flag):
 *   Set REACHI_PAYMENT_BASE_URL explicitly.
 *   - Live:   https://payment.reachi.ai
 *   - Test:   your test/staging payment origin (never the live host)
 *   Boot warns when NODE_ENV and this URL disagree (see startupEnv.js).
 */

export const REACHI_BASE_URL = (
  process.env.REACHI_PAYMENT_BASE_URL || "https://payment.reachi.ai"
).replace(/\/+$/, "");

export const REACHI_API_KEY = process.env.REACHI_PLATFORM_API_KEY || "";

export const REACHI_WEBHOOK_SECRET =
  process.env.REACHI_PLATFORM_WEBHOOK_SECRET || "";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * This app's own public origin (the main host, e.g. https://brokersplatform.shop) —
 * used to build the payment return_url. This is the only origin the payment
 * gateway needs registered; broker custom domains never are.
 *
 * Read from NEXT_PUBLIC_APP_URL. Outside production it falls back to
 * localhost; in production it never does (it stays empty and fails loudly).
 */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (IS_PRODUCTION ? "" : "http://localhost:3000")
).replace(/\/+$/, "");

const APP_URL_MISSING_MESSAGE =
  "NEXT_PUBLIC_APP_URL is not set. In production it must be the main host's origin " +
  "(for example https://brokersplatform.shop); payment return URLs cannot be built without it.";

/** Logs once at startup when production has no APP_URL. */
export function logAppUrlStatus() {
  if (IS_PRODUCTION && !APP_URL) {
    console.error(`❌ [config] ${APP_URL_MISSING_MESSAGE}`);
  }
}

/** Throws a 503 (and logs) when production has no APP_URL. Returns APP_URL. */
export function requireAppUrl() {
  if (IS_PRODUCTION && !APP_URL) {
    console.error(`❌ [payments] ${APP_URL_MISSING_MESSAGE}`);
    throw Object.assign(new Error("Payment return URL is not configured"), {
      status: 503,
    });
  }
  return APP_URL;
}

export function assertReachiConfigured() {
  if (!REACHI_API_KEY || !REACHI_WEBHOOK_SECRET) {
    throw Object.assign(
      new Error(
        "Payment gateway is not configured (REACHI_PLATFORM_API_KEY / REACHI_PLATFORM_WEBHOOK_SECRET missing). " +
          "Ask whoever runs payment.reachi.ai to provision this platform.",
      ),
      { status: 503 },
    );
  }
}
