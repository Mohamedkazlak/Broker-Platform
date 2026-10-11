/**
 * Short TTL cache for custom domain → broker lookups.
 *
 * A found active broker is kept for about 60 seconds. A miss (unknown
 * domain, or a broker that is not allowed to serve on that domain) is kept
 * for about 30 seconds. Database errors are not cached.
 */

const HIT_TTL_MS = 60_000;
const MISS_TTL_MS = 30_000;
const MAX_ENTRIES = 500;

const cache = new Map();
const inflight = new Map();

/**
 * @param {string} domain normalized custom domain
 * @param {() => Promise<unknown>} fetcher resolves to a broker or null
 */
export async function getBrokerByCustomDomainCached(domain, fetcher) {
  const key =
    domain && typeof domain === "string" ? domain.toLowerCase().trim() : "";
  if (!key) return null;

  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.broker;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const broker = (await fetcher()) ?? null;

    while (cache.size >= MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    cache.set(key, {
      expiresAt: Date.now() + (broker ? HIT_TTL_MS : MISS_TTL_MS),
      broker,
    });

    return broker;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}
