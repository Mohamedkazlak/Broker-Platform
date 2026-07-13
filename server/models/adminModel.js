import { supabaseAdmin } from "../config/supabase.js";
import { instapayModel } from "./instapayModel.js";

/**
 * Admin-side database operations.
 *
 * Two concerns live here:
 *   1. admin_users identity lookups (used by requireAdmin + /me).
 *   2. Read/aggregate queries over `brokers` for the admin dashboard.
 *
 * All queries use supabaseAdmin (service role, bypasses RLS) because these run
 * server-side only, behind the requireAdmin middleware.
 */

/** Columns exposed in the admin brokers list (no password hash). */
const BROKER_ADMIN_LIST_COLUMNS =
  "id, first_name, last_name, platform_name, email, subdomain, custom_domain, domain_type, package, subscription_status, is_active, created_at";

const BROKER_ADMIN_DETAIL_COLUMNS =
  "id, first_name, last_name, platform_name, email, phone_number, whatsapp_number, governorate, subdomain, custom_domain, domain_type, package, package_limit, subscription_status, is_active, billing_amount, next_billing_date, created_at, updated_at";

/** First day of the current calendar month (UTC), as an ISO string. */
function startOfCurrentMonthISO() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

/**
 * Apply the shared status filter to a brokers query.
 *
 * The admin UI treats account status as a derived value that combines the
 * `is_active` flag (suspend switch) with the existing `subscription_status`
 * billing state:
 *   - suspended → is_active = false (regardless of subscription_status)
 *   - active    → is_active = true  AND subscription_status = 'active'
 *   - pending   → subscription_status = 'pending'
 *   - past_due  → is_active = true  AND subscription_status = 'past_due'
 */
function applyStatusFilter(query, status) {
  switch (status) {
    case "suspended":
      return query.eq("is_active", false);
    case "active":
      return query.eq("is_active", true).eq("subscription_status", "active");
    case "pending":
      return query.eq("subscription_status", "pending");
    case "past_due":
      return query.eq("is_active", true).eq("subscription_status", "past_due");
    default:
      return query;
  }
}

async function countBrokers(applyFilters) {
  let query = supabaseAdmin
    .from("brokers")
    .select("id", { count: "exact", head: true });
  if (applyFilters) query = applyFilters(query);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export const adminModel = {
  /** Identity check: returns the admin_users row for this auth user, or null. */
  async findAdminById(userId) {
    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /** Aggregate counts for the dashboard home stat cards. */
  async getDashboardStats() {
    const monthStart = startOfCurrentMonthISO();

    const [
      totalBrokers,
      activeBrokers,
      pendingBrokers,
      newBrokersThisMonth,
      pendingInstapayReviews,
    ] = await Promise.all([
      countBrokers(),
      countBrokers((q) => applyStatusFilter(q, "active")),
      countBrokers((q) => applyStatusFilter(q, "pending")),
      countBrokers((q) => q.gte("created_at", monthStart)),
      instapayModel.countByStatus("pending_review"),
    ]);

    return {
      totalBrokers,
      activeBrokers,
      pendingBrokers,
      newBrokersThisMonth,
      pendingInstapayReviews,
    };
  },

  /**
   * Paginated broker list with optional text search and status filter.
   * Returns { rows, total } so the controller can build pagination metadata.
   */
  async listBrokers({ search, status, limit = 20, offset = 0 } = {}) {
    let query = supabaseAdmin
      .from("brokers")
      .select(BROKER_ADMIN_LIST_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false });

    query = applyStatusFilter(query, status);

    if (search) {
      const term = String(search).trim();
      if (term) {
        query = query.or(
          [
            `first_name.ilike.%${term}%`,
            `last_name.ilike.%${term}%`,
            `platform_name.ilike.%${term}%`,
            `email.ilike.%${term}%`,
            `subdomain.ilike.%${term}%`,
          ].join(","),
        );
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data ?? [], total: count ?? 0 };
  },

  /** Full detail for a single broker. */
  async getBrokerDetail(brokerId) {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select(BROKER_ADMIN_DETAIL_COLUMNS)
      .eq("id", brokerId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Suspend/reactivate a broker. Maps the admin 'active' | 'suspended' status
   * onto the existing `is_active` boolean rather than inventing a new column.
   */
  async setBrokerActive(brokerId, isActive) {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", brokerId)
      .select(BROKER_ADMIN_DETAIL_COLUMNS)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
