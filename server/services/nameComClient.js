import {
  NAME_COM_BASE_URL,
  NAME_COM_ORIGIN,
  assertNameComConfigured,
  nameComAuthHeaders,
} from "../config/nameCom.js";

/**
 * Thin HTTP client for name.com's Reseller API — availability/price checks,
 * domain registration, and DNS record creation.
 */

const TLD_PRICING_PER_PAGE = 100;
const TLD_PRICING_MAX_PAGES = 40;

function nameComStatus(res) {
  // Pass through name.com's own 4xx as-is (e.g. 400 "invalid domain name"
  // is us sending bad input, not an outage on their end) — only fall back
  // to 502 for a genuinely unexpected upstream status.
  return res.status >= 400 && res.status < 500 ? res.status : 502;
}

/**
 * POST /v4/domains:checkAvailability for a single domain.
 *
 * @param {string} domain e.g. "ahmed.com"
 * @returns {Promise<{ purchasable: boolean, priceUsd: number | null }>}
 *   `purchasable` is true if name.com reports the domain as free to
 *   register. `priceUsd` is name.com's own purchase price for it (USD, no
 *   markup applied), taken from this same response — null when name.com
 *   didn't include one (e.g. the domain isn't purchasable).
 */
export async function checkDomainAvailability(domain) {
  assertNameComConfigured();

  const res = await fetch(`${NAME_COM_BASE_URL}/domains:checkAvailability`, {
    method: "POST",
    headers: nameComAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ domainNames: [domain] }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw Object.assign(
      new Error(
        body?.message || `name.com availability check failed (${res.status})`,
      ),
      { status: nameComStatus(res), details: body?.details },
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

  const rawPrice = result.purchasePrice;
  const parsedPrice =
    typeof rawPrice === "number" ? rawPrice : Number(rawPrice);

  return {
    purchasable: Boolean(result.purchasable),
    priceUsd:
      Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null,
  };
}

/**
 * GET /core/v1/tldpricing — every TLD name.com sells, with 1-year account
 * registration prices in USD. Paginates until lastPage. Entries whose
 * registrationPrice is null are omitted (name.com is not taking registrations
 * for that TLD).
 *
 * @returns {Promise<Array<{ tld: string, priceUsd: number }>>}
 */
export async function listTldRegistrationPrices() {
  assertNameComConfigured();

  const collected = [];
  let page = 1;
  let lastPage = 1;

  while (page <= lastPage && page <= TLD_PRICING_MAX_PAGES) {
    const url = new URL(`${NAME_COM_ORIGIN}/core/v1/tldpricing`);
    url.searchParams.set("perPage", String(TLD_PRICING_PER_PAGE));
    url.searchParams.set("duration", "1");
    url.searchParams.set("page", String(page));

    const res = await fetch(url, { headers: nameComAuthHeaders() });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw Object.assign(
        new Error(
          body?.message || `name.com TLD price list failed (${res.status})`,
        ),
        { status: nameComStatus(res), details: body?.details },
      );
    }

    const rows = Array.isArray(body?.pricing) ? body.pricing : [];
    for (const row of rows) {
      const tld = String(row?.tld ?? "")
        .trim()
        .toLowerCase();
      const raw = row?.registrationPrice;
      const priceUsd = typeof raw === "number" ? raw : Number(raw);
      if (!tld || !Number.isFinite(priceUsd) || priceUsd <= 0) continue;
      collected.push({ tld, priceUsd });
    }

    const reportedLast =
      typeof body?.lastPage === "number" && body.lastPage > 0
        ? body.lastPage
        : page;
    lastPage = reportedLast;
    page += 1;
  }

  return collected;
}

/**
 * POST /v4/domains — register (purchase) a domain.
 *
 * Safe to retry: GET /domains/{domain} first; if we already own it, skip the
 * purchase and return `{ alreadyOwned: true, domain }`.
 *
 * `purchasePriceUsd` is a ceiling: if name.com's price rises above it before
 * the request is processed, the registration fails instead of charging more
 * than we agreed to.
 *
 * @param {string} domain e.g. "ahmed.com"
 * @param {number} purchasePriceUsd
 * @returns {Promise<object>} parsed body (includes domain, order, totalPaid),
 *   or `{ alreadyOwned: true, domain }` when the account already holds it
 */
export async function registerDomain(domain, purchasePriceUsd) {
  assertNameComConfigured();

  const ownedRes = await fetch(
    `${NAME_COM_BASE_URL}/domains/${encodeURIComponent(domain)}`,
    { headers: nameComAuthHeaders() },
  );
  const ownedBody = await ownedRes.json().catch(() => null);

  if (ownedRes.status === 200) {
    return { alreadyOwned: true, domain: ownedBody };
  }

  if (ownedRes.status !== 404) {
    throw Object.assign(
      new Error(
        ownedBody?.message ||
          `name.com domain lookup failed (${ownedRes.status})`,
      ),
      { status: nameComStatus(ownedRes), details: ownedBody?.details },
    );
  }

  const res = await fetch(`${NAME_COM_BASE_URL}/domains`, {
    method: "POST",
    headers: nameComAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      domain: { domainName: domain },
      purchasePrice: purchasePriceUsd,
    }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw Object.assign(
      new Error(
        body?.message || `name.com domain registration failed (${res.status})`,
      ),
      { status: nameComStatus(res), details: body?.details },
    );
  }

  return body;
}

/**
 * POST /v4/domains/{domain}/records — create a DNS record on a domain we own.
 *
 * @param {string} domain e.g. "ahmed.com"
 * @param {{ host: string, type: string, answer: string, ttl?: number }} record
 * @returns {Promise<object>} parsed body (the created record)
 */
export async function createDnsRecord(
  domain,
  { host, type, answer, ttl = 300 },
) {
  assertNameComConfigured();

  const res = await fetch(
    `${NAME_COM_BASE_URL}/domains/${encodeURIComponent(domain)}/records`,
    {
      method: "POST",
      headers: nameComAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ host, type, answer, ttl }),
    },
  );

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw Object.assign(
      new Error(
        body?.message || `name.com DNS record create failed (${res.status})`,
      ),
      { status: nameComStatus(res), details: body?.details },
    );
  }

  return body;
}
