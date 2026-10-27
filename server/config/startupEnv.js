/**
 * Boot-time env validation for domain purchase + payments.
 * Hard-fails when required keys are missing; warns loudly on sandbox/prod
 * mismatches so we never silently buy domains or take payments in the wrong
 * environment.
 */

const REQUIRED_ENV = [
  "NAME_COM_API_USERNAME",
  "NAME_COM_API_TOKEN",
  "NAME_COM_BASE_URL",
  "RENDER_API_KEY",
  "RENDER_SERVICE_ID",
  "RENDER_CNAME_TARGET",
  "REACHI_PLATFORM_API_KEY",
  "REACHI_PLATFORM_WEBHOOK_SECRET",
];

const NAME_COM_PROD_HOST = "api.name.com";
const NAME_COM_SANDBOX_HOST = "api.dev.name.com";
const REACHI_PROD_HOST = "payment.reachi.ai";

function hostnameOf(urlLike) {
  try {
    const withScheme = /^https?:\/\//i.test(urlLike)
      ? urlLike
      : `https://${urlLike}`;
    return new URL(withScheme).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function looksLikeNameComSandbox(baseUrl) {
  const host = hostnameOf(baseUrl);
  return (
    host === NAME_COM_SANDBOX_HOST ||
    host.includes("api.dev.name.com") ||
    host.includes("ote") ||
    /\.dev\.name\.com$/i.test(host)
  );
}

function looksLikeNameComProduction(baseUrl) {
  return hostnameOf(baseUrl) === NAME_COM_PROD_HOST;
}

/**
 * Reachi has no dedicated sandbox flag. Production gateway host is
 * payment.reachi.ai. Anything else (localhost, staging, alternate host) is
 * treated as non-production for the NODE_ENV mismatch warning.
 *
 * Simplest safe switch: set REACHI_PAYMENT_BASE_URL explicitly.
 *   production → https://payment.reachi.ai
 *   local/test → your test gateway origin (never the prod host)
 */
function isReachiProductionUrl(baseUrl) {
  return hostnameOf(baseUrl) === REACHI_PROD_HOST;
}

/**
 * Throws (process should exit) when any required domain/payment env var is
 * missing or blank.
 */
export function assertRequiredDomainPaymentEnv() {
  const missing = REQUIRED_ENV.filter((key) => {
    const value = process.env[key];
    return value == null || String(value).trim() === "";
  });

  if (missing.length === 0) return;

  throw new Error(
    `Missing required environment variable(s): ${missing.join(", ")}. ` +
      "Domain purchase and payments cannot start without them.",
  );
}

/**
 * Loud console warnings for name.com OT&E vs production and Reachi base URL
 * vs NODE_ENV. Does not throw — operators may intentionally test in prod
 * builds, but the mismatch must be impossible to miss in logs.
 */
export function warnEnvSandboxMismatches() {
  const isProduction = process.env.NODE_ENV === "production";
  const nameComBase = process.env.NAME_COM_BASE_URL || "";
  const reachiBase =
    process.env.REACHI_PAYMENT_BASE_URL || "https://payment.reachi.ai";

  if (isProduction && looksLikeNameComSandbox(nameComBase)) {
    console.error(
      "❌ [config] NODE_ENV=production but NAME_COM_BASE_URL looks like the " +
        `name.com OT&E/sandbox API (${nameComBase}). ` +
        `Production should use https://${NAME_COM_PROD_HOST}/v4.`,
    );
  }

  if (
    !isProduction &&
    nameComBase &&
    looksLikeNameComProduction(nameComBase) &&
    !looksLikeNameComSandbox(nameComBase)
  ) {
    console.error(
      "❌ [config] NODE_ENV is not production but NAME_COM_BASE_URL looks like " +
        `the live name.com API (${nameComBase}). ` +
        `OT&E/sandbox is https://${NAME_COM_SANDBOX_HOST}/v4 — confirm this is intentional.`,
    );
  }

  if (isProduction && !isReachiProductionUrl(reachiBase)) {
    console.error(
      "❌ [config] NODE_ENV=production but REACHI_PAYMENT_BASE_URL is not the " +
        `production gateway (${reachiBase}). Expected host ${REACHI_PROD_HOST}. ` +
        "Set REACHI_PAYMENT_BASE_URL=https://payment.reachi.ai for live card payments.",
    );
  }

  if (!isProduction && isReachiProductionUrl(reachiBase)) {
    console.error(
      "❌ [config] NODE_ENV is not production but REACHI_PAYMENT_BASE_URL points at " +
        `the live Reachi gateway (${reachiBase}). ` +
        "Point REACHI_PAYMENT_BASE_URL at your test/staging payment origin, " +
        "or keep NODE_ENV=production only on the live deploy.",
    );
  }
}

/**
 * Run hard requirements then sandbox/prod warnings. Call once at boot
 * before accepting traffic.
 */
export function runStartupEnvChecks() {
  assertRequiredDomainPaymentEnv();
  warnEnvSandboxMismatches();
}
