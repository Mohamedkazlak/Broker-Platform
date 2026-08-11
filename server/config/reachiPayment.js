/**
 * Config for payment.reachi.ai — the shared checkout + CyberSource gateway
 * used by every Reachi platform. See the integration README this was built
 * from for the full HTTP contract.
 *
 * REACHI_PLATFORM_API_KEY / REACHI_PLATFORM_WEBHOOK_SECRET are provisioned
 * by whoever runs payment.reachi.ai (not self-service) — ask them to run
 * `flask create-platform <slug> "<name>" --webhook-url <APP_URL>/api/payments/webhook
 * --allowed-return-domain <APP_URL's host>` and hand you the two values.
 */

export const REACHI_BASE_URL = (
  process.env.REACHI_PAYMENT_BASE_URL || "https://payment.reachi.ai"
).replace(/\/+$/, "");

export const REACHI_API_KEY = process.env.REACHI_PLATFORM_API_KEY || "";

export const REACHI_WEBHOOK_SECRET =
  process.env.REACHI_PLATFORM_WEBHOOK_SECRET || "";

/** This app's own public origin — used to build return_url/logo_url. */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/+$/, "");

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
