import axios from "axios";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSubdomain } from "@/utils/tenant";
import { discardDeadSession } from "@/lib/sessionGuard";

/**
 * Resolve the API base URL.
 *
 * Strategy:
 *   1. In dev, prefer a relative `/api` so requests stay on the same origin
 *      (ahmed.localhost:8080) and get forwarded by the Vite proxy with the
 *      Host header preserved. This lets the backend's subdomain middleware
 *      see the real hostname.
 *   2. If VITE_API_URL is set explicitly we honor it (useful for staging /
 *      pointing at a remote backend).
 *   3. In production, fall back to the configured VITE_API_URL or
 *      `${origin}/api` so the same multi-tenant routing works behind a
 *      reverse proxy.
 */
function resolveBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_URL as string | undefined;

  if (import.meta.env.DEV) {
    // Use the relative path so the Vite proxy can forward AND preserve Host.
    return "/api";
  }

  if (explicit) return explicit;

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }

  return "/api";
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

/** Coalesce concurrent getSession reads (many parallel axios calls → one SDK await). */
let getSessionInflight: Promise<Session | null> | null = null;

function getSharedSessionTokens(): Promise<Session | null> {
  if (!getSessionInflight) {
    getSessionInflight = supabase.auth
      .getSession()
      .then(({ data }) => data.session ?? null)
      .finally(() => {
        getSessionInflight = null;
      });
  }
  return getSessionInflight;
}

// Request interceptor: attach Supabase JWT + tenant subdomain header.
api.interceptors.request.use(async (config) => {
  const session = await getSharedSessionTokens();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  // Tenant subdomain — sent on every request as a reliable fallback in case
  // a proxy strips/rewrites the Host header. The backend prefers the real
  // hostname but will trust this header when no subdomain is detected.
  const subdomain = getCurrentSubdomain();
  if (subdomain) {
    config.headers["X-Tenant-Subdomain"] = subdomain;
  }

  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // The Supabase client refreshes sessions on its own, so a 401 on a request
    // that carried a token means the session itself is no longer accepted by
    // the auth server. Retrying can never succeed — drop it and re-authenticate.
    if (
      error.response?.status === 401 &&
      !!error.config?.headers?.Authorization
    ) {
      void discardDeadSession();
    }
    return Promise.reject(error);
  },
);

export default api;
