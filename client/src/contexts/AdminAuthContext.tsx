import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import api from "@/lib/api";

/**
 * Platform-admin auth context — deliberately separate from BrokerContext /
 * AuthContext. It reuses the shared Supabase session but determines admin
 * status by calling GET /api/admin/me (which returns 403 for non-admins).
 *
 * This context is only mounted under the /admin route tree on the main host;
 * it is never wired into the broker subdomain relay.
 */

interface AdminIdentity {
  id: string;
  email: string;
  full_name: string | null;
}

interface AdminAuthContextType {
  admin: AdminIdentity | null;
  isAdmin: boolean;
  isLoading: boolean;
  /** Signs in via Supabase Auth, then verifies admin status. */
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: Error | null; isAdmin: boolean }>;
  signOut: () => Promise<void>;
  /** Re-run the admin identity check against the current session. */
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  isAdmin: false,
  isLoading: true,
  signIn: async () => ({ error: null, isAdmin: false }),
  signOut: async () => {},
  refresh: async () => {},
});

export const useAdminAuth = () => useContext(AdminAuthContext);

/** Fetch admin identity for the current session. Returns null if not an admin. */
async function fetchAdminIdentity(): Promise<AdminIdentity | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const { data } = await api.get("/admin/me");
    return (data?.data as AdminIdentity) ?? null;
  } catch {
    // 401/403 (not signed in / not an admin) → treated as non-admin.
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const identity = await fetchAdminIdentity();
    setAdmin(identity);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const identity = await fetchAdminIdentity();
      if (!cancelled) {
        setAdmin(identity);
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error: error as Error, isAdmin: false };
    }

    const identity = await fetchAdminIdentity();
    setAdmin(identity);
    return { error: null, isAdmin: !!identity };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAdmin: !!admin,
        isLoading,
        signIn,
        signOut,
        refresh,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
