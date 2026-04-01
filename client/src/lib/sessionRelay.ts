import { supabase } from '@/integrations/supabase/client';

/**
 * Cross-subdomain session relay.
 *
 * localStorage is domain-scoped, so a session created on `localhost`
 * is invisible on `xyz.localhost`.  We solve this by appending the
 * current tokens to the redirect URL (in the hash fragment so they
 * are never sent to the server) and picking them up on the other side.
 */

/** Build a redirect URL that carries the current session tokens. */
export async function buildSubdomainRedirect(
  subdomain: string,
  path: string = '/dashboard'
): Promise<string> {
  const port = window.location.port ? `:${window.location.port}` : '';
  const base = `http://${subdomain}.localhost${port}${path}`;

  const { data: { session } } = await supabase.auth.getSession();
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
 * Call once on app startup (subdomain side).
 * If the URL hash contains session tokens, establish the session
 * in this domain's localStorage and clean up the URL.
 */
export async function acceptRelayedSession(): Promise<boolean> {
  const hash = window.location.hash.slice(1); // remove leading '#'
  if (!hash) return false;

  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) return false;

  // Establish the session in this domain's Supabase client
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Clean the tokens from the URL (security)
  window.history.replaceState(null, '', window.location.pathname);

  return !error;
}
