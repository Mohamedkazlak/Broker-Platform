/**
 * Live USD→EGP exchange rate, used to convert name.com's USD domain prices
 * into what we show (and bill) in EGP (see server/services/domainPricing.js).
 *
 * Source: https://open.er-api.com/v6/latest/USD — ExchangeRate-API's free
 * endpoint, no API key. Cached in memory for an hour so pricing checks
 * (which can fire on every keystroke of a domain search) don't hammer it.
 */

const RATE_API_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedRate = null;
let cachedAt = 0;

async function fetchUsdToEgpRate() {
  const res = await fetch(RATE_API_URL);
  const body = await res.json().catch(() => null);

  if (!res.ok || body?.result !== "success") {
    throw new Error(
      `Exchange rate lookup failed (${res.status}): ${
        body?.["error-type"] ?? "unexpected response"
      }`,
    );
  }

  const rate = body?.rates?.EGP;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(
      "Exchange rate response didn't include a usable USD→EGP rate",
    );
  }

  return rate;
}

/**
 * The current USD→EGP rate, refreshing the cache if it's missing or older
 * than an hour.
 *
 * If a refresh fails but we already have a (stale) cached rate, that stale
 * rate is returned rather than failing outright — a temporary blip in the
 * rate API shouldn't take down domain pricing. Only when there has never been
 * a successful fetch does this throw, so callers never silently fall back to
 * a guessed rate.
 *
 * @returns {Promise<number>}
 */
export async function getUsdToEgpRate() {
  const isStale = Date.now() - cachedAt > CACHE_TTL_MS;

  if (cachedRate !== null && !isStale) {
    return cachedRate;
  }

  try {
    const rate = await fetchUsdToEgpRate();
    cachedRate = rate;
    cachedAt = Date.now();
    return cachedRate;
  } catch (error) {
    if (cachedRate !== null) {
      console.error(
        "Failed to refresh USD→EGP exchange rate, serving stale cached value:",
        error,
      );
      return cachedRate;
    }

    throw Object.assign(
      new Error(`Unable to fetch USD→EGP exchange rate: ${error.message}`),
      { status: 502 },
    );
  }
}
