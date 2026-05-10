import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useBroker } from './BrokerContext';
import { acceptRelayedSession } from '@/lib/sessionRelay';

interface Profile {
  id: string;
  broker_id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: 'admin' | 'editor' | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; subdomain?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  registerBroker: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    platformName: string;
    subdomain: string;
    phone: string;
    whatsapp: string;
  }) => Promise<{ error: Error | null; subdomain?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: null,
  isLoading: true,
  signIn: async () => ({ error: null, subdomain: undefined }),
  signUp: async () => ({ error: null }),
  registerBroker: async () => ({ error: null, subdomain: undefined }),
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { broker } = useBroker();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<'admin' | 'editor' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const profileLoadsRef = useRef<Map<string, Promise<void>>>(new Map());

  const fetchProfile = useCallback(async (userId: string) => {
    let p = profileLoadsRef.current.get(userId);
    if (p) {
      await p;
      return;
    }

    p = (async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData as Profile | null);

        setRole('admin');
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        profileLoadsRef.current.delete(userId);
        setIsLoading(false);
      }
    })();

    profileLoadsRef.current.set(userId, p);
    await p;
  }, []);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const STORAGE_KEY = 'broker_platform_server_started_at';

    let healthInflight: Promise<void> | null = null;

    function checkServerRestart() {
      if (!healthInflight) {
        healthInflight = (async () => {
          try {
            const res = await fetch(`${apiUrl}/health`, { credentials: 'include' });
            const json = await res.json();
            const serverAt = json?.serverStartedAt;
            if (serverAt == null) return;
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored != null && Number(stored) !== serverAt) {
              sessionStorage.removeItem(STORAGE_KEY);
              await supabase.auth.signOut();
              setUser(null);
              setSession(null);
              setProfile(null);
              setRole(null);
              const port = window.location.port ? `:${window.location.port}` : '';
              window.location.href = `http://localhost${port}/login`;
              return;
            }
            sessionStorage.setItem(STORAGE_KEY, String(serverAt));
          } catch {
            /* ignore network errors */
          }
        })().finally(() => {
          healthInflight = null;
        });
      }
      return healthInflight;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          queueMicrotask(() => {
            void fetchProfile(session.user.id);
          });
          void checkServerRestart();
        } else {
          setProfile(null);
          setRole(null);
        }
      },
    );

    async function initSession() {
      await acceptRelayedSession();

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
        await checkServerRestart();
      } else {
        setIsLoading(false);
      }
    }

    void initSession();

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: new Error(data.error || 'Login failed') };
      }

      // Establish session in browser
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      return { error: null, subdomain: data.broker?.subdomain };
    } catch (error) {
      const err = error as Error;
      return { error: new Error(err.message || 'Network error during login') };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!broker) {
      // If no broker context, we can't join one. 
      // This path might be deprecated for "Join Broker" content.
      return { error: new Error('Broker not found') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          broker_id: broker.id,
          full_name: fullName,
          role: 'editor',
        },
      },
    });
    return { error: error as Error | null };
  };

  const registerBroker = async (formData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    platformName: string;
    subdomain: string;
    phone: string;
    whatsapp: string;
  }) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formData }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: new Error(data.error || 'Failed to register platform') };
      }

      // Establish session in browser after successful registration
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      return { error: null, subdomain: data.broker?.subdomain };
    } catch (error) {
      const err = error as Error;
      return { error: new Error(err.message || 'Network error during registration') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        signIn,
        signUp,
        registerBroker,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
