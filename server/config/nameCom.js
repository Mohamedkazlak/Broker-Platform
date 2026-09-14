/**
 * Config for the name.com Reseller API — used only to check whether a
 * custom domain is actually free to register. Pricing stays flat/local
 * (see server/config/domains.js); this is not used for live pricing.
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

export const NAME_COM_API_USERNAME = process.env.NAME_COM_API_USERNAME || "";

export const NAME_COM_API_TOKEN = process.env.NAME_COM_API_TOKEN || "";

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
