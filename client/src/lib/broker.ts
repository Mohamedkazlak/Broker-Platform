import { supabase } from "@/integrations/supabase/client";

export interface Broker {
  id: string;
  first_name: string;
  last_name: string;
  platform_name: string;
  subdomain: string;
  email: string;
  phone_number: string;
  whatsapp_number: string;
  package: 'free' | 'plus' | 'pro' | 'ultra';
  package_limit: number;
  created_at: string;
  updated_at: string;
}

// Extract subdomain from hostname
export function getSubdomainFromHost(): string | null {
  const hostname = window.location.hostname;

  // Check for local subdomains like brokername.localhost
  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '');
  }

  // For local development without a subdomain, return null (main domain)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Allow override via query param for dev convenience
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('broker') || null;
  }

  // For production, extract subdomain
  // Expected format: subdomain.myflat.com or subdomain.lovable.app
  const parts = hostname.split('.');

  // If we have at least 3 parts (subdomain.domain.tld), return the first part
  if (parts.length >= 3) {
    return parts[0];
  }

  return null; // No subdomain detected
}

// Fetch broker by subdomain
export async function getBrokerBySubdomain(subdomain: string): Promise<Broker | null> {
  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('subdomain', subdomain)
    .maybeSingle();

  if (error) {
    console.error('Error fetching broker:', error);
    return null;
  }

  return data as unknown as Broker | null;
}

// Demo broker for development
export const demoBroker: Broker = {
  id: 'demo-broker-id',
  first_name: 'Demo',
  last_name: 'User',
  platform_name: 'Broker Platform',
  subdomain: 'demo',
  email: 'contact@BrokerTeam.com',
  phone_number: '(+20)1270018663',
  whatsapp_number: '(+20)1270018663',
  package: 'pro',
  package_limit: 50,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

