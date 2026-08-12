import { supabaseAdmin } from "../config/supabase.js";

const COLUMNS =
  "id, order_id, session_id, broker_id, package, package_category, amount, currency, status, registration_payload, claim_token_hash, requested_domain_type, requested_subdomain, requested_custom_domain, transaction_id, pay_url, expires_at, completed_at, created_at, updated_at";

export const paymentModel = {
  async create(row) {
    const { data, error } = await supabaseAdmin
      .from("payment_sessions")
      .insert({
        order_id: row.orderId,
        broker_id: row.brokerId ?? null,
        package: row.package,
        package_category: row.packageCategory ?? null,
        amount: row.amount,
        currency: row.currency ?? "EGP",
        status: "pending",
        registration_payload: row.registrationPayload ?? null,
        claim_token_hash: row.claimTokenHash ?? null,
        requested_domain_type: row.requestedDomainType ?? null,
        requested_subdomain: row.requestedSubdomain ?? null,
        requested_custom_domain: row.requestedCustomDomain ?? null,
      })
      .select(COLUMNS)
      .single();

    if (error) throw error;
    return data;
  },

  async findByOrderId(orderId) {
    const { data, error } = await supabaseAdmin
      .from("payment_sessions")
      .select(COLUMNS)
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findBySessionId(sessionId) {
    const { data, error } = await supabaseAdmin
      .from("payment_sessions")
      .select(COLUMNS)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findByClaimTokenHash(claimTokenHash) {
    const { data, error } = await supabaseAdmin
      .from("payment_sessions")
      .select(COLUMNS)
      .eq("claim_token_hash", claimTokenHash)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabaseAdmin
      .from("payment_sessions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
