import { supabaseAdmin } from "../config/supabase.js";

const COLUMNS =
  "id, order_id, session_id, broker_id, package, package_category, amount, currency, status, registration_payload, claim_token_hash, requested_domain_type, requested_subdomain, requested_custom_domain, domain_quoted_price_usd, domain_quoted_price_egp, domain_hold_expires_at, domain_fulfillment_status, refund_status, refund_reason, refunded_at, broker_notified_at, transaction_id, pay_url, expires_at, completed_at, created_at, updated_at";

const DOMAIN_HELD_MESSAGE =
  "Someone else is buying this domain right now, try again in a few minutes";

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
        domain_quoted_price_usd: row.domainQuotedPriceUsd ?? null,
        domain_quoted_price_egp: row.domainQuotedPriceEgp ?? null,
        domain_hold_expires_at: row.domainHoldExpiresAt ?? null,
        domain_fulfillment_status: row.domainFulfillmentStatus ?? "none",
        refund_status: row.refundStatus ?? "none",
      })
      .select(COLUMNS)
      .single();

    if (error) {
      if (error.code === "23505" && row.requestedCustomDomain) {
        throw Object.assign(new Error(DOMAIN_HELD_MESSAGE), {
          status: 409,
          reason: "held",
        });
      }
      throw error;
    }
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

  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from("payment_sessions")
      .select(COLUMNS)
      .eq("id", id)
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

  /**
   * Atomic claim for the post-payment domain buy job (Phase 3).
   * Only one concurrent run wins: pending → registering.
   *
   * Equivalent to:
   *   UPDATE payment_sessions
   *   SET domain_fulfillment_status = 'registering', updated_at = now()
   *   WHERE id = $1
   *     AND status = 'completed'
   *     AND domain_fulfillment_status = 'pending'
   *   RETURNING *;
   *
   * @returns {Promise<object|null>} claimed row, or null if another run won
   */
  async claimDomainFulfillment(id) {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("payment_sessions")
      .update({
        domain_fulfillment_status: "registering",
        updated_at: now,
      })
      .eq("id", id)
      .eq("status", "completed")
      .eq("domain_fulfillment_status", "pending")
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Paid custom-domain sessions still not fulfilled, older than `olderThanIso`.
   * Used by the domainMonitor recovery sweep (never buys — only GetDomain).
   */
  async findStuckDomainFulfillment(olderThanIso) {
    const { data, error } = await supabaseAdmin
      .from("payment_sessions")
      .select(COLUMNS)
      .eq("status", "completed")
      .in("domain_fulfillment_status", ["pending", "registering"])
      .not("requested_custom_domain", "is", null)
      .lte("completed_at", olderThanIso)
      .eq("refund_status", "none");

    if (error) throw error;
    return data ?? [];
  },

  /**
   * Sessions whose refund was requested or failed — sweep retries these.
   */
  async findRefundRetries() {
    const { data, error } = await supabaseAdmin
      .from("payment_sessions")
      .select(COLUMNS)
      .in("refund_status", ["requested", "failed"])
      .not("session_id", "is", null);

    if (error) throw error;
    return data ?? [];
  },

  /**
   * Latest paid custom-domain session for a broker (admin refund+revert).
   */
  async findLatestDomainSessionForBroker(brokerId, customDomain) {
    const normalized = String(customDomain ?? "")
      .trim()
      .toLowerCase();
    let query = supabaseAdmin
      .from("payment_sessions")
      .select(COLUMNS)
      .eq("broker_id", brokerId)
      .in("status", ["completed", "refunded"])
      .order("completed_at", { ascending: false })
      .limit(5);

    if (normalized) {
      query = query.eq("requested_custom_domain", normalized);
    } else {
      query = query.not("requested_custom_domain", "is", null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data?.[0] ?? null;
  },

  /**
   * Flip expired pending holds to failed so the Phase 1 partial unique index
   * on requested_custom_domain frees the name (index can't use now()).
   */
  async releaseExpiredHoldsForDomain(customDomain) {
    const normalized = String(customDomain ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) return;

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("payment_sessions")
      .update({ status: "failed", updated_at: now })
      .eq("requested_custom_domain", normalized)
      .eq("status", "pending")
      .lt("domain_hold_expires_at", now);

    if (error) throw error;
  },

  /**
   * A live hold: pending (and not past domain_hold_expires_at) or completed,
   * not failed/refunded on payment status, refund_status still none, and
   * fulfillment not failed. Matches the Phase 1 partial unique index intent.
   */
  async findLiveHoldByCustomDomain(customDomain) {
    const normalized = String(customDomain ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) return null;

    await this.releaseExpiredHoldsForDomain(normalized);

    const { data, error } = await supabaseAdmin
      .from("payment_sessions")
      .select(COLUMNS)
      .eq("requested_custom_domain", normalized)
      .in("status", ["pending", "completed"])
      .eq("refund_status", "none")
      .neq("domain_fulfillment_status", "failed")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!data?.length) return null;

    const now = Date.now();
    return (
      data.find((row) => {
        if (row.status === "completed") return true;
        if (!row.domain_hold_expires_at) return true;
        return new Date(row.domain_hold_expires_at).getTime() > now;
      }) ?? null
    );
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

export { DOMAIN_HELD_MESSAGE };
