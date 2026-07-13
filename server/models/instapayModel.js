import { supabaseAdmin } from "../config/supabase.js";

const COLUMNS =
  "id, broker_id, amount, currency, status, receipt_path, receipt_mime_type, rejection_reason, reviewed_by, reviewed_at, registration_payload, claim_token_hash, email, platform_name, contact_name, package, reserved_subdomain, reserved_custom_domain, domain_type, created_at, updated_at";

export const instapayModel = {
  async create(row) {
    const { data, error } = await supabaseAdmin
      .from("instapay_submissions")
      .insert({
        broker_id: row.brokerId ?? null,
        amount: row.amount,
        currency: row.currency ?? "EGP",
        status: "pending_review",
        receipt_path: row.receiptPath,
        receipt_mime_type: row.receiptMimeType ?? null,
        registration_payload: row.registrationPayload ?? null,
        claim_token_hash: row.claimTokenHash ?? null,
        email: row.email ?? null,
        platform_name: row.platformName ?? null,
        contact_name: row.contactName ?? null,
        package: row.package ?? null,
        reserved_subdomain: row.reservedSubdomain ?? null,
        reserved_custom_domain: row.reservedCustomDomain ?? null,
        domain_type: row.domainType ?? null,
      })
      .select(COLUMNS)
      .single();

    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from("instapay_submissions")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findByClaimTokenHash(claimTokenHash) {
    const { data, error } = await supabaseAdmin
      .from("instapay_submissions")
      .select(COLUMNS)
      .eq("claim_token_hash", claimTokenHash)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findLatestForBroker(brokerId) {
    const { data, error } = await supabaseAdmin
      .from("instapay_submissions")
      .select(COLUMNS)
      .eq("broker_id", brokerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findPendingForBroker(brokerId) {
    const { data, error } = await supabaseAdmin
      .from("instapay_submissions")
      .select(COLUMNS)
      .eq("broker_id", brokerId)
      .eq("status", "pending_review")
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findPendingByEmail(email) {
    const normalized = String(email).trim().toLowerCase();
    const { data, error } = await supabaseAdmin
      .from("instapay_submissions")
      .select(COLUMNS)
      .eq("status", "pending_review")
      .ilike("email", normalized)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findPendingBySubdomain(subdomain) {
    const normalized = String(subdomain).trim().toLowerCase();
    const { data, error } = await supabaseAdmin
      .from("instapay_submissions")
      .select(COLUMNS)
      .eq("status", "pending_review")
      .ilike("reserved_subdomain", normalized)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findPendingByCustomDomain(customDomain) {
    const normalized = String(customDomain).trim().toLowerCase();
    const { data, error } = await supabaseAdmin
      .from("instapay_submissions")
      .select(COLUMNS)
      .eq("status", "pending_review")
      .ilike("reserved_custom_domain", normalized)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async list({ status, limit = 50, offset = 0 } = {}) {
    let query = supabaseAdmin
      .from("instapay_submissions")
      .select(COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data ?? [], total: count ?? 0 };
  },

  async countByStatus(status) {
    const { count, error } = await supabaseAdmin
      .from("instapay_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", status);

    if (error) throw error;
    return count ?? 0;
  },

  async update(id, updates) {
    const { data, error } = await supabaseAdmin
      .from("instapay_submissions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
