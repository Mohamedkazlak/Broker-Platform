import { supabaseAdmin } from "../config/supabase.js";
import { isPendingSubdomain } from "../utils/subdomainGenerator.js";

/**
 * Broker database operations.
 * Uses supabaseAdmin (bypasses RLS) since broker creation happens during signup
 * before the user has a scoped session.
 */

/** Columns safe to expose on public subdomain lookup (no password hash). */
const BROKER_PUBLIC_FIELDS =
  "id, first_name, last_name, platform_name, subdomain, email, phone_number, whatsapp_number, governorate, package, package_limit, hero_background_url, platform_icon_url, created_at, updated_at";

export const brokerModel = {
  async findBySubdomain(subdomain) {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select(BROKER_PUBLIC_FIELDS)
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (error) throw error;
    if (data && isPendingSubdomain(data.subdomain)) return null;
    return data;
  },

  /** Lightweight existence check used by the availability endpoint. */
  async findIdBySubdomain(subdomain) {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select("id")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /** Existence check for the custom-domain availability endpoint. */
  async findByCustomDomain(customDomain) {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select("id")
      .eq("custom_domain", customDomain)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async findByEmail(email) {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(brokerData) {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .insert(brokerData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
