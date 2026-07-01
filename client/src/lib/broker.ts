import { supabase } from "@/integrations/supabase/client";
import { isPendingSubdomain } from "@/utils/subdomain";
import { getCurrentSubdomain } from "@/utils/tenant";

export interface Broker {
  id: string;
  first_name: string;
  last_name: string;
  platform_name: string;
  subdomain: string;
  email: string;
  phone_number: string;
  whatsapp_number: string;
  governorate: string | null;
  package: "free" | "plus" | "pro" | "ultra";
  package_limit: number;
  hero_background_url: string | null;
  platform_icon_url: string | null;
  created_at: string;
  updated_at: string;
}

// Extract subdomain from hostname.
// Delegates to the single source of truth in `@/utils/tenant` so this stays
// in sync with the apex/reserved-label rules used everywhere else in the app
// (e.g. Render's default `<service>.onrender.com` host is correctly treated
// as the main site, not a broker subdomain).
export function getSubdomainFromHost(): string | null {
  return getCurrentSubdomain();
}

// Fetch broker by subdomain
export async function getBrokerBySubdomain(
  subdomain: string,
): Promise<Broker | null> {
  const { data, error } = await supabase
    .from("brokers")
    .select("*")
    .eq("subdomain", subdomain)
    .maybeSingle();

  if (error) {
    console.error("Error fetching broker:", error);
    return null;
  }

  if (data && isPendingSubdomain(data.subdomain)) return null;

  return data as unknown as Broker | null;
}
