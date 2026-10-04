/**
 * Config for the Render API — used to attach broker custom domains to our
 * web service and poll verification / certificate status.
 *
 * RENDER_API_KEY comes from the Render Dashboard → Account Settings → API Keys.
 * RENDER_SERVICE_ID is the web service id (srv-…).
 * RENDER_CNAME_TARGET is that service's *.onrender.com hostname (no scheme),
 * used as the CNAME answer at name.com so traffic reaches Render.
 */

export const RENDER_API_BASE_URL = "https://api.render.com/v1";

export const RENDER_API_KEY = process.env.RENDER_API_KEY || "";

export const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID || "";

/** e.g. "broker-platform-957u.onrender.com" — no https:// prefix. */
export const RENDER_CNAME_TARGET = String(process.env.RENDER_CNAME_TARGET || "")
  .trim()
  .replace(/^https?:\/\//i, "")
  .replace(/\/+$/, "");

export function renderAuthHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${RENDER_API_KEY}`,
    Accept: "application/json",
    ...extra,
  };
}

export function assertRenderConfigured() {
  if (!RENDER_API_KEY || !RENDER_SERVICE_ID) {
    throw Object.assign(
      new Error(
        "Render domain attachment is not configured (RENDER_API_KEY / RENDER_SERVICE_ID missing).",
      ),
      { status: 503 },
    );
  }
}

export function assertRenderCnameConfigured() {
  assertRenderConfigured();
  if (!RENDER_CNAME_TARGET) {
    throw Object.assign(
      new Error(
        "Render CNAME target is not configured (RENDER_CNAME_TARGET missing). " +
          "Set it to your service's *.onrender.com hostname.",
      ),
      { status: 503 },
    );
  }
}
