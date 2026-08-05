import { supabase } from "@/integrations/supabase/client";
import { buildMainSiteUrl } from "@/utils/tenant";

/**
 * Recovery for sessions that outlived their server-side counterpart.
 *
 * A stored session can be revoked server-side while the browser still holds a
 * structurally valid JWT: signing out on another origin revokes it globally, and
 * the cross-subdomain relay hands the same refresh token to two origins, so one
 * loses the rotation race. Neither `getSession()` (local expiry check only) nor
 * PostgREST (signature check only) notices, so the UI looks signed in while
 * every call through our API fails `supabaseAdmin.auth.getUser()` with a 401.
 *
 * There is no way back from that state without dropping the token, so clear it
 * locally (a network sign-out would fail too) and send the visitor to login.
 */

let discarding = false;

export function isDiscardingDeadSession(): boolean {
  return discarding;
}

export async function discardDeadSession(): Promise<void> {
  if (discarding) return;
  discarding = true;

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* the token is already unusable — nothing to salvage */
  }

  const lang = localStorage.getItem("i18nextLng") || "en";
  window.location.href = buildMainSiteUrl(`/${lang}/login?session=expired`);
}

/**
 * Verify a restored session against the auth server once on startup so a
 * revoked session presents as signed out instead of a broken signed-in UI.
 * Network failures are ignored — only an explicit auth rejection counts.
 */
export async function isSessionStillValid(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.getUser();
    return !error;
  } catch {
    return true;
  }
}
