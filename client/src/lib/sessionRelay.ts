import { supabase } from "@/integrations/supabase/client";
import {
  buildMainSiteUrl,
  getBrokerPublicOrigin,
  isOnBrokerCustomDomain,
  type BrokerHostFields,
} from "@/utils/tenant";

/**
 * Cross-host session relay (platform host, broker subdomain, broker custom domain).
 *
 * localStorage is domain-scoped, so a session created on `localhost`
 * is invisible on `xyz.localhost`.  We solve this by appending the
 * current tokens to the redirect URL (in the hash fragment so they
 * are never sent to the server) and picking them up on the other side.
 */

/**
 * Where a broker's site lives right now: its active custom domain, or its
 * subdomain. Only the broker's own host-routing columns are read; the
 * subdomain is the lookup key and stays the fallback.
 */
async function resolveBrokerOrigin(subdomain: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("brokers")
      .select("*")
      .eq("subdomain", subdomain)
      .maybeSingle();
    if (data) return getBrokerPublicOrigin(data as unknown as BrokerHostFields);
  } catch {
    /* fall back to the subdomain below */
  }
  return getBrokerPublicOrigin({ subdomain });
}

/**
 * Build the URL of a broker's page (the dashboard by default). The broker is
 * identified by its subdomain, but the URL uses its custom domain when that is
 * active. When the target is the host already open, the URL stays on this host
 * and carries no tokens: the session is already here.
 */
export async function buildSubdomainRedirect(
  subdomain: string,
  path: string = "/dashboard",
  lang?: string,
): Promise<string> {
  const language =
    lang ||
    localStorage.getItem("i18nextLng") ||
    document.documentElement.lang ||
    "en";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const localizedPath = `/${language}${normalizedPath}`;
  const origin = await resolveBrokerOrigin(subdomain);
  const base = `${origin}${localizedPath}`;

  if (new URL(origin).host === window.location.host) return base;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    const params = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    return `${base}#${params.toString()}`;
  }

  return base;
}

/**
 * URL of a page on the main (platform) host, for flows that must run there
 * (plan change and payment: the gateway only knows the main host). A visitor
 * on a broker's custom domain has no session on the main host, so the current
 * tokens travel in the hash, the same relay used to go the other way. From
 * every other host this is the plain main-host URL, as before.
 */
export async function buildMainHostRelayUrl(pathname: string): Promise<string> {
  const base = buildMainSiteUrl(pathname);
  if (!isOnBrokerCustomDomain()) return base;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return base;

  const params = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return `${base}#${params.toString()}`;
}

/**
 * Call once on app startup (subdomain side).
 * If the URL hash contains session tokens, establish the session
 * in this domain's localStorage and clean up the URL.
 */
export async function acceptRelayedSession(): Promise<boolean> {
  const hash = window.location.hash.slice(1); // remove leading '#'
  if (!hash) return false;

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) return false;

  // Establish the session in this domain's Supabase client
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Clean the tokens from the URL (security)
  window.history.replaceState(null, "", window.location.pathname);

  return !error;
}
