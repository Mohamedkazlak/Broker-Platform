/**
 * Shared AbortSignal timeout for outbound HTTP (name.com, Render, Reachi).
 * AbortSignal.timeout is available on Node 18+ (this app's runtime).
 */

export const EXTERNAL_HTTP_TIMEOUT_MS = Number(
  process.env.EXTERNAL_HTTP_TIMEOUT_MS || 30_000,
);

/** @returns {AbortSignal} */
export function externalHttpSignal() {
  return AbortSignal.timeout(EXTERNAL_HTTP_TIMEOUT_MS);
}

export function isHttpTimeoutError(err) {
  return (
    err?.name === "TimeoutError" ||
    err?.name === "AbortError" ||
    err?.code === "ABORT_ERR"
  );
}

/**
 * @param {string} serviceLabel e.g. "name.com", "Render", "Reachi"
 * @param {unknown} err
 * @returns {Error}
 */
export function httpTimeoutError(serviceLabel, err) {
  return Object.assign(
    new Error(
      `${serviceLabel} request timed out after ${EXTERNAL_HTTP_TIMEOUT_MS}ms`,
    ),
    { status: 504, cause: err },
  );
}
