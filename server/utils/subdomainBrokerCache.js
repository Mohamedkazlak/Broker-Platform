/**
 * Short TTL cache for subdomain → broker row lookups used on hot paths
 * (e.g. listing endpoint) to skip a repeated Supabase round trip per page load.
 */

const TTL_MS = 60_000;
const MAX_ENTRIES = 500;

const cache = new Map();

/** @typedef {{ expiresAt: number, broker: unknown }} CacheEntry */

/**
 * Returns broker for subdomain, using cached value when fresh.
 *
 * @param {string} subdomain
 * @param {() => Promise<unknown>} fetcher resolves to broker or null-ish
 */
export async function getBrokerBySubdomainCached(subdomain, fetcher) {
  const key =
    subdomain && typeof subdomain === "string"
      ? subdomain.toLowerCase().trim()
      : "";
  if (!key) {
    const row = await fetcher();
    return row;
  }

  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.broker;
  }

  const broker = await fetcher();
  while (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, {
    expiresAt: now + TTL_MS,
    broker,
  });

  return broker;
}
