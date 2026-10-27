import {
  NAME_COM_BASE_URL,
  NAME_COM_ORIGIN,
  assertNameComConfigured,
  nameComAuthHeaders,
} from "../config/nameCom.js";
import {
  externalHttpSignal,
  httpTimeoutError,
  isHttpTimeoutError,
} from "../utils/httpTimeout.js";

/**
 * Thin HTTP client for name.com's Reseller API — availability/price checks,
 * domain registration, and DNS record creation.
 */

const TLD_PRICING_PER_PAGE = 100;
const TLD_PRICING_MAX_PAGES = 40;

/** name.com ListDomains defaults to 1,000. Cap pages so a bad nextPage can't loop. */
const DOMAINS_PER_PAGE = 1000;
const DOMAINS_MAX_PAGES = 100;

const RECORDS_PER_PAGE = 1000;
const RECORDS_MAX_PAGES = 20;

/**
 * RFC 3339 expireDate from a name.com domain object, as an ISO string.
 * Returns null when the field is missing or not a real timestamp — callers
 * must leave any stored expiry untouched in that case.
 */
export function parseDomainExpireDate(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * expireDate from a successful registerDomain() result.
 *
 * CreateDomain (POST /v4/domains) nests it at `domain.expireDate`.
 * The already-owned path returns the GetDomain body on `domain`, and that
 * body also carries `expireDate`. Both shapes are covered by `.domain.expireDate`.
 */
export function expireDateFromRegistration(registration) {
  return parseDomainExpireDate(registration?.domain?.expireDate);
}

function nameComStatus(res) {
  // Pass through name.com's own 4xx as-is (e.g. 400 "invalid domain name"
  // is us sending bad input, not an outage on their end) — only fall back
  // to 502 for a genuinely unexpected upstream status.
  return res.status >= 400 && res.status < 500 ? res.status : 502;
}

async function nameComFetch(url, init = {}) {
  try {
    return await fetch(url, {
      ...init,
      signal: init.signal ?? externalHttpSignal(),
    });
  } catch (err) {
    if (isHttpTimeoutError(err)) throw httpTimeoutError("name.com", err);
    throw err;
  }
}

function normalizeDnsHost(host) {
  const h = String(host ?? "")
    .trim()
    .toLowerCase();
  if (h === "@") return "";
  return h;
}

function normalizeDnsAnswer(answer) {
  return String(answer ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

function dnsRecordMatches(row, { host, type, answer }) {
  return (
    normalizeDnsHost(row?.host) === normalizeDnsHost(host) &&
    String(row?.type ?? "").toUpperCase() ===
      String(type ?? "").toUpperCase() &&
    normalizeDnsAnswer(row?.answer) === normalizeDnsAnswer(answer)
  );
}

/**
 * POST /v4/domains:checkAvailability for a single domain.
 *
 * @param {string} domain e.g. "ahmed.com"
 * @returns {Promise<{ purchasable: boolean, premium: boolean, priceUsd: number | null }>}
 *   `purchasable` is true if name.com reports the domain as free to
 *   register. `premium` is name.com's registry-premium flag — we refuse
 *   those. `priceUsd` is name.com's own purchase price for it (USD, no
 *   markup applied), taken from this same response — null when name.com
 *   didn't include one (e.g. the domain isn't purchasable).
 */
export async function checkDomainAvailability(domain) {
  assertNameComConfigured();

  const res = await nameComFetch(
    `${NAME_COM_BASE_URL}/domains:checkAvailability`,
    {
      method: "POST",
      headers: nameComAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ domainNames: [domain] }),
    },
  );

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
    premium: Boolean(result.premium),
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

    const res = await nameComFetch(url, { headers: nameComAuthHeaders() });
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
 * GET /v4/domains/{domain} — whether our name.com account owns this domain.
 *
 * @param {string} domain
 * @returns {Promise<{ owned: boolean, domain?: object }>}
 */
export async function getDomain(domain) {
  assertNameComConfigured();

  const res = await nameComFetch(
    `${NAME_COM_BASE_URL}/domains/${encodeURIComponent(domain)}`,
    { headers: nameComAuthHeaders() },
  );
  const body = await res.json().catch(() => null);

  if (res.status === 200) {
    return { owned: true, domain: body };
  }
  if (res.status === 404) {
    return { owned: false };
  }

  throw Object.assign(
    new Error(
      body?.message || `name.com domain lookup failed (${res.status})`,
    ),
    { status: nameComStatus(res), details: body?.details },
  );
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
 * Body we send (CreateDomain):
 *   { domain: { domainName }, purchasePrice }
 * We do not send years, contacts, purchaseType, or a payment method.
 *
 * @param {string} domain e.g. "ahmed.com"
 * @param {number} purchasePriceUsd
 * @returns {Promise<object>} parsed body (includes domain, order, totalPaid),
 *   or `{ alreadyOwned: true, domain }` when the account already holds it
 */
export async function registerDomain(domain, purchasePriceUsd) {
  assertNameComConfigured();

  const owned = await getDomain(domain);
  if (owned.owned) {
    return { alreadyOwned: true, domain: owned.domain };
  }

  const res = await nameComFetch(`${NAME_COM_BASE_URL}/domains`, {
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
 * GET /v4/domains — every domain in the name.com account.
 *
 * ListDomains returns `{ domains, nextPage }`. `domains[]` entries include
 * `domainName` and `expireDate` (RFC 3339). `nextPage` is only present when
 * another page exists. Pagination stops when it is missing, not a positive
 * number, or repeats the page we just read.
 *
 * @returns {Promise<Array<{ domainName?: string, expireDate?: string }>>}
 */
export async function listAccountDomains() {
  assertNameComConfigured();

  const collected = [];
  let page = 1;

  for (let i = 0; i < DOMAINS_MAX_PAGES; i++) {
    const url = new URL(`${NAME_COM_BASE_URL}/domains`);
    url.searchParams.set("perPage", String(DOMAINS_PER_PAGE));
    url.searchParams.set("page", String(page));

    const res = await nameComFetch(url, { headers: nameComAuthHeaders() });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw Object.assign(
        new Error(
          body?.message || `name.com domain list failed (${res.status})`,
        ),
        { status: nameComStatus(res), details: body?.details },
      );
    }

    const rows = Array.isArray(body?.domains) ? body.domains : [];
    collected.push(...rows);

    const nextPage = body?.nextPage;
    if (
      typeof nextPage !== "number" ||
      !Number.isFinite(nextPage) ||
      nextPage <= 0
    ) {
      return collected;
    }
    if (nextPage === page) return collected;
    page = nextPage;
  }

  throw new Error(
    `name.com domain list did not finish within ${DOMAINS_MAX_PAGES} pages`,
  );
}

/**
 * GET /v4/domains/{domain}/records — all DNS records for a zone we own.
 *
 * @param {string} domain
 * @returns {Promise<object[]>}
 */
export async function listDnsRecords(domain) {
  assertNameComConfigured();

  const collected = [];
  let page = 1;

  for (let i = 0; i < RECORDS_MAX_PAGES; i++) {
    const url = new URL(
      `${NAME_COM_BASE_URL}/domains/${encodeURIComponent(domain)}/records`,
    );
    url.searchParams.set("perPage", String(RECORDS_PER_PAGE));
    url.searchParams.set("page", String(page));

    const res = await nameComFetch(url, { headers: nameComAuthHeaders() });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw Object.assign(
        new Error(
          body?.message || `name.com DNS record list failed (${res.status})`,
        ),
        { status: nameComStatus(res), details: body?.details },
      );
    }

    const rows = Array.isArray(body?.records) ? body.records : [];
    collected.push(...rows);

    const nextPage = body?.nextPage;
    if (
      typeof nextPage !== "number" ||
      !Number.isFinite(nextPage) ||
      nextPage <= 0
    ) {
      return collected;
    }
    if (nextPage === page) return collected;
    page = nextPage;
  }

  throw new Error(
    `name.com DNS record list did not finish within ${RECORDS_MAX_PAGES} pages`,
  );
}

function isDnsAlreadyExistsError(res, body) {
  if (res.status === 409) return true;
  const message = String(body?.message ?? body?.details ?? "").toLowerCase();
  return (
    message.includes("already exists") ||
    message.includes("duplicate") ||
    message.includes("record exists")
  );
}

/**
 * POST /v4/domains/{domain}/records — create a DNS record on a domain we own.
 * Idempotent: if an identical host+type+answer already exists, that counts as
 * done (returns the existing row). A create that fails because the record
 * already exists is also treated as success.
 *
 * @param {string} domain e.g. "ahmed.com"
 * @param {{ host: string, type: string, answer: string, ttl?: number }} record
 * @returns {Promise<object>} the existing or newly created record
 */
export async function createDnsRecord(
  domain,
  { host, type, answer, ttl = 300 },
) {
  assertNameComConfigured();

  const existing = await listDnsRecords(domain);
  const match = existing.find((row) =>
    dnsRecordMatches(row, { host, type, answer }),
  );
  if (match) return match;

  const res = await nameComFetch(
    `${NAME_COM_BASE_URL}/domains/${encodeURIComponent(domain)}/records`,
    {
      method: "POST",
      headers: nameComAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ host, type, answer, ttl }),
    },
  );

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (isDnsAlreadyExistsError(res, body)) {
      const again = await listDnsRecords(domain);
      const found = again.find((row) =>
        dnsRecordMatches(row, { host, type, answer }),
      );
      if (found) return found;
      // Duplicate without a listable match — still treat as done for retries.
      return body ?? { host, type, answer, ttl, alreadyExisted: true };
    }
    throw Object.assign(
      new Error(
        body?.message || `name.com DNS record create failed (${res.status})`,
      ),
      { status: nameComStatus(res), details: body?.details },
    );
  }

  return body;
}
