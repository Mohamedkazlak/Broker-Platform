import { supabaseAdmin } from "../config/supabase.js";
import { isPendingSubdomain } from "../utils/subdomainGenerator.js";

/**
 * Broker database operations.
 * Uses supabaseAdmin (bypasses RLS) since broker creation happens during signup
 * before the user has a scoped session.
 */

/**
 * A custom domain may be served only for an active broker whose domain
 * provisioning has finished. Anything else is treated as "not this broker".
 */
export function isServableCustomDomainBroker(row) {
  if (!row?.subdomain || isPendingSubdomain(row.subdomain)) return false;
  if (row.is_active !== true || row.domain_status !== "active") return false;
  return true;
}

/** Columns safe to expose on public subdomain lookup (no password hash). */
const BROKER_PUBLIC_FIELDS =
  "id, first_name, last_name, platform_name, subdomain, email, phone_number, whatsapp_number, governorate, package, package_category, package_limit, hero_background_url, platform_icon_url, social_facebook_url, social_instagram_url, social_whatsapp_url, social_tiktok_url, created_at, updated_at";

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

  /**
   * Broker allowed to serve its public site on this custom domain.
   * Returns null unless is_active is true and domain_status is 'active'.
   * Includes the same public columns as findBySubdomain so /api/tenant/resolve
   * can satisfy the client broker bootstrap in one round-trip.
   */
  async findActiveByCustomDomain(customDomain) {
    const normalized = String(customDomain ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) return null;

    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select(
        `${BROKER_PUBLIC_FIELDS}, is_active, domain_status, custom_domain`,
      )
      .eq("custom_domain", normalized)
      .maybeSingle();

    if (error) throw error;
    if (!isServableCustomDomainBroker(data)) return null;

    const {
      is_active: _isActive,
      domain_status: _domainStatus,
      ...publicBroker
    } = data;
    return publicBroker;
  },

  /**
   * The reverse of findActiveByCustomDomain: the active custom domain of the
   * broker that owns this subdomain, or null when there is none (no custom
   * domain, not 'active', or broker not is_active). Used by the old
   * subdomain -> custom domain redirect.
   */
  async findActiveCustomDomainBySubdomain(subdomain) {
    const normalized = String(subdomain ?? "")
      .trim()
      .toLowerCase();
    if (!normalized || isPendingSubdomain(normalized)) return null;

    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select("id, subdomain, custom_domain, is_active, domain_status")
      .eq("subdomain", normalized)
      .maybeSingle();

    if (error) throw error;
    if (!isServableCustomDomainBroker(data) || !data.custom_domain) return null;
    return {
      id: data.id,
      subdomain: data.subdomain,
      custom_domain: data.custom_domain,
      domain_status: data.domain_status,
      is_active: data.is_active,
    };
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

  /**
   * Active paid brokers for the billing monitor sweep.
   * Includes rows with a due/overdue next_billing_date OR a missing one
   * (so we can backfill from created_at).
   */
  async findActivePaidForBillingSweep() {
    const nowIso = new Date().toISOString();

    const [dueResult, missingResult] = await Promise.all([
      supabaseAdmin
        .from("brokers")
        .select(
          "id, package, subscription_status, next_billing_date, billing_amount, created_at",
        )
        .eq("subscription_status", "active")
        .neq("package", "free")
        .not("next_billing_date", "is", null)
        .lte("next_billing_date", nowIso),
      supabaseAdmin
        .from("brokers")
        .select(
          "id, package, subscription_status, next_billing_date, billing_amount, created_at",
        )
        .eq("subscription_status", "active")
        .neq("package", "free")
        .is("next_billing_date", null),
    ]);

    if (dueResult.error) throw dueResult.error;
    if (missingResult.error) throw missingResult.error;

    const byId = new Map();
    for (const row of [
      ...(dueResult.data ?? []),
      ...(missingResult.data ?? []),
    ]) {
      byId.set(row.id, row);
    }
    return [...byId.values()];
  },

  /**
   * Brokers whose custom-domain provisioning is mid-flight and still under
   * the relevant retry budget — picked up by domainMonitor for DNS retry,
   * finishing an interrupted attach, or Render verification.
   *
   * Filter notes (PostgREST can't OR two different attempt columns cleanly
   * in one eq-chain, so we fetch the status set and filter attempts in JS):
   *   dns_pending  → domain_dns_attempts < 5
   *   attaching    → always (attach failures already wrote needs_review)
   *   verifying    → domain_verify_attempts < 5
   */
  async findForDomainMonitorSweep() {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select(
        "id, custom_domain, domain_status, domain_dns_attempts, domain_verify_attempts, render_domain_id, domain_last_error",
      )
      .in("domain_status", ["dns_pending", "attaching", "verifying"]);

    if (error) throw error;

    return (data ?? []).filter((row) => {
      const status = row.domain_status;
      if (status === "dns_pending") {
        return (Number(row.domain_dns_attempts) || 0) < 5;
      }
      if (status === "verifying") {
        return (Number(row.domain_verify_attempts) || 0) < 5;
      }
      // attaching: complete interrupted attach; recorded failures are needs_review
      return status === "attaching";
    });
  },

  /**
   * Brokers that actually have a custom domain, for the name.com expiry sync.
   * Empty strings are dropped so a blank custom_domain is left alone.
   */
  async findWithCustomDomain() {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select("id, custom_domain, domain_expires_at")
      .not("custom_domain", "is", null);

    if (error) throw error;
    return (data ?? []).filter((row) => String(row.custom_domain ?? "").trim());
  },

  /**
   * Brokers stuck in needs_review for the admin Domain issues page (Phase 6).
   */
  async findDomainNeedsReview() {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select(
        "id, platform_name, email, subdomain, custom_domain, domain_status, domain_last_error, domain_dns_attempts, domain_verify_attempts, name_com_order_id, render_domain_id, domain_expires_at, package, updated_at, created_at",
      )
      .eq("domain_status", "needs_review")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
};
