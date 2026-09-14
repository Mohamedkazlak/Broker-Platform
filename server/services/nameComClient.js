import {
  NAME_COM_BASE_URL,
  NAME_COM_API_USERNAME,
  NAME_COM_API_TOKEN,
  assertNameComConfigured,
} from "../config/nameCom.js";

/**
 * Thin HTTP client for name.com's Reseller API. Used only to ask "is this
 * domain actually free to register?" — we never buy/register anything here
 * and we never use name.com's pricing (see server/config/domains.js for the
 * flat EGP price table that stays authoritative).
 */

/**
 * POST /v4/domains:checkAvailability for a single domain.
 *
 * @param {string} domain e.g. "ahmed.com"
 * @returns {Promise<boolean>} true if name.com reports the domain as
 *   purchasable (i.e. free to register), false otherwise.
 */
export async function checkDomainAvailability(domain) {
  assertNameComConfigured();

  const res = await fetch(`${NAME_COM_BASE_URL}/domains:checkAvailability`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${NAME_COM_API_USERNAME}:${NAME_COM_API_TOKEN}`).toString(
          "base64",
        ),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domainNames: [domain] }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // Pass through name.com's own 4xx as-is (e.g. 400 "invalid domain name"
    // is US sending bad input, not an outage on their end) — only fall back
    // to 502 for a genuinely unexpected upstream status.
    const status = res.status >= 400 && res.status < 500 ? res.status : 502;
    throw Object.assign(
      new Error(
        body?.message || `name.com availability check failed (${res.status})`,
      ),
      { status, details: body?.details },
    );
  }

  const result = body?.results?.find(
    (r) => String(r?.domainName ?? "").toLowerCase() === domain.toLowerCase(),
  );

  if (!result) {
    throw new Error(
      `name.com availability response didn't include a result for ${domain}`,
    );
  }

  return Boolean(result.purchasable);
}
