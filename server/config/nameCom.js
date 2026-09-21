/**
 * Config for the name.com Reseller API — used to check whether a custom
 * domain is actually free to register, and to source the live wholesale
 * price we show for it (see server/services/domainPricing.js).
 *
 * NAME_COM_API_USERNAME / NAME_COM_API_TOKEN come from name.com's
 * "API for Resellers" page (https://www.name.com/reseller/apps) — sign in,
 * create/view an API app there to get a username + token pair. There are
 * separate credentials for the OT&E sandbox (api.dev.name.com) and
 * production (api.name.com); make sure NAME_COM_BASE_URL matches whichever
 * pair you set.
 */

export const NAME_COM_BASE_URL = (
  process.env.NAME_COM_BASE_URL || "https://api.name.com/v4"
).replace(/\/+$/, "");

/**
 * Host used for Core API paths such as /core/v1/tldpricing. NAME_COM_BASE_URL
 * is the v4 prefix (https://api.name.com/v4); the Core API lives one level up.
 */
export const NAME_COM_ORIGIN = NAME_COM_BASE_URL.replace(/\/v4$/i, "");

export const NAME_COM_API_USERNAME = process.env.NAME_COM_API_USERNAME || "";

export const NAME_COM_API_TOKEN = process.env.NAME_COM_API_TOKEN || "";

export function nameComAuthHeaders(extra = {}) {
  return {
    Authorization:
      "Basic " +
      Buffer.from(`${NAME_COM_API_USERNAME}:${NAME_COM_API_TOKEN}`).toString(
        "base64",
      ),
    ...extra,
  };
}

export function assertNameComConfigured() {
  if (!NAME_COM_API_USERNAME || !NAME_COM_API_TOKEN) {
    throw Object.assign(
      new Error(
        "Domain availability lookup is not configured (NAME_COM_API_USERNAME / NAME_COM_API_TOKEN missing). " +
          "Get an API app username + token from name.com's \"API for Resellers\" page.",
      ),
      { status: 503 },
    );
  }
}
