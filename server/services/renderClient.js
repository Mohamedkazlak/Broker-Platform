import {
  RENDER_API_BASE_URL,
  RENDER_SERVICE_ID,
  assertRenderConfigured,
  renderAuthHeaders,
} from "../config/render.js";
import {
  externalHttpSignal,
  httpTimeoutError,
  isHttpTimeoutError,
} from "../utils/httpTimeout.js";

/**
 * Thin HTTP client for Render's Custom Domains API. Attaches a broker's
 * purchased domain to our web service and checks verification status.
 */

function renderStatus(res) {
  return res.status >= 400 && res.status < 500 ? res.status : 502;
}

function customDomainsUrl(suffix = "") {
  const base = `${RENDER_API_BASE_URL}/services/${encodeURIComponent(RENDER_SERVICE_ID)}/custom-domains`;
  return suffix ? `${base}/${encodeURIComponent(suffix)}` : base;
}

async function renderFetch(url, init = {}) {
  try {
    return await fetch(url, {
      ...init,
      signal: init.signal ?? externalHttpSignal(),
    });
  } catch (err) {
    if (isHttpTimeoutError(err)) throw httpTimeoutError("Render", err);
    throw err;
  }
}

/** Unwrap Render's `{ customDomain }` envelope when present. */
export function unwrapCustomDomain(payload) {
  if (!payload || typeof payload !== "object") return payload;
  return payload.customDomain ?? payload;
}

function isAlreadyAttachedError(res, body) {
  if (res.status === 409) return true;
  const message = String(body?.message ?? "").toLowerCase();
  return (
    message.includes("already") ||
    message.includes("exists") ||
    message.includes("conflict")
  );
}

/**
 * POST /v1/services/{id}/custom-domains
 *
 * If the domain is already attached (409 / "already exists"), fetch the
 * existing custom-domain and return it — that counts as success so we can
 * persist render_domain_id.
 *
 * @param {string} domainName e.g. "ahmed.com" or "www.ahmed.com"
 * @returns {Promise<object>} the created or existing custom-domain object
 */
export async function addCustomDomain(domainName) {
  assertRenderConfigured();

  const res = await renderFetch(customDomainsUrl(), {
    method: "POST",
    headers: renderAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name: domainName }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (isAlreadyAttachedError(res, body)) {
      const existing = await getCustomDomain(domainName);
      const row = unwrapCustomDomain(existing);
      if (!row?.id && !row?.name) {
        throw Object.assign(
          new Error(
            body?.message ||
              `Render custom domain already attached but lookup failed for ${domainName}`,
          ),
          { status: renderStatus(res), details: body },
        );
      }
      return row;
    }
    throw Object.assign(
      new Error(
        body?.message || `Render add custom domain failed (${res.status})`,
      ),
      { status: renderStatus(res), details: body },
    );
  }

  // Create returns an array of customDomain objects (sometimes wrapped).
  const rows = Array.isArray(body)
    ? body.map(unwrapCustomDomain)
    : [unwrapCustomDomain(body)];
  const created =
    rows.find(
      (row) =>
        String(row?.name ?? "").toLowerCase() ===
        String(domainName).toLowerCase(),
    ) || rows[0];

  if (!created) {
    throw Object.assign(
      new Error("Render add custom domain returned an empty response"),
      { status: 502 },
    );
  }
  return created;
}

/**
 * POST /v1/services/{id}/custom-domains/{domainIdOrName}/verify
 *
 * @param {string} domainIdOrName
 * @returns {Promise<object|null>}
 */
export async function verifyCustomDomain(domainIdOrName) {
  assertRenderConfigured();

  const res = await renderFetch(`${customDomainsUrl(domainIdOrName)}/verify`, {
    method: "POST",
    headers: renderAuthHeaders(),
  });

  const body = await res.json().catch(() => null);

  // 202 Accepted is success with an empty/minimal body.
  if (!res.ok && res.status !== 202) {
    throw Object.assign(
      new Error(
        body?.message || `Render verify custom domain failed (${res.status})`,
      ),
      { status: renderStatus(res), details: body },
    );
  }

  return body;
}

/**
 * GET /v1/services/{id}/custom-domains/{domainIdOrName}
 *
 * @param {string} domainIdOrName
 * @returns {Promise<object>}
 */
export async function getCustomDomain(domainIdOrName) {
  assertRenderConfigured();

  const res = await renderFetch(customDomainsUrl(domainIdOrName), {
    method: "GET",
    headers: renderAuthHeaders(),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw Object.assign(
      new Error(
        body?.message || `Render get custom domain failed (${res.status})`,
      ),
      { status: renderStatus(res), details: body },
    );
  }

  return body;
}
