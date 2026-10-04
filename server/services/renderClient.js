import {
  RENDER_API_BASE_URL,
  RENDER_SERVICE_ID,
  assertRenderConfigured,
  renderAuthHeaders,
} from "../config/render.js";

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

/**
 * POST /v1/services/{id}/custom-domains
 *
 * @param {string} domainName e.g. "ahmed.com"
 * @returns {Promise<object>} the created custom-domain object (has id, name, …)
 */
export async function addCustomDomain(domainName) {
  assertRenderConfigured();

  const res = await fetch(customDomainsUrl(), {
    method: "POST",
    headers: renderAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name: domainName }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw Object.assign(
      new Error(
        body?.message || `Render add custom domain failed (${res.status})`,
      ),
      { status: renderStatus(res), details: body },
    );
  }

  // Create returns an array of customDomain objects.
  const created = Array.isArray(body) ? body[0] : body;
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

  const res = await fetch(`${customDomainsUrl(domainIdOrName)}/verify`, {
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

  const res = await fetch(customDomainsUrl(domainIdOrName), {
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
